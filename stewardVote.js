/*
* [[m:user:Hoo man]]; Version 2.0.8; 2015-02-09;
* Provides an easy way to vote in steward elections
* Most up to date version can be found on https://github.com/mariushoch/MediaWiki-Helpers/blob/master/stewardVote.js
*
* use:

if ( mw.config.get( 'wgPageName' ).indexOf( 'Stewards/Elections_' ) === 0 && mw.config.get( 'wgPageName' ).indexOf( '/Votes/' ) !== -1 && mw.config.get( 'wgUserName' ) !== null ) {
	mw.loader.load( '//meta.wikimedia.org/w/index.php?title=User:Hoo_man/stewardVote.js&action=raw&ctype=text/javascript' );
}

* to import
*/

/*global mw, alert, confirm, multilingual */

//<nowiki>

mw.loader.using( [ 'mediawiki.util', 'jquery.ui.dialog', 'jquery.cookie', 'jquery.spinner', 'mediawiki.api', 'user.tokens', 'json' ], function() {
	'use strict';

	var year = ( 1900 + new Date().getYear() ),
		config = {
			// Translations (keep in synch with https://meta.wikimedia.org/w/index.php?title=MediaWiki:StewardVote/en)
			messages: {
				windowTitle : 'Vote!',
				windowButton : 'Vote',
				vote : 'Please select your vote:',
				pleaseSelectVote : 'Please select your vote!',
				confirmPossibleDouble : 'It appears that you have previously commented on this candidate. Are you sure you want to continue? Please strike out past votes!',
				editError : 'Error: Reload the page (F5) and try voting again',
				comment : 'Comment (optional):',
				signatureAutoAdd : 'Your signature will be added automatically.',
				yes : 'Yes',
				no : 'No',
				neutral : 'Neutral'
			},
			// To add a new translation create a page like https://meta.wikimedia.org/wiki/MediaWiki:StewardVote/en and add the new language to the var below
			availableLangs: ['en', 'de', 'de-ch', 'de-at', 'de-formal', 'el', 'es', 'fa', 'fi', 'fr', 'it', 'bg', 'bn', 'id', 'ka', 'nl', 'pl', 'pt', 'ru', 'sr', 'tr', 'uk'],

			// General config

			editSummary: 'Voted ',
			// Minimum crosswiki edit count for eligibility
			minEditCount: 600,
			// Minimum local registration timestamp for eligibility
			minRegistration: ( year -1 ) + '-11-01T00:00:00Z'
		},
		api = new mw.Api(),
		page = mw.config.get( 'wgPageName' ),
		user = mw.config.get( 'wgUserName' ),
		$dialog, $voteButton, voteText;

	/**
	 * Checks that we're on the right page and whether the user is eligible to vote
	 */
	function main() {
		if ( $.cookie( 'isEligible' ) === 'false' ) {
			onUserIsNotEligible();
			return;
		}

		if ( $.cookie( 'isEligible' ) !== 'true' ) {
			// We can (more or less) ignore failures over here and just let the user vote per hand
			api.get( {
				action: 'query',
				meta: 'globaluserinfo',
				guiprop: 'merged|unattached',
				guiuser: user
			} )
			.done( onGlobaluserinfoLoad );
		} else {
			onUserIsEligible();
		}
	}

	/**
	 * Finds out whether the user is eligible to vote and saves that information into a cookie (for the sake of performance)
	 * Calls onUserIsEligible or onUserIsNotEligible
	 */
	function onGlobaluserinfoLoad( data ) {
		var editCount = 0,
			eligible = false,
			i, wikis, oldestAccount;

		// List unattached and attached wikis
		wikis = data.query.globaluserinfo.merged;
		wikis.concat( data.query.globaluserinfo.unattached );
		if ( wikis.length === 0 ) {
			return false;
		}

		// Get edit count and oldest registration date
		oldestAccount = wikis[0].timestamp;

		for ( i = 0; i < wikis.length; i++ ) {
			editCount += parseInt( wikis[i].editcount, 10 );
			if ( wikis[i].timestamp < oldestAccount ) {
				oldestAccount = wikis[i].timestamp;
			}

			if ( editCount >= config.minEditCount && oldestAccount <= config.minRegistration) {
				eligible = true;
				break;
			}
		}

		// Save to cookie to not always look that up again
		if ( eligible ) {
			$.cookie(
				'isEligible',
				'true',
				{
					expires: 7,
					path: '/'
				}
			);
			onUserIsEligible();
		} else {
			// Expires after a day, cause this might change
			$.cookie(
				'isEligible',
				'false',
				{
					expires: 1,
					path: '/'
				}
			);
			onUserIsNotEligible();
		}
	}

	/**
	 * Called after the user was verified to be eligible. Loads the messages.
	 */
	function onUserIsEligible() {
		var i, messagePage, lang;

		if ( typeof multilingual === 'object' ) {
			lang = multilingual.getLanguage();
		} else {
			// Fallback to the user interface language if multilingual hasn't yet been loaded
			lang = mw.user.options.get( 'language' );
		}

		// Are we on the right page?
		if ( page.indexOf( 'Stewards/Elections_' + year + '/Votes/' ) !== 0 ) {
			return false;
		}

		// Use the currently selected language (if avaiable), fallback to en (which is already loaded)
		for ( i = 0; i < config.availableLangs.length; i++ ) {
			if ( config.availableLangs[i] === lang && lang !== 'en' ) {
				messagePage = 'MediaWiki:StewardVote/' + lang;
				break;
			}
		}

		if ( messagePage ) {
			$.ajax( {
				url: mw.util.wikiScript(),
				data: {
					title: messagePage,
					action: 'raw'
				},
				cache: true
			} )
			.done( onMessageLoad );
		} else {
			onMessageLoad();
		}
	}

	/**
	 * Called after the user was verified to not be eligible
	 */
	function onUserIsNotEligible() {
		$( '#notEligible' ).show();
		$( '#Se-banner' ).hide();
	}

	/**
	 * Called by the time the messages have been loaded successfully. Displays the vote button. Only called for eligible users
	 */
	function onMessageLoad( data ) {
		if ( data ) {
			$.extend( config.messages, JSON.parse( data ) );
		}

		voteText = config.messages.windowTitle.replace( /\$1/g, page.replace( /.*\//, '' ) );

		var sections, i;

		$( '#voteButtons' )
			.empty()
			.append(
				$( '<button>' )
					.css( {
						border: '1px solid darkgray',
						'border-radius': '3px',
						background: 'url("//upload.wikimedia.org/wikipedia/commons/7/79/Button_shade.png") black',
						padding: '2px',
						'margin-bottom': '5px',
						width: '200px',
						'font-size': '2.5em',
						color: '#fff',
						cursor: 'pointer'
					} )
					.click( openDialog )
					.text( voteText )
			)
			.show();

		$( '#Se-banner' ).hide();

		// Small section vote links (replaces edit)
		sections = [ '#Yes', '#No', '#Neutral'];

		for ( i = 0; i < sections.length; i++ ) {
			if ( !$( sections[ i ] ).length ) {
				continue;
			}

			$( sections[ i ] )
				.parent()
				.find( '.editsection a' )
				.replaceWith(
					$( '<a>' )
						.text( voteText )
						.attr( 'href', '#' )
						.addClass( 'wmf-steward-vote-section-link' )
						.click( openDialog )
				);
		}
	}

	/**
	 * Opens the dialog which allows users to vote
	 */
	function openDialog( event ) {
		/*jshint validthis:true */

		var preSelect;
		event.preventDefault();

		if ( $dialog && $dialog.length ) {
			$dialog.remove();
		}
		$dialog = $( '<form>' )
			.attr( 'name', 'stewardVoteForm' )
			.dialog( {
				title: voteText,
				width: 450,
				height: 333,
				resizable: true,
				buttons: [ {
					text: config.messages.windowButton,
					id: 'wmf-steward-vote-button',
					disabled: 'disabled',
					click: doVote
				} ]
			} )
			.append(
				$( '<p>' )
					.text( config.messages.vote )
			)
			.append( dialogFormInput( 'yes' ) )
			.append( dialogFormInput( 'no' ) )
			.append( dialogFormInput( 'neutral' ) )
			.append(
				$( '<br />' )
			)
			.append(
				$( '<label>' )
					.attr( {
						'for': 'wmf-steward-vote-comment'
					} )
					.text( config.messages.comment )
			)
			.append(
				$( '<br />' )
			)
			.append(
				$( '<textarea>' )
					.attr( {
						id: 'wmf-steward-vote-comment',
						name: 'comment',
						type: 'text',
						rows: 3,
					} )
					.css( {
						width: '90%'
					} )
			)
			.append(
				$( '<p>' )
					.text( config.messages.signatureAutoAdd )
			);

			$voteButton = $( '#wmf-steward-vote-button' );

			// Pre select an option and enable the vote button if opened from a section link
			if ( $( this ).hasClass( 'wmf-steward-vote-section-link' ) ) {
				preSelect = $( this ).parent().parent().find( 'span.mw-headline' ).attr( 'id' ).toLowerCase();
				$( '#wmf-steward-vote-' + preSelect ).attr( 'checked', 'checked' );
				$voteButton.button( 'enable' );
			}
	}

	/**
	 * Get a <input> and a label for the given type, helper function for openDialog
	 */
	function dialogFormInput( type ) {
		return $( '<input>' )
			.attr( {
				type: 'radio',
				name: 'vote',
				value: type,
				id: 'wmf-steward-vote-' + type
			} )
			.one( 'click', function() {
				// Enable the vote button by the time the user selects an option
				$voteButton.button( 'enable' );
			} )
			.add(
				$( '<label>' )
					.attr( {
						'for': 'wmf-steward-vote-' + type
					} )
					.text( config.messages[ type ] )
			)
			.add(
				$( '<br>' )
			);
	}

	/**
	 * Performs the actual edit
	 */
	function doVote() {
		/**
		 * Called in case anything goes wrong in here
		 */
		function onFail() {
			$spinner.remove();
			$voteButton.show();
			alert( config.messages.editError );
		}

		var vote, i, $spinner, comment, section, voteLine;

		// Vote?
		for ( i = 0; i < document.stewardVoteForm.vote.length; i++ ) {
			if (document.stewardVoteForm.vote[i].checked ) {
				vote = document.stewardVoteForm.vote[i].value;
			}
		}

		if ( !vote ) {
			alert( config.messages.pleaseSelectVote );
			return false;
		}

		$spinner = $.createSpinner();
		$voteButton
			.hide()
			.after( $spinner );

		comment = document.stewardVoteForm.comment.value;

		if ( vote === 'yes' ) {
			section = 1;
		} else if (vote === 'no' ) {
			section = 2;
		} else {
			section = 3;
		}

		voteLine = '\n# {{Se-vote|' + year + '|' + user + '|checked=|cb=}} ' + comment + ' ~~~~';

		// Get the page text (to detect potential double votes)
		$.ajax( {
			url: mw.util.wikiScript(),
			data: {
				title: page,
				action: 'raw'
			},
			cache: false
		} )
		.fail( onFail )
		.done( function( pageText ) {

			if ( pageText.indexOf( '{{Se-vote|' + year + '|' + user + '|' ) !== -1 ) {
				if ( !confirm ( config.messages.confirmPossibleDouble ) ) {
					$dialog.dialog( 'close' );
					return false;
				}
			}

			api.post( {
				action: 'edit',
				title: page,
				appendtext: voteLine,
				section: section,
				summary: config.editSummary + vote,
				token: mw.user.tokens.get( 'editToken' )
			} )
			.done( function() {
				// Just reload the page
				window.location.href = mw.util.getUrl( page );
			} )
			.fail( onFail );
		} );
	}

	// Init code
	$( document ).ready( function() {
		if ( document.getElementById( 'Se-banner' ) && !mw.user.isAnon() ) {
			main();
		}
	} );
} );

// </nowiki>
