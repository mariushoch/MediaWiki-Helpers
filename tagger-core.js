/*
* [[m:user:Hoo man]]; Version 4.0; 2013-01-13;
* Core file containing the class definitions for tagger.js and other scripts
* Tested in IE and FF with vector and monobook, uses my (Hoo man) wiki tools (shared.js)
*
* DO NOT COPY AND PASTE, instead see https://meta.wikimedia.org/wiki/User:Hoo_man/Scripts/Tagger
*/

if ( typeof hoo === 'undefined' ) {
	var hoo = {};
}

/*global mw, hoo, disable_tagger, skin, alert */
/*jshint forin:true, noarg:true, noempty:true, eqeqeq:true, bitwise:true, strict:true, undef:true, unused:true, curly:true, browser:true, jquery:true, indent:4, maxerr:50, loopfunc:true, white:false */

hoo.tagger = function( defaultConfig, userConfig ) {
	"use strict";

	var self = this;

	// Default config (get's overwritten by the defaultConfig given as argument and by userConfig)
	// Must not have .tags and .editSummary
	this.config = {
		disable: false,
		noDeleteOnly: false,
		allowCreations: true,
		allowSectionTags: false,
		allowOneClickTags: true,
		minorEdits: true, //mark as minor per default
		botEdits: false, //mark as bot per default
		enableBotEdits: null, //make it possible to edit with a bot flag (null lets the tool decide)
		loadDefaultLang: true,
		availableLangs: ['en', 'de'],
		langOverride: {},
		customTagDefault: '{{'
	};

	// Replace the page headline with a loading animation
	this.showProcess = function() {
		$( '#firstHeading' )
			.hide()
			.after(
				$.createSpinner( {
					size: 'large',
					type: 'block',
					id: self.uniqId + '-spinner'
				} )
			);
	};

	// Restore the page headline
	this.stopProcess = function() {
		$.removeSpinner( self.uniqId + '-spinner' );
		$( '#firstHeading' ).show();
	};

	// Whether the user is in the given group
	this.isInGroup = function( group ) {
		return ( $.inArray( group, mw.config.get( 'wgUserGroups' ) ) !== -1 );
	};

	// Whether the user is in the given global group
	this.isInGlobalGroup = function( group ) {
		return ( mw.config.exists( 'wgGlobalGroups' ) &&  $.inArray( group, mw.config.get( 'wgGlobalGroups' ) ) !== -1 );
	};

	this.main = function() {
		var i;
		hoo.addToolLink(
			self.lang( 'hoo-tagger-toolbarText' ),
			function( e ) { self.openWindow( 0 ); e.preventDefault(); },
			self.uniqId + 'ToolLink',
			self.config.toolLinkMethod
		);
		// One click tag
		if ( self.config.allowOneClickTags && self.config.toolLinkMethod === 'toolbar' && ( skin === 'vector' || 'skin' === 'monobook' ) ) {
			for ( i in self.config.tags ) {
				if ( typeof self.config.tags[i] === 'string' && i !== 'other' ) {
					// To filter out prototype functions
					hoo.addSubLink(
						self.uniqId + 'ToolLink',
						self.config.tags[i],
						function() {
							self.addTag(
								self.config.tags[i],
								self.config.editSummary[ self.config.tags[i] ],
								false,
								self.config.minorEdits,
								self.config.botEdits
							);
						}
					);
				}
			}
		}

		// Section tags
		if ( mw.config.get( 'wgCurRevisionId' ) !== 0 && self.config.allowSectionTags ) {
			mw.util.$content.find( 'span.mw-headline' ).each(
				function( i, elem ) {
					$( elem )
						.parent()
						.find( '.editsection' )
						.append(
							'[',
							$( '<a class="tagSection">' + self.lang( 'hoo-tagger-tagSection' ) + '</a>' )
								.click( function() { self.openWindow( i + 1 ); } ),
							']'
						);
				}
			);
		}
	};

	this.openWindow = function( section ) {
		if ( self.window ) {
			self.window.dialog( 'open' );
			return;
		}

		var h = mw.html,
			html, i;

		html = '<div id="taggerDialog"><form name="' + self.uniqId + 'taggerForm">' +
			self.lang( 'hoo-tagger-tags' ) + '<br />' +
			'<select name="tag" style="width: 97%;" id="' + self.uniqId + 'taggerFormTagSelect">';

		for ( i in self.config.tags ) {
			if ( typeof self.config.tags[i] === 'string' && i !== 'other' ) {
				// Filter out prototype functions and deprecated strings
				html += h.element(
					'option',
					{ value: self.config.tags[i] },
					self.config.tags[i]
				);
			}
		}
		html += '<option value="otherTag" id="' + self.uniqId + 'taggerUseCustomTemplate">' + self.lang( 'hoo-tagger-other' ) + '</option>' +
			'</select><br /><br />' +
			self.lang( 'hoo-tagger-customTag' ) + '<br />' +
			h.element(
				'input',
				{
					name: 'otherTag',
					id: self.uniqId + 'taggerFormOtherTag',
					type: 'text',
					style: 'width: 97%;',
					value: self.config.customTagDefault
				}
			) +
			'<br /><br />' +
			self.lang( 'hoo-tagger-editSummary' ) + '<br /><input name="editSummary" type="text" style="width: 97%;"><br /><br />' +

			// Mark as minor?
			'<input id="' + self.uniqId + 'minorEdit" name="minorEdit" type="checkbox" value="true"><label for="' + self.uniqId + 'minorEdit">' + self.lang( 'hoo-tagger-minor' ) + '</label>';

		// Bot edit?
		if ( self.config.enableBotEdits !== false && ( self.isInGlobalGroup( 'Global_bot' ) || self.isInGroup( 'bot' ) || self.isInGroup( 'flood' ) || self.config.enableBotEdits === true ) ) {
			html += '<input id="' + self.uniqId + 'botEdit" name="botEdit" type="checkbox" value="true"><label for="' + self.uniqId + 'botEdit">' + self.lang('hoo-tagger-botEdit') + '</label>';
		}
		html += '<input name="section" type="hidden" value="' + section + '"></form></div>';

		self.window = $( html ).dialog( {
			title: self.lang( 'hoo-tagger-windowTitle', true ),
			minWidth: 540,
			minHeight: 205,
			buttons: [
				{
					text: self.lang( 'hoo-tagger-button' ),
					click: self.readForm
				},
				{
					text: self.lang( 'hoo-closeButtonText' ),
					click: function() { $( self.window ).dialog( 'close' ); }
				}
			]
		} );

		// Statehandlers
		$( '#' + self.uniqId + 'taggerFormTagSelect' )
			.on( 'change', self.updateEditSummary );

		$( '#' + self.uniqId + 'taggerFormOtherTag' )
			.click( function() {
				document.getElementById( self.uniqId + 'taggerUseCustomTemplate' ).selected = 'true';
			} );

		// Mark as minor per default?
		if ( self.config.minorEdits ) {
			document.getElementById( self.uniqId + 'minorEdit' ).checked = 'checked';
		}

		// Mark as bot per default?
		if ( self.config.botEdits && document.getElementById( self.uniqId + 'botEdit' ) ) {
			document.getElementById( self.uniqId + 'botEdit' ).checked = 'checked';
		}
		self.updateEditSummary();
	};

	// Update the edit summary field in case another edit summary is selected from the drop down
	this.updateEditSummary = function() {
		if ( document[self.uniqId + 'taggerForm'].tag.value !== 'otherTag' ) {
			document[self.uniqId + 'taggerForm'].editSummary.value = self.config.editSummary[document[self.uniqId + 'taggerForm'].tag.value];
		}
	};

	// Reads the form and start the tagging
	this.readForm = function() {
		// Which tag was selected?
		var tag = document[self.uniqId + 'taggerForm'].tag.value;
		if ( tag === 'otherTag' ) {
			tag = document[self.uniqId + 'taggerForm'].otherTag.value;
		}

		// Edit summary
		var editSummary;
		if ( document[self.uniqId + 'taggerForm'].editSummary.value ) {
			editSummary = document[self.uniqId + 'taggerForm'].editSummary.value;
		} else {
			editSummary = '';
		}

		// Section to edit
		var section = document[self.uniqId + 'taggerForm'].section.value;
		if ( section === '0' ) {
			section = false;
		}
		// Mark as minor?
		var minor = false;
		if ( document[self.uniqId + 'taggerForm'].minorEdit.checked ) {
			minor = true;
		}

		// Bot edit?
		var bot = false;
		if ( document[self.uniqId + 'taggerForm'].botEdit && document[self.uniqId + 'taggerForm'].botEdit.checked ) {
			bot = true;
		}
		self.addTag( tag, editSummary, section, minor, bot );

		self.window.dialog( 'close' );
	};

	// Try to add the given tag to the current page.
	// Checks for edit conflicts in various ways
	this.addTag = function( tag, editSummary, section, minor, bot ) {
		self.showProcess();

		if ( mw.config.get( 'wgCurRevisionId' ) !== 0 && section !== false ) {
			// Get the current content
			$.ajax( {
				url: mw.config.get( 'wgServer' ) + mw.config.get( 'wgScript' ),
				data: {
					title: mw.config.get( 'wgPageName' ),
					action: 'raw',
					oldid: mw.config.get( 'wgCurRevisionId' ),
					section: section
				},
				cache: false

			} )
			.done(
				function( data ) {
					onContentLoad( data );
				}
			);
		} else {
			// False if the page doesn't yet exist or we use prependtext (if no section is given)
			onContentLoad( false );
		}

		// 2nd step after the content has been fetched (or we decided to not do so)
		function onContentLoad( content ) {
			var create = false;
			if ( content === false ) {
				// Content isn't present, thus we either have a creation or use prependtext
				if ( section !== false || ( !self.config.allowCreations && mw.config.get( 'wgCurRevisionId' ) === 0) ) {
					// A section was given (means we have to fetch the content)
					// or the page has to be created but creations aren't allowed
					alert( self.lang( 'hoo-tagger-generalError', false ) );
					self.stopProcess();
					return;
				} else if ( mw.config.get('wgCurRevisionId') === 0 ) {
					// It seems like we're creating a new page
					content = '';
					create = true;
				}
			}
			var editParams, api;
			if( create ) {
				// Create a new page
				editParams = {
					action: 'edit',
					title: mw.config.get( 'wgPageName' ),
					text: tag,
					summary: editSummary,
					token: mw.user.tokens.get( 'editToken' ),
					createonly: true
				};
				if ( bot ) {
					editParams.bot = true;
				}
				if ( minor ) {
					editParams.minor = true;
				}
				api = new mw.Api();
				api.post( editParams )
					.done( editSuccess )
					.fail( editFailure );

			} else {
				api = new mw.Api();
				api.get( {
					action: 'query',
					intoken : 'edit',
					titles : mw.config.get( 'wgPageName' ),
					indexpageids : true,
					prop : 'info|revisions'
				} )
				.fail( function() {
					// Error while fetching the last revision
					self.stopProcess();
					alert( self.lang( 'hoo-tagger-generalError', false ) );
				} )
				.done(
					// Does the edit with prependtext after some more sanity checking
					function( data ) {
						var api, editParams, curRevId;

						try {
							data = data.query.pages[ data.query.pageids[0] ].revisions[0];
							data.revid = parseInt( data.revid, 10 );
						} catch( e ) {
							self.stopProcess();
							alert( self.lang( 'hoo-tagger-generalError', false ) );
						}

						if ( mw.util.getParamValue( 'oldid' ) !== null ) {
							curRevId = parseInt( mw.util.getParamValue( 'oldid' ), 10 );
						} else {
							curRevId = mw.config.get( 'wgCurRevisionId' );
						}

						if ( mw.config.get( 'wgCurRevisionId' ) !== data.revid || curRevId !== data.revid ) {
							// The revision the user currently sees isn't the newest one
							self.stopProcess();
							alert( self.lang( 'hoo-tagger-editConflict', false ) );
							return;
						}
						editParams = {
							action: 'edit',
							title: mw.config.get( 'wgPageName' ),
							summary: editSummary,
							basetimestamp: data.timestamp,
							token: mw.user.tokens.get( 'editToken' ),
							nocreate: true
						};

						if ( bot ) {
							editParams.bot = true;
						}
						if ( minor ) {
							editParams.minor = true;
						}

						if( section !== false ) {
							editParams.section = section;
							// Add tag after heading
							if ( content.indexOf('\n') !== -1 ) {
								editParams.text = content.replace( '\n', '\n' + tag + '\n' );
							} else {
								editParams.text = content + '\n' + tag;
							}
						} else {
							editParams.prependtext = tag + '\n';
						}

						// Do the edit
						api = new mw.Api();
						api.post( editParams )
							.done( editSuccess )
							.fail( editFailure );
					} );
				}
			}

		// Called if the edit was a success
		function editSuccess() {
			self.stopProcess();
			window.location.href =
				mw.config.get( 'wgServer' ) + mw.config.get( 'wgArticlePath' ).replace( /\$1/g, mw.config.get( 'wgPageName' ) );
		}
		// Called if the edit failed
		function editFailure( error, data ) {
			self.stopProcess();
			alert( self.lang( 'hoo-tagger-error', false ) + ' ' + data.error.info );
		}
	};

	// This function enables us to have custom messages that override mw.messages per object
	this.lang = function( msg, escape ) {
		var output;
		if ( escape !== false ) {
			escape = true;
		}

		if ( typeof self.config.langOverride[ msg ] === 'string' ) {
			output = self.config.langOverride[ msg ];
		} else {
			output = mw.messages.get( msg );
		}
		if ( escape ) {
			return mw.html.escape( output );
		} else {
			return output;
		}
	};

	// Init code
	this.init = function() {
		var lang;
		if ( typeof disable_tagger !== 'undefined' && disable_tagger || !mw.config.get( 'wgIsArticle' ) ) {
			return false;
		}

		// Overwrite self.config with defaultConfig
		// (assuming that self.config got no .tag and .editSummary)
		if ( typeof defaultConfig !== 'undefined' && defaultConfig ) {
			$.extend( true, self.config, defaultConfig );
		}

		// Overwrite self.config with userConfig
		if ( typeof userConfig !== 'undefined' && userConfig ) {
			if ( userConfig.tags && userConfig.editSummary ) {
				// Remove the already set .tags and .editSummary if the user set smth. else
				self.config.tags = {};
				self.config.editSummary = {};
			}
			$.extend( true, self.config, userConfig );
		}

		if ( typeof self.config.toolLinkMethod === 'undefined' ) {
			self.config.toolLinkMethod = hoo.config.toolLinkMethod;
		}

		if ( self.config.disable ) {
			return false;
		}

		self.uniqId = Math.random().toString().replace( '.', '' );
		// Hide if noDeleteOnly and we can delete
		if ( self.config.noDeleteOnly && document.getElementById( 'ca-delete' ) ) {
			return false;
		}

		// Hide if page doesn't exist and create isn't allowed
		if ( mw.config.get( 'wgArticleId' ) === 0 && !self.config.allowCreations ) {
			return false;
		}

		// Localization
		if(self.config.loadDefaultLang) {
			if ( self.config.lang ) {
				lang = self.config.lang;
			} else {
				lang = hoo.config.lang;
			}
			if ( lang !== 'en' && $.inArray( lang, self.config.availableLangs ) !== -1 ) {
				// Load from meta
				$.ajax( {
					url: '//meta.wikimedia.org/w/index.php?title=User:Hoo_man/lang/' + lang + '/tagger.js&action=raw&ctype=text/javascript',
					dataType: 'script',
					cache: true
				} )
					.done( self.main );
			} else {
				// English is already set
				self.main();
			}
		} else {
			self.main();
		}
	};

	mw.loader.using( ['jquery.spinner', 'jquery.ui.dialog', 'mediawiki.util', 'mediawiki.api', 'user.tokens'], function() {
		// Load the shared functions script if needed
		if ( typeof hoo === 'undefined' || typeof hoo.addToolLink  === 'undefined' ) {
			$.ajax( {
				url: '//meta.wikimedia.org/w/index.php?title=User:Hoo_man/functions.js&action=raw&ctype=text/javascript',
				dataType: 'script',
				cache: true
			} )
			.done(
				function() {
					$( document ).ready( self.init );
				}
			);
		} else {
			$( document ).ready( self.init );
		}
	} );
};

// Set the default lang
mw.messages.set( {
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
} );
