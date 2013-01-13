/*
* [[m:user:Hoo man]]; Version 3.0; 2013-01-13;
* Provides several useful functions for rollback (custom edit summary, mark as bot edits and mass revert)
* Requires rollback permissions (and 'markbotedits' for the bot option)
* Tested in IE and FF with vector and monobook, uses my (Hoo man) wiki tools (shared.js)
*
* DO NOT COPY AND PASTE, instead see https://meta.wikimedia.org/wiki/User:Hoo_man/Scripts/Smart_rollback
*/

/*global hoo, mw, smartRollbackConfig, disable_smart_rollback, confirm */
/*jshint forin:true, noarg:true, noempty:true, eqeqeq:true, bitwise:true, strict:false, undef:true, unused:true, curly:true, browser:true, jquery:true, indent:4, maxerr:50, loopfunc:true, white:false */

mw.loader.using( [ 'mediawiki.util', 'jquery.ui.dialog', 'jquery.spinner', 'mediawiki.api' ], function() {
	"use strict";

	var config = {
			// Default config
			enableMarkbotedits : null,
			watchPages : 'nochange',
			oneClickBotLinks : false,
			availableLangs : ['en', 'de', 'ja']
		},
		lastSummary = false,
		$dialog;

	// Commit rollback
	function commitRollback( params, elem, done ) {
		var api = new mw.Api();
		api.post( params )
		// Remove the rollback link(s) (the one click bot links as well)
		.done(
			function() {
				$( elem )
					.parent()
					.parent()
					.find( '.mw-rollback-link' )
					.hide();
			}
		)
		// Always go on even if an error occurs
		.always( done );
	}

	// Delete a list of pages
	function rollbackRevisions( rollbacks ) {
		var rollback = rollbacks.shift();
		commitRollback(
			rollback.params,
			rollback.elem,
			function() {
				if ( rollbacks.length ) {
					rollbackRevisions( rollbacks );
				} else {
					// Reload the page after the work is done
					window.location.reload();
				}
			}
		);
	}

	// Whether the user is in the given group
	function isInGroup( group ) {
		return ( $.inArray( group, mw.config.get( 'wgUserGroups' ) ) !== -1 );
	}

	// Whether the user is in the given global group
	function isInGlobalGroup( group ) {
		return ( mw.config.exists( 'wgGlobalGroups' ) &&  $.inArray( group, mw.config.get( 'wgGlobalGroups' ) ) !== -1 );
	}

	// This function shows an animation while changes are reverted
	function showProcess( selector ) {
		var $loadSpinner = $.createSpinner()
			.addClass( 'smartRollback-spinner' );

		$( selector )
			.html( $loadSpinner );
	}

	// Adding the toolbar link and creating the one click bot rollback links (if enabled)
	// Executed after i18n has been loaded
	function main() {
		var hasRollbackLink = false,
			i;

		// Is there at least one rollback link on the page?
		var spans = mw.util.$content[0].getElementsByTagName( 'span' );
		for ( i = 0; i < spans.length; i++ ) {
			if ( spans[i].className === 'mw-rollback-link' ) {
				hasRollbackLink = true;
				break;
			}
		}

		if ( !hasRollbackLink ) {
			return;
		}

		// There is a rollback link so we add a visible link
		hoo.addToolLink(
			mw.message( 'hoo-smartRollback-toolbarText' ).escaped(),
			openWindow,
			'',
			config.toolLinkMethod
		);

		// Edit summaries
		if ( typeof smartRollbackConfig === 'undefined' || typeof smartRollbackConfig.editSummaries === 'undefined' ) {
			// smartRollbackConfig.editSummaries isn't set, so we take the default out of the lang file
			config.editSummaries = mw.messages.get( 'hoo-smartRollback-editSummaries' );
		} else {
			config.editSummaries = smartRollbackConfig.editSummaries;
		}

		if( config.oneClickBotLinks ) {
			$( '.mw-rollback-link' ).each( function() {
				var $rollbackLink = $( this );
				$rollbackLink.parent().append(
					$rollbackLink
						.clone()
						.addClass( 'mw-rollback-link-bot' )
				)
				.find( '.mw-rollback-link-bot a' )
				.attr( 'href',  $rollbackLink.find( 'a' ).attr( 'href' ) + '&bot=true' )
				.text( $rollbackLink.find( 'a' ).text() + ' (B)' );
			} );
		}
	}

	function openWindow() {
		var html, i;

		html = '<div id="smartRollbackDialog"><form name="smartRollbackForm" id="smartRollbackForm">' +
			mw.message( 'hoo-smartRollback-editSummary' ).escaped() + '<br /><select name="editSummarySelect" style="width: 97%;">' +
			'<option value="useDefault">' +  mw.message( 'hoo-smartRollback-useDefault' ).escaped() + '</option>';

		for ( i in config.editSummaries ) {
			if ( typeof config.editSummaries[i] === 'string' && i !== 'other' && i !== 'useDefault' ) {
				// Filter out prototype functions and deprecated strings
				html += '<option value="' + config.editSummaries[i] + '">' + config.editSummaries[i] + '</option>';
			}
		}

		html += '<option value="otherSummary" id="smartRollbackUseCustomEditSummary">' + mw.message( 'hoo-smartRollback-other' ).escaped() + '</option>' +
			'</select><br />' +
			'<small>' + mw.message( 'hoo-smartRollback-editSummaryInfo' ).escaped() + '</small><br /><br />' +
			mw.message( 'hoo-smartRollback-customEditSummary' ).escaped() + '<br /><input name="editSummaryOther" id="smartRollbackEditSummaryOther" type="text" style="width: 97%;"><br /><br />';

		if ( config.enableMarkbotedits !== false && ( isInGroup( 'sysop' ) || isInGlobalGroup( 'Global_sysops' ) || isInGlobalGroup( 'Global_rollback' ) || isInGlobalGroup( 'steward' ) || config.enableMarkbotedits === true ) ) {
			html += mw.message( 'hoo-smartRollback-markbotedits' ).escaped() + '<br /><label for="hoo-smartRollback-yes">' + mw.message( 'hoo-smartRollback-yes' ).escaped() + ':</label><input type="radio" name="bot" value="true" id="hoo-smartRollback-yes">' +
				'<label for="hoo-smartRollback-no">' + mw.message( 'hoo-smartRollback-no' ).escaped() + ':</label><input type="radio" name="bot" value="false" id="hoo-smartRollback-no" checked>';
		}
		html += '</form></div>';

		if ( !$dialog ) {
			$dialog = $( html ).dialog( {
				title: mw.message( 'hoo-smartRollback-windowTitle' ).escaped(),
				minWidth: 515,
				minHeight: 175,
				buttons: [
					{
						text: mw.message( 'hoo-smartRollback-windowMassButton' ).escaped(),
						click: function( event ) { performAction( 'automatic', event.target ); }
					},
					{
						text: mw.message( 'hoo-smartRollback-windowButton' ).escaped(),
						click: function() { performAction( 'perHand' ); }
					},
					{
						text: mw.message( 'hoo-closeButtonText' ).escaped(),
						click: function() { $( this ).dialog( 'close' ); }
					}
				]
			} );
		} else {
			$dialog
				.html( html )
				.dialog( "open" );
		}

		$( '#smartRollbackEditSummaryOther' ).click( function() {
			document.getElementById( 'smartRollbackUseCustomEditSummary' ).selected = 'true';
		} );

		if ( lastSummary && lastSummary !== 'useDefault' ) {
			// Set the custom edit summary to the one previosly selected
			document.getElementById( 'smartRollbackEditSummaryOther' ).value = lastSummary;
			document.getElementById( 'smartRollbackUseCustomEditSummary' ).selected = 'true';
		}
	}

	// Collect all rollback links on page and change them or submit them (depends on mode)
	// button: the element that triggered this function
	function performAction( mode, button ) {
		var smartRollbackForm = document.getElementById( 'smartRollbackForm' ),
			rollbacks = [],
			revertSummary, i, y, params, parameters;

		// New edit summary
		var summary = smartRollbackForm.editSummarySelect.value;
		if ( summary === 'otherSummary' ) {
			summary = smartRollbackForm.editSummaryOther.value;
		}

		// Mark as bot edits?
		var bot = 'false';
		if ( smartRollbackForm.bot ) {
			for ( i = 0; i < smartRollbackForm.bot.length; i++ ) {
				if ( smartRollbackForm.bot[i].checked ) {
					bot = smartRollbackForm.bot[i].value;
				}
			}
		}

		// Get all rollback links on page
		var links = document.getElementsByTagName( 'a' );
		for(i = 0; i<links.length; i++) {
			if(links[i].parentNode.className === 'mw-rollback-link') {
				rollbacks.push( links[i] );
			}
		}
		/* jQuery alternative:
			$( '.mw-rollback-link a' ).each( function() {
				if ( !$(this).parent().hasClass( 'mw-rollback-link-bot' ) ) {
					rollbacks.push( $(this)[0] );
				}
			} );
		*/

		if ( mode === 'automatic' ) {
			// Confirm the mass revert, if we have more than 1 rollback link
			if ( rollbacks.length > 1 && !confirm( mw.message( 'hoo-smartRollback-confirm' ).escaped() ) ) {
				return false;
			}
			// Substitute the button that was pressed with a spinner
			showProcess( button );
		}

		// Iterate over all links
		for ( i = 0; i < rollbacks.length; i++ ) {
			// The actual revert summary (replaces $1 with the name of the user which has been reverted)
			revertSummary = summary.replace( /\$1/g, mw.util.getParamValue( 'from', rollbacks[i].href ) );
			// Remove old bot settings and summary
			rollbacks[i].href = rollbacks[i].href.replace( '&bot=true', '' ).replace( /&summary=[^&]*/, '' );
			if ( mode !== 'automatic' ) {
				if ( summary !== 'useDefault' ) {
					rollbacks[i].href += '&summary=' + encodeURIComponent( revertSummary );
				}
				if ( bot !== 'false' ) {
					rollbacks[i].href += '&bot=true';
				}
			} else {
				// Auto rollback: Rewrite URI for the API
				parameters = rollbacks[i].href.substring( rollbacks[i].href.indexOf( '?' ) +1 );
				parameters = parameters.replace( '&from=', '&user=' );
				parameters = parameters.split( '&' );
				params = [];
				for ( y = 0; y < parameters.length; y++ ) {
					params[ parameters[y].split( '=' )[0] ] = decodeURIComponent( parameters[y].split( '=' )[1].replace( /\+/g, ' ' ) );
				}
				params.watchlist = config.watchPages;
				if ( bot !== 'false' ) {
					params.markbot = true;
				}
				if ( summary !== 'useDefault' ) {
					params.summary = revertSummary;
				}

				rollbacks[i] = {
					params: params,
					elem: rollbacks[i]
				};
			}
		}
		if ( mode === 'automatic' ) {
			rollbackRevisions( rollbacks );
		}

		// Save edit summary to make the user able to change it
		lastSummary = summary;
		$dialog.dialog( 'close' );
	}

	// Init code
	function init() {
		var lang;
		if ( typeof disable_smart_rollback !== 'undefined' && disable_smart_rollback ) {
			return false;
		}

		if ( typeof smartRollbackConfig !== 'undefined' ) {
			$.extend( true, config, smartRollbackConfig );
		}

		if ( typeof config.toolLinkMethod === 'undefined' ) {
			config.toolLinkMethod = hoo.config.toolLinkMethod;
		}

		if ( config.lang ) {
			lang = config.lang;
		} else {
			lang = hoo.config.lang;
		}

		// Localization
		if ( lang !== 'en' && $.inArray( lang, config.availableLangs ) !== -1 ) {
			// Load from meta
			$.ajax( {
				url: '//meta.wikimedia.org/w/index.php?title=User:Hoo_man/lang/' + lang + '/smart_rollback.js&action=raw&ctype=text/javascript',
				dataType: 'script',
				cache: true
			} )
				.done( main );
		} else {
			// English is already set
			main();
		}
	}

	// Load the shared functions script if needed
	if ( typeof hoo === 'undefined' || typeof hoo.addToolLink  === 'undefined' ) {
		$.ajax( {
			url: '//meta.wikimedia.org/w/index.php?title=User:Hoo_man/functions.js&action=raw&ctype=text/javascript',
			dataType: 'script',
			cache: true
		} )
		.done(
			function() {
				$( document ).ready( init );
			}
		);
	} else {
		$( document ).ready( init );
	}
} );

// Default lang
mw.messages.set( {
	'hoo-smartRollback-toolbarText' : 'Smart rollback',
	'hoo-smartRollback-windowTitle' : 'Smart rollback',
	'hoo-smartRollback-windowButton' : 'Update links',
	'hoo-smartRollback-windowMassButton' : 'Revert everything',
	'hoo-smartRollback-editSummary' : 'Edit summary:',
	'hoo-smartRollback-editSummaryInfo' : '($1 will be replaced with the user name of the reverted user)',
	'hoo-smartRollback-customEditSummary' : 'Custom edit summary:',
	'hoo-smartRollback-markbotedits' : 'Mark edits as bot edits:',
	'hoo-smartRollback-confirm' : 'Do you really want to automatically rollback all pages?',
	'hoo-smartRollback-yes' : 'Yes',
	'hoo-smartRollback-no' : 'No',
	'hoo-smartRollback-useDefault' : 'Use the default edit summary',
	'hoo-smartRollback-other' : 'Other ->',
	'hoo-smartRollback-editSummaries' : [
		'revert (vandalism)',
		'revert (test edit)',
		'revert'
	]
} );
