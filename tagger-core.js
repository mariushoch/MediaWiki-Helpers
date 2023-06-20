/*
* [[m:user:Hoo man]]; Version 3.0.5; 2012-09-20;
* Core file containing the class definitions for tagger.js and other scripts
* Tested in IE and FF with vector and monobook, uses my (Hoo man) wiki tools (functions.js)
*
* DO NOT COPY AND PASTE, instead see http://meta.wikimedia.org/wiki/User:Hoo_man/Scripts/Tagger
*/

if(typeof(hoo) === 'undefined') {
	var hoo = {};
}

/*global mw, hoo, disable_tagger, alert */
/*jshint forin:true, noarg:true, noempty:true, eqeqeq:true, bitwise:true, strict:true, undef:true, unused:true, curly:true, browser:true, jquery:true, indent:4, maxerr:50, loopfunc:true, white:false */

hoo.tagger = function(defaultConfig, userConfig) {
	"use strict";
	//default config (get's overwritten by the defaultConfig given as argument and by userConfig)
	//must not have .tags and .editSummary atm
	this.config = {
		disable : false,
		noDeleteOnly : false,
		allowCreations : true,
		allowSectionTags : false,
		allowOneClickTags : true,
		minorEdits : true, //mark as minor per default
		botEdits : false, //mark as bot per default
		enableBotEdits : null, //make it possible to edit with a bot flag (null lets the tool decide)
		loadDefaultLang : true,
		availableLangs : ['en', 'de'],
		langOverride : {},
		customTagDefault : '{{'
	};
	this.init = function() {
		var i;
		hoo.addToolLink(this.lang('hoo-tagger-toolbarText'), (function (self) { return function() { self.openWindow(0); }; })(this), this.uniqId + 'ToolLink', this.config.toolLinkMethod);
		//one click tag
		if(this.config.allowOneClickTags && this.config.toolLinkMethod === 'toolbar' && (mw.user.options.get('skin') === 'vector' || mw.user.options.get('skin') === 'monobook')) {
			for(i in this.config.tags) {
				if(typeof(this.config.tags[i]) === 'string' && i !== 'other') {		//to filter out stupid prototype functions
					hoo.addSubLink(this.uniqId + 'ToolLink', this.config.tags[i], (function (self, i) { return function() {
						self.addTag(self.config.tags[i], self.config.editSummary[ self.config.tags[i] ], false, self.config.minorEdits, self.config.botEdits);
					}; })(this, i));
				}
			}
		}
		//section tags
		if(mw.config.get('wgCurRevisionId') !== 0 && this.config.allowSectionTags) {
			var spans = document.getElementById('bodyContent').getElementsByTagName('span');
			var sections = [];
			for(i = 0; i<spans.length; i++) {
				if($(spans[i]).hasClass('mw-headline')) {
					sections.push(spans[i]);
				}
			}
			for(i = 0; i<sections.length; i++) {
				$( sections[i].parentNode.firstChild ).append('[',
					$( '<a class="tagSection">' + this.lang('hoo-tagger-tagSection') + '</a>' ).on('click', (function (self, i) { return function() { self.openWindow(i+1); }; })(this, i)), ']'
				);
			}
		}
	};
	this.openWindow = function(section) {
		if(!this.window) {
			var h = mw.html;
			var html, tmp;
			this.window = new hoo.popup(this.uniqId + 'taggerWindow', 540, 205, this.lang('hoo-tagger-windowTitle'));
			this.window.addButton(this.lang('hoo-tagger-button'), (function (self) { return function() { self.readForm(); }; })(this));
			html = '<form name="' + this.uniqId + 'taggerForm">';
			html += this.lang('hoo-tagger-tags') + '<br />';
			html += '<select name="tag" style="width: 97%;" id="' + this.uniqId + 'taggerFormTagSelect">';
			for(var i in this.config.tags) {
				if(typeof(this.config.tags[i]) === 'string') {		//to filter out stupid prototype functions
					if(i === 'other') {
						//deprecated
						continue;
					}
					tmp = {'value' : this.config.tags[i]};
					html += h.element('option', tmp, this.config.tags[i]);
				}
			}
			html += '<option value="otherTag" id="' + this.uniqId + 'taggerUseCustomTemplate">' + this.lang('hoo-tagger-other') + '</option>';
			html += '</select><br /><br />';
			html += this.lang('hoo-tagger-customTag') + '<br />';
			html += h.element('input', {
				name : 'otherTag',
				id : this.uniqId + 'taggerFormOtherTag',
				type : 'text',
				style : 'width: 97%;',
				value : this.config.customTagDefault
			});
			html += '<br /><br />';
			html += this.lang('hoo-tagger-editSummary') + '<br /><input name="editSummary" type="text" style="width: 97%;"><br /><br />';
			//mark as minor?
			html += '<input id="' + this.uniqId + 'minorEdit" name="minorEdit" type="checkbox" value="true"><label for="' + this.uniqId + 'minorEdit">' + this.lang('hoo-tagger-minor') + '</label>';
			//bot edit?
			if(this.config.enableBotEdits !== false && (hoo.isInGlobalGroup('Global_bot') || hoo.isInGroup('bot') || hoo.isInGroup('flood') || this.config.enableBotEdits === true)) {
				html += '<input id="' + this.uniqId + 'botEdit" name="botEdit" type="checkbox" value="true"><label for="' + this.uniqId + 'botEdit">' + this.lang('hoo-tagger-botEdit') + '</label>';
			}
			html += '<input name="section" type="hidden" value="' + section + '"></form>';
			this.window.containerHTML(html);
			//statehandlers
			$( '#' + this.uniqId + 'taggerFormTagSelect' ).on('change', (function (self) { return function() { self.updateEditSummary(); }; })(this));
			$( '#' + this.uniqId + 'taggerFormOtherTag' ).on('click', (function (self) { return function() { document.getElementById(self.uniqId + 'taggerUseCustomTemplate').selected = 'true'; }; })(this));
			// mark as minor per default?
			if(this.config.minorEdits) {
				document.getElementById(this.uniqId + 'minorEdit').checked = 'checked';
			}
			//mark as bot per default?
			if(this.config.botEdits && document.getElementById(this.uniqId + 'botEdit')) {
				document.getElementById(this.uniqId + 'botEdit').checked = 'checked';
			}
			this.updateEditSummary();
		}else{
			this.window.reOpen();
		}
	};
	this.updateEditSummary = function() {
		if(document[this.uniqId + 'taggerForm'].tag.value !== 'otherTag') {
			document[this.uniqId + 'taggerForm'].editSummary.value = this.config.editSummary[document[this.uniqId + 'taggerForm'].tag.value];
		}
	};
	this.readForm = function() {
		//which tag was selected?
		var tag = document[this.uniqId + 'taggerForm'].tag.value;
		if(tag === 'otherTag') {
			tag = document[this.uniqId + 'taggerForm'].otherTag.value;
		}
		//edit summary
		var editSummary;
		if(document[this.uniqId + 'taggerForm'].editSummary.value) {
			editSummary = document[this.uniqId + 'taggerForm'].editSummary.value;
		}else{
			editSummary = '';
		}
		//section to edit
		var section = document[this.uniqId + 'taggerForm'].section.value;
		if(section === '0') {
			section = false;
		}
		//mark as minor?
		var minor = false;
		if(document[this.uniqId + 'taggerForm'].minorEdit.checked) {
			minor = true;
		}
		//bot edit?
		var bot = false;
		if(document[this.uniqId + 'taggerForm'].botEdit && document[this.uniqId + 'taggerForm'].botEdit.checked) {
			bot = true;
		}
		this.addTag(tag, editSummary, section, minor, bot);
		this.window.close();
	};
	this.addTag = function(tag, editSummary, section, minor, bot) {
		hoo.showProcess();
		//get current content or set to false if the page doesn't yet exist or we use prependtext (if no section is given)
		var content = false;
		if(mw.config.get('wgCurRevisionId') !== 0 && section !== false) {
			content = hoo.api.sync.getPage({title : mw.config.get('wgPageName'), oldid : mw.config.get('wgCurRevisionId'), section : section});
		}
		var create = false;
		if(content === false) {
			//content isn't present, thus we either have a creation or use prependtext
			if(section !== false || (!this.config.allowCreations && mw.config.get('wgCurRevisionId') === 0)) {
				//a section was given (means we have to fetch the content)
				//or the page has to be created but creations aren't allowed
				alert(this.lang('hoo-tagger-generalError', false));
				hoo.stopProcess();
				return;
			}else if(mw.config.get('wgCurRevisionId') === 0) {
				//it seems like we're creating a new page
				content = '';
				create = true;
			}
		}
		var data, result, curRevId;
		if(create) {
			//create a new page
			result = hoo.api.sync.edit(mw.config.get('wgPageName'), {
				text : tag,
				summary : editSummary,
				minor : minor,
				createonly : true,
				bot : bot
			});
		}else{
			try {
				data = hoo.api.sync.getToken('edit', mw.config.get('wgPageName'), true);
				data = data.pages[ data.pageids[0] ];
				data.revisions[0].revid = parseInt(data.revisions[0].revid, 10);
			}catch(e){
				//error while fetching the last revision
				hoo.stopProcess();
				alert(this.lang('hoo-tagger-generalError', false));
				return;
			}
			if(mw.util.getParamValue('oldid') !== null) {
				curRevId = parseInt(mw.util.getParamValue('oldid'), 10);
			}else{
				curRevId = mw.config.get('wgCurRevisionId');
			}
			if(mw.config.get('wgCurRevisionId') !== data.revisions[0].revid || curRevId !== data.revisions[0].revid) {
				//the revision the user currently sees isn't the newest one
				hoo.stopProcess();
				alert(this.lang('hoo-tagger-editConflict', false));
				return;
			}
			var editParams = {
				summary : editSummary,
				minor : minor,
				basetimestamp : data.revisions[0].timestamp,
				bot : bot,
				nocreate : true
			};
			if(section !== false) {
				editParams.section = section;
				//add tag after heading
				if(content.indexOf('\n') !== -1) {
					editParams.text = content.replace('\n', '\n' + tag + '\n');
				}else{
					editParams.text = content + '\n' + tag;
				}
			}else{
				editParams.prependtext = tag + '\n';
			}
			result = hoo.api.sync.edit(mw.config.get('wgPageName'), editParams);
		}
		hoo.stopProcess();
		if(result === true) {			
			window.location.href = mw.config.get('wgServer') + mw.config.get('wgArticlePath').replace('$1', mw.config.get('wgPageName'));
		}else{
			alert(this.lang('hoo-tagger-error', false) + ' ' + result);
		}
	};
	// to have a custom lang that overrides mw.messages per object
	this.lang = function(msg, escape) {
		var output;
		if(escape !== false) {
			escape = true;
		}
		if(typeof( this.config.langOverride[ msg ] ) === 'string') {
			output = this.config.langOverride[ msg ];
		}else{
			output = mw.messages.get( msg );
		}
		if( escape ) {
			return mw.html.escape( output );
		}else{
			return output;
		}
	};
	//init code
	var lang;
	if((typeof(disable_tagger) !== 'undefined' && disable_tagger) || !mw.config.get('wgIsArticle')) {
		return false;
	}
	//overwrite this.config with defaultConfig
	//(assuming that this.config got no .tag and .editSummary
	if(typeof(defaultConfig) !== 'undefined' && defaultConfig) {
		$.extend(true, this.config, defaultConfig);
	}
	//overwrite this.config with userConfig
	if(typeof(userConfig) !== 'undefined' && userConfig) {
		if(userConfig.tags && userConfig.editSummary) {
			//remove the already set .tags and .editSummary if the user set smth. else
			this.config.tags = {};
			this.config.editSummary = {};
		}
		$.extend(true, this.config, userConfig);
	}
	if(typeof(this.config.toolLinkMethod) === 'undefined') {
		this.config.toolLinkMethod = hoo.config.toolLinkMethod;
	}
	if(this.config.disable) {
		return false;
	}
	this.uniqId = Math.random().toString().replace('.', '');
	//hide if noDeleteOnly and we can delete
	if(this.config.noDeleteOnly && document.getElementById('ca-delete')) {
		return false;
	}
	//Hide if page doesn't exist and create isn't allowed
	if(mw.config.get('wgArticleId') === 0 && !this.config.allowCreations) {
		return false;
	}
	//lang
	if(this.config.loadDefaultLang) {
		if(this.config.lang) {
			lang = this.config.lang;
		}else{
			lang = hoo.config.lang;
		}
		//localization
		hoo.loadLocalization(lang, '//meta.wikimedia.org/w/index.php?title=User:Hoo_man/lang/$1/tagger.js&action=raw&ctype=text/javascript', (function (self) { return function() { self.init(); }; })(this), this.config.availableLangs, 'en');
	}else{
		this.init();
	}
};

//set the default lang
mw.messages.set({
	'hoo-tagger-toolbarText' : 'Tag',
	'hoo-tagger-tagSection' : 'Tag',
	'hoo-tagger-windowTitle' : 'Page tagger',
	'hoo-tagger-tags' : 'Tag:',
	'hoo-tagger-other' : 'Other -> (Please give an edit summary as well)',
	'hoo-tagger-minor' : ' This is a minor edit',
	'hoo-tagger-botEdit' : ' This is a bot edit',
	'hoo-tagger-error' : 'Error:',
	'hoo-tagger-customTag' : 'Custom tag:',
	'hoo-tagger-editSummary' : 'Edit summary:',
	'hoo-tagger-button' : 'Tag page',
	'hoo-tagger-generalError' : 'Error: Reload the page (F5) and try it again',
	'hoo-tagger-editConflict' : 'Edit conflict: Please reload the page (F5)'
});
