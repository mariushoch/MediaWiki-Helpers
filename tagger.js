/*
* [[m:user:Hoo man]]; Version 2.0; 2013-01-13;
* This tool can tag pages with a few clicks (which is much faster than editing the whole page per hand).
* Per default it is able to tag page for speedy deletion using {{delete}}, but it can be customized to use up to every template.
* Uses tagger-core.js
* Tested in IE and FF with vector and monobook, uses my (Hoo man) wiki tools (shared.js)
*
* DO NOT COPY AND PASTE, instead see https://meta.wikimedia.org/wiki/User:Hoo_man/Scripts/Tagger
*/

/*global mediaWiki, hoo */
/*jshint forin:true, noarg:true, noempty:true, eqeqeq:true, bitwise:true, strict:true, undef:true, unused:true, curly:true, browser:true, jquery:true, indent:4, maxerr:50, loopfunc:true, white:false */

//<nowiki>

if ( typeof hoo === 'undefined' ) {
	var hoo = {};
}

if ( typeof hoo.instances === 'undefined' ) {
	hoo.instances = {};
}

( function( mw, $ ) {
	"use strict";

	var taggerDefaultConfig = {},
		taggerConfig = {};

	// Templates and edit summaries
	taggerDefaultConfig.tags = {};
	taggerDefaultConfig.editSummary = {};
	taggerDefaultConfig.tags[1] = '{{delete|nonsense - ~~~~}}';
	taggerDefaultConfig.editSummary[taggerDefaultConfig.tags[1]] = '+ delete';
	taggerDefaultConfig.tags[2] = '{{delete|no article - ~~~~}}';
	taggerDefaultConfig.editSummary[taggerDefaultConfig.tags[2]] = '+ delete';
	taggerDefaultConfig.tags[2] = '{{delete|spam - ~~~~}}';
	taggerDefaultConfig.editSummary[taggerDefaultConfig.tags[2]] = '+ delete';
	taggerDefaultConfig.tags[3] = '{{delete|nonsense (local page for a commons file) - ~~~~}}';
	taggerDefaultConfig.editSummary[taggerDefaultConfig.tags[3]] = '+ delete';
	taggerDefaultConfig.tags[4] = '{{delete|Blanked by author - ~~~~}}';
	taggerDefaultConfig.editSummary[taggerDefaultConfig.tags[4]] = '+ delete';
	taggerDefaultConfig.tags[5] = '{{delete|No useful content - ~~~~}}';
	taggerDefaultConfig.editSummary[taggerDefaultConfig.tags[5]] = '+ delete';

	if ( typeof window.taggerConfig !== 'undefined' ) {
		taggerConfig = window.taggerConfig;
	}

	$.ajax( {
		url: '//meta.wikimedia.org/w/index.php?title=User:Hoo_man/tagger-core.js&action=raw&ctype=text/javascript',
		dataType: 'script',
		cache: true
	} )
	.done(
		function() {
			hoo.instances.tagger = new hoo.tagger( taggerDefaultConfig, taggerConfig );
		}
	);

} )( mediaWiki, jQuery );

//</nowiki>
