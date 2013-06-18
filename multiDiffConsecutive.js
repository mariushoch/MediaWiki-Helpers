/**
 * View the next/ previous edit of a revision in MediaWiki multi diffs.
 * Uses the localization provided by MediaWiki, requires mediawiki.util to work.
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with this program; if not, write to the Free Software Foundation, Inc.,
 * 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301, USA.
 * http://www.gnu.org/copyleft/gpl.html
 *
 * @author Marius Hoch < hoo@online.de >
 */
mw.loader.using( 'mediawiki.util', function() {

$( document ).ready( function() {
	'use strict';
	var oldRevision, newRevision, nextRevisionText, prevRevisionText;

	/**
	 * Get an interface message
	 *
	 * @param {string} msg Message key (without MediaWiki:)
	 *
	 * @return {jQuery.promise}
	 */
	function getMessage( msg ) {
		return $.ajax( {
			url: mw.util.wikiScript( 'index' ),
			data: {
				title: 'MediaWiki:' + msg,
				action: 'raw',
				usemsgcache: true
			},
			dataType: 'text',
			cache: true
		} );
	}

	if ( mw.config.get( 'wgAction' ) !== 'view' ) {
		// Diffs have action=view
		return;
	}
	if ( !$( '.diff-multi' ).length ) {
		// No multi diff
		return;
	}
	oldRevision = mw.util.getParamValue(
		'oldid',
		$( '#mw-diff-otitle1' ).find( 'a' ).eq(0).attr( 'href' )
	);
	newRevision = mw.util.getParamValue(
		'oldid',
		$( '#mw-diff-ntitle1' ).find( 'a' ).eq(0).attr( 'href' )
	);
	if ( !newRevision || !oldRevision ) {
		// Weird
		return;
	}

	if ( $( '#differences-nextlink' ).length ) {
		nextRevisionText = $( '#differences-nextlink' ).text();
		getPrevRevisionText();
	} else {
		getMessage( 'nextdiff' )
			.done( function( text ) {
				nextRevisionText = text;
			} )
			.done( getPrevRevisionText );
	}

	/**
	 * This function gets the interface text for the next revision and
	 * calls doLink after
	 */
	function getPrevRevisionText() {
		if ( $( '#differences-prevlink' ).length ) {
			prevRevisionText = $( '#differences-prevlink' ).text();
			doLink();
		} else {
			getMessage( 'previousdiff' )
				.done( function( text ) {
					prevRevisionText = text;
				} )
				.done( doLink );
			}
	}

	/**
	 * Insert the diff links after the interface messages have been loaded
	 */
	function doLink() {
		var nextLink = $( '<a>' )
				.attr( 'href', mw.util.wikiScript( 'index' ) + '?oldid=' + oldRevision + '&diff=next' )
				.text( nextRevisionText ),
			prevLink = $( '<a>' )
				.attr( 'href', mw.util.wikiScript( 'index' ) + '?oldid=' + newRevision + '&diff=prev' )
				.text( prevRevisionText ),
			separator = $( '<span>' )
				.text( ' | ' );

		if ( $( '#differences-prevlink' ).length ) {
			// Only add a separator if we already have a visible link
			$( '#mw-diff-otitle4' )
				.append(
					separator.clone(),
					nextLink
				);
		} else {
			$( '#mw-diff-otitle4' )
				.append(
					nextLink
				);
		}

		if ( $( '#differences-nextlink' ).length ) {
			// Only add a separator if we already have a visible link
			$( '#mw-diff-ntitle4' )
				.find( '#differences-nextlink' )
				.before(
					prevLink,
					separator.clone()
				);
		} else {
			$( '#mw-diff-ntitle4' )
				.append(
					prevLink
				);
		}
	}
} );
} );
