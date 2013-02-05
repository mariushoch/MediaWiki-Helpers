/*
* [[m:user:Hoo man]]; Version 2.0.0; 2013-02-05;
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

mw.loader.using( [ 'mediawiki.util', 'jquery.ui.dialog', 'jquery.cookie', 'jquery.spinner', 'mediawiki.api', 'user.tokens' ], function() {
	var config = {
			// Translations
			lang: {},
			// To add a new translation create a page like https://meta.wikimedia.org/wiki/MediaWiki:StewardVote/en and add the new language to the var below
			availableLangs: ['en', 'de', 'de-ch', 'de-at', 'de-formal',  'es', 'it', 'bn', 'pt', 'sr'],

			// General config
			editSummary: 'Voted ',

			// Minimum crosswiki edit count for eligibility
			minEditCount: 600,
			// Minimum local registration timestamp for eligibility
			minRegistration: '2012-11-01T00:00:00Z'
		},
		api = new mw.Api(),
		$dialog, voteText;

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
				guiuser: mw.config.get( 'wgUserName' )
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
		}else{
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
		var year = 1900 + new Date().getYear(),
			i, messagePage;

		// Are we on the right page?
		if ( mw.config.get( 'wgPageName' ).indexOf( 'Stewards/Elections_' + year + '/Votes/' ) !== 0 ) {
			return false;
		}

		// Use the currently selected language (if avaiable), fallback to en
		messagePage = 'MediaWiki:StewardVote/en';
		for ( i = 0; i < config.availableLangs.length; i++ ) {
			if ( config.availableLangs[i] === multilingual.getLanguage() ) {
				messagePage = 'MediaWiki:StewardVote/' + multilingual.getLanguage();
				break;
			}
		}

		$.ajax( {
			url: mw.config.get( 'wgServer' ) + mw.config.get( 'wgScript' ),
			data: {
				title: messagePage,
				action: 'raw'
			},
			cache: true
		} )
		.done( onMessageLoad );
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
		config.messages = $.parseJSON( data );
		voteText = config.messages.windowTitle.replace( /\$1/g, mw.config.get( 'wgPageName' ).replace( /.*\//, '' ) );

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
						.click( openDialog )
				);
		}
	}

	/**
	 * Opens the dialog which allows users to vote
	 */
	function openDialog() {
		if ( $dialog && $dialog.length ) {
			$dialog.remove();
		}
		$dialog = $( '<form>' )
			.attr( 'name', 'stewardVoteForm' )
			.dialog( {
				title: voteText,
				width: 450,
				height: 275,
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
				$( '<input>' )
					.attr( {
						id: 'wmf-steward-vote-comment',
						name: 'comment',
						type: 'text'
					} )
					.css( {
						width: '97%'
					} )
			)
			.append(
				$( '<p>' )
					.text( config.messages.signatureAutoAdd )
			);
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
				$( '#wmf-steward-vote-button' ).button( 'enable' );
			} )
			.after(
				$( '<label>' )
					.attr( {
						'for': 'wmf-steward-vote-' + type
					} )
					.text( config.messages[ type ] )
			)
			.after(
				$( '<br />' )
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
			$( '#wmf-steward-vote-button' ).show();
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
		$( '#wmf-steward-vote-button' )
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

		voteLine = '\n# {{Se-vote|' + ( 1900 + new Date().getYear() ) + '|' + mw.config.get( 'wgUserName' ) + '|checked=|cb=}} ' + comment + ' ~~~~';

		// Get the page text (to detect potential double votes)
		$.ajax( {
			url: mw.config.get( 'wgServer' ) + mw.config.get( 'wgScript' ),
			data: {
				title: mw.config.get( 'wgPageName' ),
				action: 'raw'
			},
			cache: false
		} )
		.fail( onFail )
		.done( function( pageText ) {

			if ( pageText.indexOf( '{{Se-vote|' + ( 1900 + new Date().getYear() ) + '|' + mw.config.get( 'wgUserName' ) + '|' ) !== -1 ) {
				if ( !confirm ( config.messages.confirmPossibleDouble ) ) {
					$dialog.dialog( 'close' );
					return false;
				}
			}

			api.post( {
				action: 'edit',
				title: mw.config.get( 'wgPageName' ),
				appendtext: voteLine,
				section: section,
				summary: config.editSummary + vote,
				token: mw.user.tokens.get( 'editToken' )
			} )
			.done( function() {
				// Just reload the page
				window.location.href = mw.config.get( 'wgServer' ) + mw.config.get( 'wgArticlePath' ).replace( /\$1/, mw.config.get( 'wgPageName' ) );
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
