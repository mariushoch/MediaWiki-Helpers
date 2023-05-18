/*
* Some JS functions
* [[m:User:Hoo man]]; Version 3.0; 2013-01-13;
* PLEASE DO NOT COPY AND PASTE
*/


/*global mw, hooConfig, hoofrConfig */
/*jshint forin:true, noarg:true, noempty:true, eqeqeq:true, bitwise:true, strict:false, undef:true, unused:true, curly:true, browser:true, jquery:true, indent:4, maxerr:50, loopfunc:true, white:false, esversion: 6 */

if(typeof(hoo) === 'undefined') {
	var hoo = {};
}


// Add tool links (in p-personal) or using mw.util.addPortletLink()
// Target can be either a link or a function
hoo.addToolLink = function( name, target, id, method ) {
	const h = mw.html,
		skin = mw.config.get( 'skin' );
	let onClickFunc = null;

	if( !method ) {
		method = this.config.toolLinkMethod;
	}
	if( method === 'toolbar' && !( skin === 'monobook' || skin === 'vector' || skin === 'vector-2022' ) ) {
		// Toolbar is only (well) working in monobook and vector so we have to use smth. else on other skins
		method = 'p-cactions';
	}
	// Generate a new random id... repeat that till we have one which hasn't yet been used
	if ( !id ) {
		do {
			id = 'tool_link_' + ( Math.ceil( Math.random() * 1000 ) );
		} while ( document.getElementById(id) );
	}
	if ( typeof target === 'function' ) {
		onClickFunc = target;
		target = '#';
	}
	if ( method === 'toolbar' ) {
		if ( !$( '#toolLinks' ).length ) {
			$( '<div>' )
				.attr( 'id', 'toolLinks' )
				.html( '<ul></ul>' )
				.appendTo( '#p-personal' );
		}
		$( '<li>' )
			.addClass( 'toolink_entry' )
			.html(
				h.element(
					'a', {
						'class': 'toolinks',
						id: id,
						href: target
					},
					name
				)
			)
			.appendTo( $( '#toolLinks > ul' ) );
	} else {
		mw.util.addPortletLink(method, target, name, id);
	}
	if( onClickFunc ) {
		$( '#' + id ).on( 'click', onClickFunc );
	}
	return id;
};

// This function can add a sub link to links added with hoo.addToolLink (of course only where method = toolbar)
// Target can be either a link or a function
hoo.addSubLink = function( parentId, name, target, id ) {
	var h = mw.html,
		$parent = $( '#' + parentId ).parent(),
		tmp, i, onClickFunc;

	if ( typeof target === 'function' ) {
		onClickFunc = target;
		target = '#';
	}

	// To make it wrap where needed make sure we got a breaking character at least every 14 chars
	tmp = name.match( /([^ ]){14,}/g );
	if ( tmp ) {
		for ( i = 0; i < tmp.length; i++ ) {
			name = name.replace( tmp[i], tmp[i].substring( 0, 14 ) + '&#8203;' + tmp[i].substring(14) );
		}
	}

	if ( $( '#' + parentId ).text().indexOf( '▼ ' ) !== 0 ) {
		$( '#' + parentId )
			.text( '▼ ' + $( '#' + parentId ).text() );
	}

	// Generate a new random id... repeat that till we have one which hasn't yet been used
	if ( !id ) {
		do {
			id = 'tool_link_' + ( Math.ceil( Math.random() * 1000 ) );
		} while ( document.getElementById( id ) );
	}

	if ( $parent.find( '> ul' ).length === 0 ) {
		$( '<ul>' )
			.addClass( 'toolLinkSubField' )
			.css( 'display', 'none' )
			.appendTo( $parent );
		$parent.on(
			'mouseover',
			function() {
				$(this)
					.find( 'ul' )
					.css( 'display', 'block' );
			}
		);
		$parent.on(
			'mouseout',
			function() {
				$(this)
					.find( 'ul' )
					.css( 'display', 'none' );
			}
		);
	}

	$( '<li>' )
		.addClass( 'toolLinkSubRow' )
		.html(
			'•&nbsp;' +
			h.element(
				'a', {
					'class': 'toolinks',
					id: id,
					href: target
					}
				)
			)
		.appendTo( $parent.find( 'ul' ) );

	// Add name as raw HTML to preserve
	$( '#' + id ).html( name );

	if ( onClickFunc ) {
		$( '#' + id ).on( 'click', onClickFunc );
	}
	return id;
};

// Close button text used by multiple scripts
if ( !mw.messages.exists( 'hoo-closeButtonText' ) ) {
	mw.messages.set( 'hoo-closeButtonText', 'Close' );
}

// Default config
// To change anything just add one of the following lines to your own .js and replace 'hoo.defaultConfig' with 'hooConfig'

if ( typeof hoo.defaultConfig === 'undefined' ) {
	hoo.defaultConfig = {};
}

// Must be either "toolbar" or "p-cactions", "p-personal", "p-navigation", "p-tb", ...
hoo.defaultConfig.toolLinkMethod = 'toolbar';

// The language to use, defaults to wgUserLanguage
hoo.defaultConfig.lang = mw.config.get( 'wgUserLanguage' );

if ( typeof hooConfig === 'undefined' ) {
	if ( typeof hoofrConfig === 'undefined' ) {
		hoo.config = hoo.defaultConfig;
	} else {
		// Fallback to the old hoofrConfig
		hoo.config = hoo.objectDiff( hoofrConfig, hoo.defaultConfig );
	}
} else {
	hoo.config = hoo.objectDiff( hooConfig, hoo.defaultConfig );
}

mw.loader.load( '//meta.wikimedia.org/w/index.php?title=User:Hoo_man/tool.css&action=raw&ctype=text/css', 'text/css' );
