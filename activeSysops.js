/*
* [[m:user:Hoo man]]; Version 5.0; 2013-05-24;
*
* Shows the number of active (one log entry in the last 7 days or as configured) sysops, uses data from the toolserver
* Tested in IE and FF with vector and monobook, uses my (Hoo man) wiki tools (shared.js)
*
* DO NOT COPY AND PASTE, instead see https://meta.wikimedia.org/wiki/User:Hoo_man/Scripts/Active_sysops
*/

/*global hoo, mw, activeSysopsConfig, disable_activeSysops */
/*jshint forin:true, noarg:true, noempty:true, eqeqeq:true, loopfunc:true, bitwise:true, undef:true, browser:true, jquery:true, indent:4, maxerr:50, white:false */

mw.loader.using( [ 'mediawiki.util', 'mediawiki.jqueryMsg', 'jquery.jStorage' ], function() {
	'use strict';

	// Default config
	var config = {
			lastAction : 604800,
			// Wiki marker(s)
			markWikisActiveSysops : false,
			markWikisActiveSysopsLessThan : 2,
			markWikisGS : false,
			// Sorting order
			markWikisActiveSysopsFirst : false
		},
		$wikiMarker, $activeSysopMarker, $GSWikiMarker;

	/**
	 * Display the number of sysops
	 *
	 * @param {number} count
	 */
	function displaySysopCount( count ) {
		var msg = mw.message( 'hoo-activeSysops-toolbarText', count ).escaped();

		hoo.addToolLink(
			msg,
			'//toolserver.org/~pathoschild/stewardry/?wiki=' + mw.config.get( 'wgDBname' ) + '_p&sysop=on&bureaucrat=on',
			'',
			config.toolLinkMethod
		);

		if ( config.markWikisActiveSysops && count < config.markWikisActiveSysopsLessThan ) {
			$activeSysopMarker = $( '<span>' )
				.attr( 'id', 'activeSysopMarker' )
				.text( msg )
				.appendTo( $wikiMarker )
				// Button sorting (which one is left most), only needed if both buttons are present
				.css( 'float', config.markWikisActiveSysopsFirst ? 'left' : 'right' );
		}
	}

	/**
	 * Display that the wiki is a GS wiki... if it is
	 *
	 * @param {bool} isGSWiki
	 */
	function displayGSWikiSet( isGSWiki ) {
		if ( !isGSWiki ) {
			return;
		}

		$GSWikiMarker = $( '<span>' )
			.attr( 'id', 'GSWikiMarker' )
			.text( mw.message( 'hoo-activeSysops-GSWiki' ).escaped() )
			.appendTo( $wikiMarker )
			// Button sorting (which one is left most), only needed if both buttons are present
			.css( 'float', config.markWikisActiveSysopsFirst ? 'right' : 'left' );
	}

	/**
	 * Get the number of sysops either from cache or the TS API and call callback with it
	 *
	 * @param {function} callback
	 */
	function getSysopCount( callback ) {
		var storageKey = 'hoo-activeSysops-sysopCount';

		if ( $.jStorage.get( storageKey, false ) ) {
			callback( $.jStorage.get( storageKey ) );
			return;
		}

		$.ajax( {
			url: '//toolserver.org/~hoo/api.php',
			data: {
				action: 'activeSysops',
				wiki: mw.config.get( 'wgDBname' ) + '_p',
				format: 'json',
				last_action: config.lastAction
			},
			dataType: 'jsonp'
		} )
		.done( function( data ) {
			if ( data.api.error !== 'false' ) {
				return;
			}
			$.jStorage.set( storageKey, data.api.activesysops.count );
			// Expire after 25h
			$.jStorage.setTTL( storageKey, 25 * 3600 * 1000 );

			callback( $.jStorage.get( storageKey ) );
		} );
	}

	/**
	 * Get the global sysop wikiset either from cache or the TS API and call callback with it
	 *
	 * @param {function} callback
	 */
	function getGSWikiSet( callback ) {
		var storageKey = 'hoo-activeSysops-GSWikiSet';

		if ( $.jStorage.get( storageKey, false ) ) {
			callback( $.jStorage.get( storageKey ) );
			return;
		}

		$.ajax( {
			url: '//toolserver.org/~hoo/api.php',
			data: {
				action: 'wikiSets',
				wikiset: 7,
				format: 'json',
				prop: 'ws_wikis'
			},
			dataType: 'jsonp'
		} )
		.done( function( data ) {
			var isGSWiki = false;

			if ( data.api.error !== 'false' || !data.api.wikisets[0].ws_wikis ) {
				return false;
			}
			if( $.inArray( mw.config.get( 'wgDBname' ), data.api.wikisets[0].ws_wikis ) === -1 ) {
				isGSWiki = true;
			}

			$.jStorage.set( storageKey, isGSWiki );
			// Expire after 25h
			$.jStorage.setTTL( storageKey, 25 * 3600 * 1000 );

			callback( $.jStorage.get( storageKey ) );
		} );
	}

	/**
	 * Init code
	 */
	function init() {
		var lang;

		if ( typeof disable_activeSysops !== 'undefined' && disable_activeSysops ) {
			return false;
		}
		if ( typeof activeSysopsConfig  !== 'undefined' ) {
			$.extend( config, activeSysopsConfig );
		}
		if ( config.toolLinkMethod === undefined) {
			config.toolLinkMethod = hoo.config.toolLinkMethod;
		}

		// i18n
		if ( config.lang ) {
			lang = config.lang;
		} else {
			lang = hoo.config.lang;
		}

		if ( lang === 'de' ) {
			mw.messages.set( {
				'hoo-activeSysops-toolbarText': '$1 aktive{{PLURAL:$1|r|}} Administrator{{PLURAL:$1||en}}',
				'hoo-activeSysops-GSWiki': 'Globales Administratoren wiki'
			} );
		} else {
			mw.messages.set( {
				'hoo-activeSysops-toolbarText': '$1 active sysop{{PLURAL:$1||s}}',
				'hoo-activeSysops-GSWiki': 'Global sysop wiki'
			} );
		}

		if ( config.markWikisGS || config.markWikisActiveSysops ) {
			// Wrapper for the wiki markers
			$wikiMarker = $( '<div>' )
				.attr( 'id', 'wikiMarker' )
				.appendTo( 'body' );
		}

		// Load the active sysop count
		getSysopCount( displaySysopCount );

		if( config.markWikisGS ) {
			// Load the wiki set information
			getGSWikiSet( displayGSWikiSet );
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
