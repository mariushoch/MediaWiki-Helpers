/**
 * @author Marius Hoch
 */
( function( mw, $ ) {
	'use strict';

	if ( mw.config.get( 'wgAction' ) !== 'delete'  ) {
		return;
	}

	function main() {
		var pageName = mw.config.get( 'wgPageName' ),
			$historyDiv,
			$historyHead,
			$whatLinksHereDiv,
			$whatLinksHereHead,
			hasWhatLinksHere = $( '.mw-warning' ).hasClass( 'plainlinks' );

		$historyDiv = $( '<div>' )
			.attr( 'id', 'inline-history' )
			.attr( 'style', 'width: 100%; height: 200px; resize: vertical; overflow-x: hidden; overflow-y: scroll;' );
		$historyHead =  $( '<h2>' ).text( $( '#ca-history' ).text() );

		if ( hasWhatLinksHere ) {
			$whatLinksHereDiv = $( '<div>' )
				.attr( 'id', 'inline-what-links-here' )
				.attr( 'style', 'width: 100%; height: 200px; resize: vertical; overflow-x: hidden; overflow-y: scroll;' );
			$whatLinksHereHead =  $( '<h2>' ).text( $( '#t-whatlinkshere' ).text() );
		}

		getHistory( pageName )
		.done( function( $pageHistory ) {
			$pageHistory.appendTo( $historyDiv );
		} );
		getWhatLinksHere( pageName )
		.done( function( $whatLinksHere ) {
			$whatLinksHere.appendTo( $whatLinksHereDiv );
		} );

		mw.util.$content
			.append( $historyHead )
			.append( $historyDiv );

		if ( hasWhatLinksHere ) {
			mw.util.$content
				.append( $whatLinksHereHead )
				.append( $whatLinksHereDiv );
		}
	}

	/**
	 * @param {string} pageName
	 * @return {jQuery.Promise}
	 *    Resolved parameters:
	 *      - {jQuery} The page history ul
	 */
	function getHistory( pageName ) {
		var deferred = $.Deferred();

		$.get( mw.util.wikiScript( 'index' ) + '?&action=history&useskin=vector&limit=50&title=' + mw.util.wikiUrlencode( pageName ) )
			.done( function( html ) {
				var historyTree = $.parseHTML( html ),
					$historyTree = $( historyTree ),
					$pageHistory = $historyTree.find( 'ul#pagehistory' );

				$pageHistory.find( 'input' ).remove();
				$pageHistory.find( '.mw-rollback-link' ).remove();
				$pageHistory.find( '.mw-history-undo' ).remove();
				$pageHistory.find( '.mw-thanks-thank-link' ).remove();
				$pageHistory.find( 'a[href*="restore="]' ).remove();

				// Remove the left over stuff after the last element in each history <li>.
				$pageHistory.find( 'li' ).each( function() {
					var html = $( this ).html();

					$( this ).html( html.replace( />[^>]+$/, '>' ) );
				} );

				deferred.resolve( $pageHistory );
			} )
			.fail( function() {
				deferred.reject();
			} );

		return deferred.promise();
	}

	/**
	 * @param {string} pageName
	 * @return {jQuery.Promise}
	 *    Resolved parameters:
	 *      - {jQuery} The what links here excerpt
	 */
	function getWhatLinksHere( pageName ) {
		var deferred = $.Deferred();

		$.get( mw.util.wikiScript( 'index' ) + '?useskin=vector&title=Special:WhatLinksHere/' + mw.util.wikiUrlencode( pageName ) )
			.done( function( html ) {
				var historyTree = $.parseHTML( html ),
					$whatLinksHereTree = $( historyTree ),
					$whatLinksHere = $whatLinksHereTree.find( 'ul#mw-whatlinkshere-list' );

				deferred.resolve( $whatLinksHere );
			} )
			.fail( function() {
				deferred.reject();
			} );

		return deferred.promise();
	}

	$( main );

} )( mediaWiki, jQuery );
