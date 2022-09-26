/**
 * @author Marius Hoch
 */
( function( mw, $ ) {
	'use strict';

	if ( mw.config.get( 'wgAction' ) !== 'delete' ) {
		return;
	}

	function main( $content ) {
		if ( $( '#mw-returnto' ).length ) {
			// Post-delete confirmation
			return;
		}

		var pageName = mw.config.get( 'wgPageName' ),
			$historyDiv,
			$historyHead,
			$whatLinksHereDiv,
			$whatLinksHereHead,
			$warningBox = $( '.mw-message-box-warning a' ).first(),
			hasWhatLinksHere = false;

		if ( $warningBox.length ) {
			hasWhatLinksHere = $warningBox.attr( 'href' ).endsWith( '/' + mw.config.get( 'wgTitle' ) );
		}
		$historyDiv = $( '<div>' )
			.attr( 'id', 'inline-history' )
			.attr( 'style', 'width: 100%; height: 200px; resize: vertical; overflow-x: hidden; overflow-y: scroll;' );
		$historyHead =  $( '<h2>' ).text( $( '#ca-history' ).text() );

		if ( hasWhatLinksHere ) {
			$whatLinksHereDiv = $( '<div>' )
				.attr( 'id', 'inline-what-links-here' )
				.attr( 'style', 'width: 100%; height: 200px; resize: vertical; overflow-x: hidden; overflow-y: scroll;' );
			$whatLinksHereHead =  $( '<h2>' ).text( $( '#t-whatlinkshere' ).text() );

			getWhatLinksHere( pageName )
			.done( function( $whatLinksHere ) {
				$whatLinksHere.appendTo( $whatLinksHereDiv );
			} );
		}

		getHistory( pageName )
		.done( function( $pageHistory ) {
			$pageHistory.appendTo( $historyDiv );
		} );

		$content
			.append( $historyHead )
			.append( $historyDiv );

		if ( hasWhatLinksHere ) {
			$content
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
					$pageHistory = $historyTree.find( 'ul.mw-contributions-list' );

				// Remove superfluous elements
				$pageHistory.find( 'input' ).remove();
				$pageHistory.find( '.mw-rollback-link' ).remove();
				$pageHistory.find( '.mw-history-undo' ).remove();
				$pageHistory.find( '.mw-thanks-thank-link' ).remove();

				// Remove FlaggedRevs stuff
				$pageHistory.find( '.fr-hist-basic-auto' ).remove();
				$pageHistory.find( '.fr-hist-basic-user' ).remove();
				$pageHistory.find( '.mw-fr-hist-difflink' ).remove();

				// Remove restore links (Wikidata)
				$pageHistory.find( 'a[href*="restore="]' ).remove();

				// Remove (now) empty mw-changeslist-links
				$pageHistory.find( 'span.mw-changeslist-links' ).each( function() {
					var $this = $( this );

					if ( $this.text() === '' ) {
						$this.remove();
					}
				} );

				// Remove the left over stuff after the last element in each history <li>.
				$pageHistory.find( 'li' ).each( function() {
					var $this = $( this ),
						html;

					if ( $this.children().length === 1 ) {
						// The whole history line is wrapped (FlaggedRevs does that).
						$this = $this.children();
					}

					html = $this.html();
					$this.html( html.replace( />[^>]+$/, '>' ) );
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

	mw.hook( 'wikipage.content' ).add( function( $content ) {
		mw.loader.using( [ 'mediawiki.util', 'mediawiki.interface.helpers.styles' ] )
			.done( function () {
				main( $content );
			} );
	} );

} )( mediaWiki, jQuery );
