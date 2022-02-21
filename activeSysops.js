/*
* [[m:user:Hoo man]]; Version 5.4.2; 2022-02-21;
*
* Shows the number of active (one log entry in the last 7 days or as configured) administrators.
* Uses data from tool labs.
*
* Latest version can be found at https://github.com/mariushoch/MediaWiki-Helpers/ (If you want to
* make changes, please submit a pull request there).
*
* DO NOT COPY AND PASTE, instead see https://meta.wikimedia.org/wiki/User:Hoo_man/Scripts/Active_sysops
*/

/*global hoo, mw, activeSysopsConfig, disable_activeSysops */
/*jshint esversion:6, forin:true, noarg:true, noempty:true, eqeqeq:true, loopfunc:true, bitwise:true, undef:true, browser:true, jquery:true, indent:4, maxerr:50, white:false */

mw.loader.using( [ 'mediawiki.util', 'mediawiki.jqueryMsg', 'mediawiki.api' ], function() {
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
			'//tools.wmflabs.org/meta/stewardry/?wiki=' + mw.config.get( 'wgDBname' ) + '&sysop=1',
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
		var storageKey = 'hoo-activeSysops-sysopCount',
			data = getLocalStorageItem( storageKey );

		if ( data !== null ) {
			callback( data );
			return;
		}

		$.ajax( {
			url: '//tools.wmflabs.org/hoo/api.php',
			data: {
				action: 'activeSysops',
				wiki: mw.config.get( 'wgDBname' ) + '_p',
				format: 'json',
				lastAction: config.lastAction
			},
			dataType: 'jsonp'
		} )
		.done( function( data ) {
			if ( typeof data.count !== 'number' ) {
				return;
			}
			setLocalStorageItem( storageKey, data.count );

			callback( data.count );
		} );
	}

	/**
	 * Get the global sysop wikiset either from cache or the API and call callback with it
	 *
	 * @param {function} callback
	 */
	function getGSWikiSet( callback ) {
		var storageKey = 'hoo-activeSysops-GSWikiSet',
			data = getLocalStorageItem( storageKey ),
			api = new mw.Api();

		if ( data !== null ) {
			callback( data );
			return;
		}

		api.get( {
			action: 'query',
			list: 'wikisets',
			wsfrom: 'Opted-out of global sysop wikis',
			wsprop: 'wikisincluded',
			wslimit: 1
		} )
		.done( function( data ) {
			var isGSWiki = false,
				wikisincluded = data.query.wikisets[0].wikisincluded,
				wiki;

			for ( wiki in wikisincluded ) {
				if ( wikisincluded[wiki] === mw.config.get( 'wgDBname' ) ) {
					isGSWiki = true;
					break;
				}
			}

			setLocalStorageItem( storageKey, isGSWiki );

			callback( isGSWiki );
		} );
	}

	/**
	 * @param {string} storageKey
	 * @param {*} data
	 */
	function setLocalStorageItem( storageKey, data ) {
		const dataJson = JSON.stringify( {
			// Expire after 25h
			expiry: timeSinceEpoch() + 25 * 3600,
			value: data
		} );

		try {
			localStorage.setItem( storageKey, dataJson );
		} catch (e) {
			// Nothing we can do
		}
	}

	/**
	 * @returns {*}
	 */
	function getLocalStorageItem( storageKey ) {
		const rawData = localStorage.getItem( storageKey );
		if ( rawData === null ) {
			return null;
		}
		const data = JSON.parse( rawData );
		if ( data.expiry > 1706742000 && ( ( new Date() ).getYear() + 1900 ) < 2024 ) {
			// XXX: 2022-02: Due to a bug, we have these entries with expiries waaay in the future
			// remove them.
			localStorage.removeItem( storageKey );
			return null;
		}
		if ( data.expiry < timeSinceEpoch() ) {
			// Purge the outdated entry
			localStorage.removeItem( storageKey );
			return null;
		}

		return data.value;
	}

	/**
	 * @returns {number}
	 */
	function timeSinceEpoch() {
		return Math.round( (new Date()).getTime() / 1000 );
	}

	/**
	 * Init code
	 */
	function init() {
		/* jshint camelcase:false */
		var lang;
		if (typeof hoo === 'undefined') {
			return;
		}

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
		} else if ( lang === 'ko' ) {
			mw.messages.set( {
				'hoo-activeSysops-toolbarText': '$1 명의 활동하는 관리자',
				'hoo-activeSysops-GSWiki': '전역 관리자 위키'
			} );
		} else {
			mw.messages.set( {
				'hoo-activeSysops-toolbarText': '$1 active administrator{{PLURAL:$1||s}}',
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
