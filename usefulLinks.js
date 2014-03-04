/**
* [[m:user:Hoo man]]; Version 3.0; 2013-01-13;
* Gives some useful links on user, user talk and user contribution pages
* Tested in IE and FF with vector and monobook, uses my (Hoo man) wiki tools (shared.js)
*
* DO NOT COPY AND PASTE, instead see https://meta.wikimedia.org/wiki/User:Hoo_man/Scripts/Useful_links
*/

/*global hoo, mw, usefulLinksConfig, usefulLinksTools, usefulLinksUserTools, usefulLinksIpTools, disable_useful_links */
/*jshint forin:false, noarg:true, noempty:true, eqeqeq:true, loopfunc:true, bitwise:true, undef:true, browser:true, jquery:true, indent:4, maxerr:50, white:false */

mw.loader.using( [ 'mediawiki.util' ], function() {
	"use strict";

	// Default config, overwrite using 'usefulLinksConfig'
	var config = {
			useFoldedMenu : true
		},
		tools, userTools, ipTools;

	/**
		Default tools:
		To add a tool in you personal js just do the same as below, but replace the "blah." out of the variable names, with the ones given in the comments.
		To remove one, just set them to null. Example:
			if ( typeof usefulLinksUserTools === 'undefined' ) usefulLinksUserTools = {};	//user only tools
			usefulLinksUserTools.xEditCounter = null;
		to disable X!'s edit counter
		($1: username - $2: lang code - $3: wiki code - $4: server address + script path)
	**/

	// Tools for all users (can be overwritten using usefulLinksTools instead of tools in your own JS)
	// Global contribs
	tools = {
		// Global contribs
		globalContribs: {
			url: '//tools.wmflabs.org/guc/?user=$1',
			linkText: 'Global contribs'
		},
		// (local) contribs
		contribs: {
			url: mw.config.get('wgServer') + mw.config.get('wgArticlePath').replace( '$1', 'Special:Contributions/' ) + '$1',
			linkText: 'Contributions'
		}
	};

	// User tools for all logged-in users (can be overwritten using usefulLinksUserTools instead of userTools in your own JS)
	userTools = {
		// SUL
		sul: {
			url: '//tools.wmflabs.org/quentinv57-tools/tools/sulinfo.php?username=$1',
			linkText: 'SUL'
		},
		// Central Auth
		ca: {
			url: '//meta.wikimedia.org/wiki/Special:CentralAuth/$1',
			linkText : 'CA'
		},
		// X!'s edit counter
		xEditCounter: {
			url: '//tools.wmflabs.org/xtools/pcount/index.php?name=$1&lang=$2&wiki=$3',
			linkText: 'X!\'s tool'
		},
		// User rights
		userRights: {
			url: '$4?title=Special:ListUsers&limit=1&username=$1',
			linkText: 'Rights'
		}
	};

	// IP tools for all logged-out users (can be overwritten using usefulLinksIpTools instead of ipTools in your own JS)
	ipTools = {
		// Whois
		whois: {
			url: 'http://whois.domaintools.com/$1',
			linkText: 'Whois'
		}
	};

	function init() {
		var toolURI, username, i, lang;

		if ( typeof disable_useful_links !== 'undefined' && disable_useful_links ) {
			return false;
		}

		// Custom config
		if ( typeof usefulLinksConfig !== 'undefined' ) {
			if ( typeof usefulLinksConfig.toolLinkMethod !== 'undefined' && usefulLinksConfig.toolLinkMethod !== 'toolbar' ) {
				// Disable folded menus if the user selected another link method than toolbar
				if ( typeof usefulLinksConfig.toolLinkMethod === 'undefined' || usefulLinksConfig.useFoldedMenu !== true ) {
					// But only if he/she didn't explicitly enable it
					config.useFoldedMenu = false;
				}
			}
			$.extend( config, usefulLinksConfig );
		}

		// i18n
		if ( config.lang ) {
			lang = config.lang;
		} else {
			lang = hoo.config.lang;
		}

		if ( lang === 'de' ) {
			mw.messages.set( 'hoo-usefulLinks-toolbarText', 'Nützliche Links' );
		} else {
			mw.messages.set( 'hoo-usefulLinks-toolbarText', 'Useful links' );
		}

		if ( typeof usefulLinksTools !== 'undefined' ) {
			$.extend( tools, usefulLinksTools );
		}
		if ( typeof usefulLinksUserTools !== 'undefined' ) {
			$.extend( userTools, usefulLinksUserTools );
		}
		if ( typeof usefulLinksIpTools !== 'undefined' ) {
			$.extend( ipTools, usefulLinksIpTools );
		}

		if ( typeof config.toolLinkMethod === 'undefined' ) {
			config.toolLinkMethod = hoo.config.toolLinkMethod;
		}

		// Get user name
		if ( mw.config.get( 'wgCanonicalNamespace' ) === 'User' || mw.config.get( 'wgCanonicalNamespace' ) === 'User_talk' ) {
			// User or user talk page
			username = mw.config.get( 'wgTitle' ).match( /([^\/]+)/ )[1];
		} else if ( mw.config.get( 'wgCanonicalNamespace' ) === 'Special' && mw.config.get( 'wgCanonicalSpecialPageName' ) === 'Contributions' ) {
			// Special:Contributions
			if ( window.location.href.indexOf( '&' ) === -1 ) {
				// Request like Special:Contributions/Username
				username = mw.config.get( 'wgTitle' ).substring( mw.config.get( 'wgTitle' ).lastIndexOf( '/' ) +1 );
			} else {
				username = mw.util.getParamValue( 'target' );
			}
			// We're already on the contribs page
			tools.contribs = null;
		} else {
			return;
		}

		if ( !mw.util.isIPv4Address( username ) && !mw.util.isIPv6Address( username ) ) {
			// Registered user
			$.extend( tools, userTools);
		} else {
			$.extend( tools, ipTools );
		}

		if ( config.useFoldedMenu && config.toolLinkMethod === 'toolbar' ) {
			// Create parent for folded menu
			hoo.addToolLink(
				mw.messages.get( 'hoo-usefulLinks-toolbarText' ),
				function() { return false; },
				'usefulLinksMenu',
				'toolbar'
			);
		}

		// Add links
		for ( i in tools ) {
			if ( tools[i] === null || typeof tools[i].url === 'undefined' ) {
				continue;
			}
			toolURI = tools[i].url
				.replace( /\$1/g, username )
				.replace( /\$2/g, mw.config.get( 'wgWikiName' ) )
				.replace( /\$3/g, mw.config.get( 'wgWikiFamily' ) )
				.replace( /\$4/g, mw.config.get( 'wgServer' ) + mw.config.get( 'wgScript' ) );

			if ( config.useFoldedMenu && config.toolLinkMethod === 'toolbar' ) {
				hoo.addSubLink(
					'usefulLinksMenu',
					tools[i].linkText,
					toolURI
				);
			} else {
				hoo.addToolLink(
					tools[i].linkText,
					toolURI,
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
