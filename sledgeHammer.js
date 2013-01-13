/*
* [[m:user:Hoo man]]; Version 3.0; 2013-01-13;
* A tool very similar to the Nuke Extension but with more features
* Can be accessed via Special:Blankpage/SledgeHammer, uses data from the toolserver.
* Inspired by: https://en.wikipedia.org/wiki/Sledge_Hammer!
*
* Tested in IE and FF with vector and monobook, uses my (Hoo man) wiki tools (shared.js)
*
* DO NOT COPY AND PASTE, instead see https://meta.wikimedia.org/wiki/User:Hoo_man/Scripts/SledgeHammer
*/

/*global hoo, mw, sledgeHammerConfig, confirm, alert, disable_sledgeHammer */
/*jshint forin:true, noarg:true, noempty:true, eqeqeq:true, loopfunc:true, bitwise:true, undef:true, browser:true, jquery:true, indent:4, maxerr:50, white:false */

mw.loader.using( [ 'mediawiki.util', 'jquery.spinner', 'mediawiki.api', 'mediawiki.jqueryMsg', 'user.tokens' ], function() {
	"use strict";

	// Default config
	var config = {
			deleteRightOnly : true,
			sysopOnly : false
		},
		$pageList;

	// This function can show an animation while eg. data gets transfered
	function showProcess( selector ) {
		var $loadSpinner = $.createSpinner()
			.addClass( 'sledgeHammer-spinner' );

		$( selector )
			.hide()
			.after( $loadSpinner );
	}

	// This will stop animations created by showProcess()
	function stopProcess( selector ) {
		$( selector )
			.show();
		$( '.sledgeHammer-spinner' ).remove();
	}

	// Delete a page
	function deletePage( page, reason, done ) {
		var api = new mw.Api();
		api.post( {
			action: 'delete',
			title: page,
			reason: reason,
			token: mw.user.tokens.get( 'editToken' )
		} )
		// Remove the page from the list
		.done(
			function() {
				$( '#pageList input[value=' + page + ']' )
					.parent()
					.parent()
					.hide();
			}
		)
		// Always go on even if an error occurs
		.always( done );
	}

	// Delete a list of pages
	function deletePages( pages, reason ) {
		var page = pages.shift();
		deletePage(
			page,
			reason,
			function() {
				if ( pages.length ) {
					// Call this function again as there are pages left
					deletePages( pages, reason );
				} else {
					// All done!
					stopProcess( '.sledgeHammerPagesFormButton' );
					window.location.reload();
				}
			}
		);
	}

	// Load data from the toolserver API
	function load() {
		var user = document.sledgehammer.user.value,
			from = document.sledgehammer.from.value,
			till = document.sledgehammer.till.value,
			timestamp = Math.round( ( new Date() ).getTime() / 1000 ),
			namespaces = '',
			data;

		$pageList.html( '' );

		$( '#sledgeHammerNamespaceSelect option' ).each( function( i, elem ) {
			var $elem = $( elem );
			if ( $elem.attr( 'selected' ) ) {
				if ( $elem.attr( 'value' ) === 'All' ) {
					namespaces = null;
					return true;
				} else {
					namespaces += '|' + $elem.attr( 'value' );
				}
			}
		} );

		// Prepare the request
		data = {
			action: 'pagesCreated',
			format: 'json',
			user_name: user,
			wiki: mw.config.get( 'wgDBname' ) + '_p'
		};

		if ( from !== 'now' ) {
			// Convert the user given days into seconds
			data.from = timestamp - from * 86400;
		}
		if ( till !== 'infinite' ) {
			// Convert the user given days into seconds
			data.to = timestamp - till * 86400;
		}
		if( namespaces ) {
			data.namespaces = namespaces.replace( '|', '' );
		}

		// Show that we're loading
		showProcess( '#sledgeHammerFormSubmit' );

		$.ajax( {
			url: '//toolserver.org/~hoo/api.php',
			data: data,
			cache: false,
			dataType: 'jsonp',
			jsonpCallback: 'onloadPagesCreated'
		} )
		.done( onloadPagesCreated )
		.fail( onloadPagesCreatedFailure );

		// Prefetch MediaWiki:Nuke-defaultreason
		if ( !mw.messages.get( 'Nuke-defaultreason' ) ) {
			$.ajax( {
				url: mw.config.get( 'wgServer' ) + mw.config.get( 'wgScript' ),
				data: {
					title: 'MediaWiki:Nuke-defaultreason',
					action: 'raw',
					usemsgcache: true
				},
				cache: true

			} )
			.done(
				function( data ) {
					mw.messages.set( 'Nuke-defaultreason', data );
				}
			);
		}
	}

	function onloadPagesCreatedFailure() {
		stopProcess( '#sledgeHammerFormSubmit' );
		alert( mw.messages.get( 'hoo-sledgeHammer-error' ) );
	}

	function onloadPagesCreated( data ) {
		if( data.api.error !== 'false' ) {
			onloadPagesCreatedFailure();
			return false;
		}

		var h = mw.html,
			success = false,
			pages = data.api.pagescreated,
			html, i, titleDbKey;

		// Create the new HTML

		html = '<div style="float:right">' + mw.message( 'hoo-sledgeHammer-select' ).escaped() + ': <a href="#" id="sledgeHammerSelectAll">' + mw.message( 'hoo-sledgeHammer-all' ).escaped() + '</a>, ' +
			'<a href="#" id="sledgeHammerUnselectAll">' + mw.message( 'hoo-sledgeHammer-none' ).escaped() + '</a></div>' +
			'<form name="sledgeHammerPages" id="sledgeHammerPagesForm"><table>' +
			'<tr><td colspan="2">' + mw.message( 'hoo-sledgeHammer-reason' ).escaped() +
			': <input type="text" name="comment" size="75" value="' + mw.message( 'Nuke-defaultreason', document.sledgehammer.user.value ).escaped() + '" /></td></tr>';

		if ( data.api.replag > 60 ) {
			// Show a replag warning, if the replag is higher than 60s
			html += '<tr><td colspan="2"><small>' + mw.message( 'hoo-sledgeHammer-replag', data.api.replag ).escaped() + '</small></td></tr>';
		}
		html += '<tr><td colspan="2"><input class="sledgeHammerPagesFormButton" type="button" value="' + mw.message( 'hoo-sledgeHammer-deleteSelected' ).escaped() + '" /></td></tr>';

		if( pages && pages[0] && pages[0].title ) {
			for ( i = 0; i < pages.length; i++ ) {
				titleDbKey = pages[i].title.replace( / /g, '_' );
				html += '<tr><td>' +
					h.element(
						'input',
						{
							type : 'checkbox',
							name : 'pages',
							checked : 'checked',
							value : titleDbKey
						}
					) +
					'</td><td>' +
					h.element(
						'a',
						{
							href : mw.config.get( 'wgArticlePath' ).replace( /\$1/g, titleDbKey )
						},
						pages[i].title
					) +
					'</td></tr>';
				success = true;
			}
		}
		html += '<tr><td colspan="2"><input class="sledgeHammerPagesFormButton" type="button" value="' + mw.message( 'hoo-sledgeHammer-deleteSelected' ).escaped() + '" /></td></tr>' +
			'</table></form>';

		stopProcess( '#sledgeHammerFormSubmit' );
		if( !success ) {
			alert( mw.messages.get( 'hoo-sledgeHammer-nothingFound' ) );
			return false;
		}

		$pageList.html( html );

		// Select all and unselect all onClick
		$( '#sledgeHammerSelectAll' ).click( function( event ) {
			$( '#pageList input[type=checkbox]' ).attr( 'checked', 'checked' );
			event.preventDefault();
		} );
		$( '#sledgeHammerUnselectAll' ).click( function( event ) {
			$( '#pageList input[type=checkbox]' ).removeAttr( 'checked' );
			event.preventDefault();
		} );

		// Delete on click
		$( '.sledgeHammerPagesFormButton' ).click( shoot );
	}

	// Delete the pages selected if the user is allowed to and confirms
	function shoot() {
		mw.user.getRights( function( rights ) {
			if ( $.inArray( 'delete', rights ) === -1 ) {
				alert( mw.messages.get( 'hoo-sledgeHammer-noDelete' ) );
				return false;
			}

			var pages = [];

			// Confirm
			if ( !confirm( mw.messages.get( 'hoo-sledgeHammer-confirm' ) ) ) {
				return false;
			}

			showProcess( '.sledgeHammerPagesFormButton' );

			$( '#pageList input[type=checkbox]' ).each(
				function( i, elem ) {
					var $elem = $( elem );
					if ( $elem.attr( 'checked' ) ) {
						pages.push( $( elem ).attr( 'value' ) );
					}
				}
			);

			deletePages(
				pages,
				document.sledgeHammerPages.comment.value
			);
		} );
	}

	// Init code
	function init() {
		if ( typeof disable_sledgeHammer !== 'undefined' && disable_sledgeHammer ) {
			return false;
		}

		if ( typeof sledgeHammerConfig !== 'undefined' ) {
			$.extend( config, sledgeHammerConfig );
		}
		if ( typeof config.toolLinkMethod === 'undefined' ) {
			config.toolLinkMethod = hoo.config.toolLinkMethod;
		}

		/*
		//lang (English only atm)
			// i18n
			if ( config.lang ) {
				lang = config.lang;
			} else {
				lang = hoo.config.lang;
			}
		*/
		mw.messages.set( {
			'hoo-sledgeHammer-title' : 'Sledge Hammer!',
			'hoo-sledgeHammer-toolbarText' : 'Sledge Hammer!',
			'hoo-sledgeHammer-user' : 'User',
			'hoo-sledgeHammer-from' : 'From',
			'hoo-sledgeHammer-noDelete' : "You don't have enough rights to delete pages on this Wiki therefore you can't use this page.",
			'hoo-sledgeHammer-continueAnyway' : "Continue anyway?",
			'hoo-sledgeHammer-till' : 'Till',
			'hoo-sledgeHammer-now' : 'Now',
			'hoo-sledgeHammer-infinite' : 'The beginning of time',
			'hoo-sledgeHammer-days' : '$1 days',
			'hoo-sledgeHammer-namespaces' : 'Namespaces',
			'hoo-sledgeHammer-all' : 'All',
			'hoo-sledgeHammer-load' : 'Load',
			'hoo-sledgeHammer-reason' : 'Reason',
			'hoo-sledgeHammer-nothingFound' : "No page creations found: May the user didn't create any pages in the given time span or you mistyped the name.",
			'hoo-sledgeHammer-error' : 'An error occured while loading data',
			'hoo-sledgeHammer-replag' : 'As the current toolsever replication lag is high pages created less than $1 seconds ago wont appear on the list!',
			'hoo-sledgeHammer-noUser' : 'Please specify an user',
			'hoo-sledgeHammer-select' : 'Select',
			'hoo-sledgeHammer-deleteSelected' : 'Delete selected',
			'hoo-sledgeHammer-confirm' : 'Do you really want to delete the selected pages?',
			'hoo-sledgeHammer-none' : 'None'
		} );
		var y, username, tmp;
		// Where are we?
		if ( mw.config.get( 'wgCanonicalSpecialPageName' ) === 'Blankpage' && mw.config.get( 'wgTitle' ).split( '/' )[1] === 'SledgeHammer' ) {
			mw.user.getRights( function( rights ) {
				var i;

				if ( $.inArray( 'delete', rights ) === -1 ) {
					if ( !confirm( mw.messages.get( 'hoo-sledgeHammer-noDelete' ) + ' ' + mw.messages.get( 'hoo-sledgeHammer-continueAnyway' ) ) ) {
						return false;
					}
				}

				// Special:BlankPage/SledgeHammer
				var days = [ 30, 60, 90, 120, 150, 180, 270, 360, 720 ],
					from = mw.util.getParamValue( 'from' ),
					till = mw.util.getParamValue( 'till' );

				// HTML:
				var html =
				// form
					'<form name="sledgehammer" id="sledgeHammerForm" action="' +
					mw.config.get( 'wgServer' ) + mw.util.wikiGetlink( mw.config.get( 'wgFormattedNamespaces' )[-1] + ':Blankpage/SledgeHammer' ) +
					'"><table>' +
				//user input
					'<tr><td>' + mw.message( 'hoo-sledgeHammer-user' ).escaped() + ':</td><td><input type="text" name="user" /></td></tr>' +
				//from
					'<tr><td>' + mw.message( 'hoo-sledgeHammer-from' ).escaped() + ':</td><td><select name="from" id="sledgeHammerFormFrom">' +
					'<option value="now" selected="selected">' + mw.message( 'hoo-sledgeHammer-now' ).escaped() + '</option>';
				for ( i = 0; i < days.length; i++ ) {
					html += '<option value="' + days[i] + '">' + mw.message( 'hoo-sledgeHammer-days', days[i] ).escaped() + '</option>';
				}
				html += '</select></td></tr>' +
				//till
					'<tr><td>' + mw.message('hoo-sledgeHammer-till').escaped() + ':</td><td><select name="till" id="sledgeHammerFormTill">' +
					'<option value="infinite" selected="selected">' + mw.message('hoo-sledgeHammer-infinite').escaped() + '</option>';
				for ( i = 0; i < days.length; i++ ) {
					html += '<option value="' + days[i] + '">' + mw.message( 'hoo-sledgeHammer-days', days[i] ).escaped() + '</option>';
				}
				html += '</select></td></tr>' +
				//namespaces
					'<tr><td>' + mw.message( 'hoo-sledgeHammer-namespaces' ).escaped() + ':</td><td>' +
					'<select name="namespaces" size="5" multiple="multiple" id="sledgeHammerNamespaceSelect">' +
					'<option value="All" selected="selected">' + mw.message( 'hoo-sledgeHammer-all' ).escaped() + '</option>';
				var namespaces = mw.config.get( 'wgFormattedNamespaces' );
				for ( i in namespaces ) {
					if( i >= 0 && typeof namespaces[i] === 'string' ) {
						html += '<option value="' + i + '">' + namespaces[i] + '</option>';
					}
				}
				html += '</select></td></tr>' +
				//button
					'<tr><td><input id="sledgeHammerFormSubmit" type="submit" value="' + mw.message( 'hoo-sledgeHammer-load' ).escaped() + '" /></td><td></td></tr>';

				html += '</table></form><hr /><div id="pageList"></div>';
				document.title = mw.messages.get( 'hoo-sledgeHammer-title' );

				$( '#bodyContent' ).html( html );
				$( '#firstHeading' ).html( mw.message( 'hoo-sledgeHammer-title' ).escaped() );

				// Only allow submit if the user is set
				$( '#sledgeHammerFormSubmit' ).click( function( event ) {
					if( !document.sledgehammer.user.value ) {
						alert( mw.messages.get( 'hoo-sledgeHammer-noUser' ) );
						event.preventDefault();
					}
				} );

				$pageList = $( '#pageList' );

				/*
				* fill in values given via GET parameters
				* if value count goes to 4, we will auto load the data
				*/
				var valueCount = 0;
				if ( mw.util.getParamValue( 'user' ) ) {
					valueCount++;
					document.sledgehammer.user.value = mw.util.getParamValue( 'user' ).replace( /[\+_]/g, ' ' );
				}

				var options;
				if ( from ) {
					valueCount++;
					options = document.getElementById( 'sledgeHammerFormFrom' ).getElementsByTagName( 'option' );
					for (i = 0; i < options.length; i++ ) {
						options[i].selected = undefined;
						if ( options[i].value === from ) {
							options[i].selected = 'selected';
						}
					}
				}

				if ( till ) {
					valueCount++;
					options = document.getElementById( 'sledgeHammerFormTill' ).getElementsByTagName( 'option' );
					for ( i = 0; i < options.length; i++ ) {
						options[i].selected = undefined;
						if ( options[i].value === till ) {
							options[i].selected = 'selected';
						}
					}
				}

				if ( mw.util.getParamValue( 'namespaces' ) ) {
					valueCount++;
					// Get all namespaces which have been choosen
					var url = document.location.href.replace( '#', '' ) + '&';
					namespaces = [];
					while( true ) {
						if ( mw.util.getParamValue( 'namespaces', url ) !== null ) {
							tmp = mw.util.getParamValue( 'namespaces', url );
							namespaces.push( tmp );
							url = url.replace( '&namespaces=' + encodeURIComponent( tmp ) + '&', '&' );
						} else {
							break;
						}
					}
					options = document.getElementById( 'sledgeHammerNamespaceSelect' ).getElementsByTagName( 'option' );
					// Now we un select all
					for ( y = 0 ; y < options.length; y++ ) {
						options[y].selected = undefined;
					}
					// Now we select all which have been selected
					for ( i = 0; i<namespaces.length; i++) {
						for ( y = 0; y < options.length; y++ ) {
							if ( options[y].value === namespaces[i] ) {
								options[y].selected = 'selected';
							}
						}
					}
				}
				if ( valueCount === 4 ) {
					// All 4 values have been given, so we can load the data from TS
					load();
				}
			} );
			return;
		} else if ( mw.config.get( 'wgCanonicalNamespace' ) === 'User' || mw.config.get( 'wgCanonicalNamespace' ) === 'User_talk' ) {
			// User or user talk page
			username = mw.config.get( 'wgTitle' ).match( /([^\/]+)/ )[1];
		} else if ( mw.config.get( 'wgCanonicalNamespace' ) === 'Special' && mw.config.get( 'wgCanonicalSpecialPageName' ) === 'Contributions' ){
			// Special:Contributions
			if ( window.location.href.indexOf( '&' ) === -1 ) {
				// Request like Special:Contributions/Username
				username = mw.config.get( 'wgTitle' ).substring( mw.config.get( 'wgTitle' ).lastIndexOf( '/' ) +1 );
			} else {
				username = mw.util.getParamValue( 'target' );
			}
		}

		// Add tool link
		if ( username && ( $.inArray( 'sysop', mw.config.get( 'wgUserGroups' ) ) !== -1 || !config.sysopOnly ) ) {
			if ( config.deleteRightOnly ) {
				mw.user.getRights(
					function( rights ) {
						if ( $.inArray( 'delete', rights ) !== -1 ) {
							hoo.addToolLink(
								mw.messages.get( 'hoo-sledgeHammer-toolbarText' ),
								mw.config.get( 'wgArticlePath' ).replace( /\$1/g, 'Special:BlankPage/SledgeHammer?user=' + username),
								'',
								config.toolLinkMethod
							);
						}
					}
				);
			} else {
				hoo.addToolLink(
					mw.messages.get( 'hoo-sledgeHammer-toolbarText' ),
					mw.config.get( 'wgArticlePath' ).replace( /\$1/g, 'Special:BlankPage/SledgeHammer?user=' + username ),
					'',
					config.toolLinkMethod
				);
			}
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
