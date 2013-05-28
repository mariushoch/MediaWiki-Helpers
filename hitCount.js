/*
* [[m:user:Hoo man]]; Version 2.1; 2013-05-28;
* This tool shows a link the the "Wikipedia article traffic statistics" (stats.grok.se)
* Tested in IE and FF with vector and monobook, uses my (Hoo man) wiki tools (shared.js)
*
* DO NOT COPY AND PASTE, instead use:

// This tool shows a link to the "Wikipedia article traffic statistics" (stats.grok.se) on every article, by [[m:user:Hoo man]]
mw.loader.load('//de.wikipedia.org/w/index.php?title=Benutzer:Hoo_man/hit_count.js&action=raw&ctype=text/javascript');

*/

/*global hoo, mediaWiki, hitCountConfig, disable_hitCount */
/*jshint forin:true, noarg:true, noempty:true, eqeqeq:true, loopfunc:true, bitwise:true, undef:true, browser:true, jquery:true, indent:4, maxerr:50, white:false */

( function( mw, $ ) {
	"use strict";

	if ( typeof disable_hitCount !== 'undefined' && disable_hitCount) {
		return false;
	}
	var config = {};

	function init() {
		var lang, suffix, wikiName, url;
		if ( typeof hitCountConfig !== 'undefined' ) {
			$.extend( config, hitCountConfig );
		}

		// lang
		if ( config.lang ) {
			lang = config.lang;
		} else {
			lang = hoo.config.lang;
		}

		if ( lang === 'de' ) {
			mw.messages.set( 'hoo-hitCount-toolbarText', 'Zugriffszahlen' );
		} else {
			mw.messages.set( 'hoo-hitCount-toolbarText', 'Article traffic stats' );
		}

		if ( typeof config.toolLinkMethod === 'undefined' ) {
			config.toolLinkMethod = hoo.config.toolLinkMethod;
		}
		wikiName = mw.config.get( 'wgWikiName' );
		suffix = '';
		if ( mw.config.get( 'wgWikiFamily' ) === 'wikimedia' ) {
			suffix = '.m';
		}else if ( mw.config.get( 'wgWikiFamily' ) === 'wikiquote' ) {
			suffix = '.q';
		}else if ( mw.config.get( 'wgWikiFamily' ) === 'wiktionary' ) {
			suffix = '.d';
		}else if ( mw.config.get( 'wgWikiFamily' ) === 'wikinews' ) {
			suffix = '.n';
		}else if ( mw.config.get( 'wgWikiFamily' ) === 'wikiversity' ) {
			suffix = '.v';
		}else if ( mw.config.get( 'wgWikiFamily' ) === 'wikibooks' ) {
			suffix = '.b';
		}else if ( mw.config.get( 'wgWikiFamily' ) === 'wikivoyage' ) {
			suffix = '.voy';
		}else if ( mw.config.get( 'wgWikiFamily' ) === 'wikisource' ) {
			suffix = '.s';
		}else if ( mw.config.get( 'wgWikiFamily' ) === 'mediawiki' ) {
			suffix = '.w';
			wikiName = 'www';
		}

		url = 'http://stats.grok.se/' + wikiName + suffix + '/latest30/' + encodeURIComponent( mw.config.get( 'wgPageName' ) ).replace( /%2F/g, '/' );
		hoo.addToolLink( mw.message( 'hoo-hitCount-toolbarText' ).escaped(), url, '', config.toolLinkMethod );
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
} )( mediaWiki, jQuery );
