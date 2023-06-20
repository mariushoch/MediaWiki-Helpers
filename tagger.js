//<nowiki>
/*
* [[m:user:Hoo man]]; Version 1.0.1; 2016-03-20;
* This tool can tag pages with a few clicks (which is much faster than editing the whole page per Hand).
* Per default it is able to tag page for speedy deletion using {{delete}}, but it can be customized to use up to every template.
* Uses tagger-core.js
* Tested in IE and FF with vector and monobook, uses my (Hoo man) wiki tools (functions.js)
*
* DO NOT COPY AND PASTE, instead see http://meta.wikimedia.org/wiki/User:Hoo_man/Scripts/Tagger
*/
if(typeof(hoo) === 'undefined') {
	var hoo = {};
}
/*global mediaWiki, hoo */
/*jshint forin:true, noarg:true, noempty:true, eqeqeq:true, bitwise:true, strict:true, undef:true, unused:true, curly:true, browser:true, jquery:true, indent:4, maxerr:50, loopfunc:true, white:false */

(function(mw, $) {
	"use strict";
	var taggerDefaultConfig = {};
	//templates and edit summaries
	taggerDefaultConfig.tags = {};
	taggerDefaultConfig.editSummary = {};
	taggerDefaultConfig.tags[1] = '{{delete|nonsense - ~~~~}}';
	taggerDefaultConfig.editSummary[taggerDefaultConfig.tags[1]] = '+ delete';
	taggerDefaultConfig.tags[2] = '{{delete|no article - ~~~~}}';
	taggerDefaultConfig.editSummary[taggerDefaultConfig.tags[2]] = '+ delete';
	taggerDefaultConfig.tags[3] = '{{delete|spam - ~~~~}}';
	taggerDefaultConfig.editSummary[taggerDefaultConfig.tags[3]] = '+ delete';
	taggerDefaultConfig.tags[4] = '{{delete|nonsense (local page for a commons file) - ~~~~}}';
	taggerDefaultConfig.editSummary[taggerDefaultConfig.tags[4]] = '+ delete';
	taggerDefaultConfig.tags[5] = '{{delete|Blanked by author - ~~~~}}';
	taggerDefaultConfig.editSummary[taggerDefaultConfig.tags[5]] = '+ delete';
	taggerDefaultConfig.tags[6] = '{{delete|No useful content - ~~~~}}';
	taggerDefaultConfig.editSummary[taggerDefaultConfig.tags[6]] = '+ delete';

	if(typeof(window.taggerConfig) === 'undefined') {
		window.taggerConfig = {};
	}
	var init = function() {
		$.ajax({
			url: '//meta.wikimedia.org/w/index.php?title=User:Hoo_man/tagger-core.js&action=raw&ctype=text/javascript',
			dataType: 'script',
			cache: true,
			success: function() { hoo.instances.tagger = new hoo.tagger(taggerDefaultConfig, window.taggerConfig); }
		});
	};
	if(typeof(hoo.objectDiff) === 'undefined') {
		if(typeof(hoo.load) === 'undefined') {
			hoo.load = [ init ];
			mw.loader.load('//meta.wikimedia.org/w/index.php?title=User:Hoo_man/functions.js&action=raw&ctype=text/javascript');		
		}else{
			hoo.load.push( init );   
		}
	}else{
		init();
	}
})(mediaWiki, jQuery);
//</nowiki>
