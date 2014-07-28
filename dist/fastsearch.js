;(function ($, window, document){

	"use strict";

	var $document = $(document),
		instanceNum = 0,
		isEnter = function(e){ return e.keyCode === 13; },
		isEscape = function(e){ return e.keyCode === 27; },
		isDownArrow = function(e){ return e.keyCode === 40; },
		isUpArrow = function(e){ return e.keyCode === 38; },
		isTouch = 'ontouchstart' in window || 'onmsgesturechange' in window;

	function Fastsearch(input, options){

		this.$input = $(input);
		this.options = $.extend(true, {}, $.fastsearch.defaults, options);
		this.init();

	}

	$.extend(Fastsearch.prototype, {

		init: function(){

			this.$el = this.$input.closest( this.options.wrapSelector );

			this.url = this.$el.data('url') || this.options.url || this.$el.attr('action');
			this.noResultsText = this.$el.data('no-results-text') || this.options.noResultsText;
			this.inputIdName = this.$el.data('input-id-name') || this.options.inputIdName;
			this.apiInputName = this.$el.data('api-input-name') || this.options.apiInputName;
			this.query = null;
			this.hasResults = false;
			this.elIsForm = this.$el.is('form');
			this.ens = '.fastsearch' + (++instanceNum); // event namespace
			this.resultsOpened = false;
			this.itemSelector = '.' + this.options.itemClass.replace(' ', '.');

			this.events();

		},

		events: function(){

			var self = this;

			this.$input.on('keyup'+ this.ens +' focus'+ this.ens +' click' + this.ens, function(e){

				if ( !isEnter(e) ) { self.handleTyping(); }

			}).on('keydown' + this.ens, function(e){

				if (isEnter(e) && self.options.preventSubmit) { e.preventDefault(); }

				if ( !self.hasResults || !self.resultsOpened ) { return; }

				if      ( isDownArrow(e) ) { e.preventDefault(); self.navigateDown(e); }
				else if ( isUpArrow(e) )   { e.preventDefault(); self.navigateUp(e); }
				else if ( isEnter(e) )     { self.onEnter(e); }

			});

			this.$el.on('click' + this.ens, this.itemSelector, function(e){

				e.preventDefault();
				self.handleItemSelect( $(this) );

			});

			if (!isTouch){

				this.$el.on('mouseenter' + this.ens, this.itemSelector, function(){

					self.$input.focus();
					self.$resultsCont.find('.focused').removeClass('focused');
					$(this).addClass('focused');

				}).on('mouseleave' + this.ens, this.itemSelector, function(){

					$(this).removeClass('focused');

				});

			}

		},

		handleTyping: function(){

			var val = $.trim(this.$input.val()),
				self = this;

			if ( val.length < this.options.minQueryLength ) { this.hideResults(); return; }
			if ( val == this.query ) { this.showResults(); return; }

			clearTimeout( this.keyupTimeout );

			this.$el.addClass( this.options.loadingClass );

			this.keyupTimeout = setTimeout(function(){

				self.query = val;
				self.getResults();

			}, this.options.typeTimeout);

		},

		getResults: function(){

			var self = this,
				params = this.elIsForm ? this.$el.serializeArray() : this.$el.find('input, textarea, select').serializeArray();

			if (this.apiInputName) {
				params.push({'name': this.apiInputName, 'value': this.$input.val()});
			}

			$.get( this.url, params, function(data){

				self.showResults( self.generateResults( data ) );
				self.hasResults = data.length !== 0;

			});

		},

		generateResults: function(data){

			var $allResults = $('<div>');

			this.itemModels = [];

			if (this.options.template) {
				return $(this.options.template(data, this));
			}

			if (data.length === 0) {

				var text = typeof this.noResultsText === 'function' ? this.noResultsText.call(this) : this.noResultsText;
				$allResults.html( '<p class="'+ this.options.noResultsClass +'">'+ text +'</p>' );

			} else {

				if (this.options.responseType === 'html') {
					$allResults.html(data);
				} else {
					data[0][this.options.responseFormat.groupItems] ? this.generateGroupedResults(data, $allResults) : this.generateSimpleResults(data, $allResults);
				}

			}

			if ( this.options.onResultsCreate ){ this.options.onResultsCreate.call(this, $allResults, data); }

			return $allResults.html();

		},

		generateSimpleResults: function(data, $cont){

			var self = this;

			$.each(data, function(i,item){
				$cont.append(self.generateItem(item));
			});

		},

		generateGroupedResults: function(data, $cont){

			var self = this,
				format = this.options.responseFormat;

			$.each(data, function(i,groupData){

				var $group = $('<div class="'+ self.options.groupClass +'">').appendTo($cont);
				if ( groupData[format.groupCaption] ) {	$group.append( '<h3 class="'+ self.options.groupTitleClass +'">'+ groupData[format.groupCaption] + '</h3>' ); }

				$.each(groupData.items, function(i,item){

					$group.append( self.generateItem( item ) );

				});

				if ( self.options.onGroupCreate ){ self.options.onGroupCreate.call(self, $group, groupData); }

			});

		},

		generateItem: function( item ){

			var format = this.options.responseFormat,
				url = item[format.url],
				$tag = $('<'+ (url ? 'a' : 'span') +'>').html( item[format.html] ? item[format.html] : item[format.label] ).addClass( this.options.itemClass );

			this.itemModels.push(item);

			if (url) { $tag.attr('href', url); }

			if ( this.options.onItemCreate ){ this.options.onItemCreate.call(this, $tag, item); }

			return $tag;

		},

		showResults: function( $content ){

			if ( !$content && this.resultsOpened ) { return; }

			this.$el.removeClass( this.options.loadingClass ).addClass( this.options.resultsOpenedClass );

			this.$resultsCont = this.$resultsCont || $('<div class="'+ this.options.resultsContClass +'">').appendTo( this.$el );

			if ( $content ) {
				this.$resultsCont.html( $content );
				this.$resultItems = this.$resultsCont.find( this.itemSelector );
			}

			if ( !this.resultsOpened ) { this.documentCancelEvents( 'on' ); this.$input.trigger('openingResults'); }
			this.resultsOpened = true;

		},

		documentCancelEvents: function( setup ){

			var self = this;

			if ( setup === 'off' && this.closeEventsSetuped ) { $document.off(this.ens); this.closeEventsSetuped = false; return; }
			if ( this.closeEventsSetuped ) { return; }

			$document.on('click'+ this.ens +' keyup' + this.ens, function(e){

				if (isEscape(e)) { self.hideResults(); return; }
				if(!$(e.target).parents().is(self.$el)) { self.hideResults(); }

			});

			this.closeEventsSetuped = true;

		},

		navigateDown: function(){

			var $currentItem = this.$resultItems.filter('.focused');

			// No item selected
			if ( $currentItem.length === 0 ) { this.$resultItems.eq(0).addClass('focused'); return; }

			// Select next
			var $nextItem = this.$resultItems.eq( this.$resultItems.index( $currentItem ) + 1 );
			if ( $nextItem.length ) { $currentItem.removeClass('focused'); $nextItem.addClass('focused'); }

			// Last to first
			else { $currentItem.removeClass('focused'); this.$resultItems.eq(0).addClass('focused'); }

		},

		navigateUp: function(){

			var $currentItem = this.$resultItems.filter('.focused');

			// No item selected
			if ( $currentItem.length === 0 ) { this.$resultItems.last().addClass('focused'); return; }

			// Select prev
			var $prevItem = this.$resultItems.eq( this.$resultItems.index($currentItem) - 1 );
			if ( $prevItem.length ) { $currentItem.removeClass('focused'); $prevItem.addClass('focused'); }

			// First to last
			else { $currentItem.removeClass('focused'); this.$resultItems.last().addClass('focused'); }

		},

		onEnter: function( e ){

			var $currentItem = this.$resultItems.filter('.focused');

			if ( $currentItem.length ) {
				e.preventDefault();
				this.handleItemSelect( $currentItem );
			}

		},

		handleItemSelect: function( $item ){

			var selectOption = this.options.onItemSelect,
				model = (this.itemModels.length && this.itemModels[ this.$resultItems.index($item) ]) || {},
				format = this.options.responseFormat;

			this.$input.trigger('itemSelected');

			if ( selectOption === 'fillInput' ) {

				this.query = model[format.label];
				this.$input.val(model[format.label]);

				if (model.id) {

					if ( !this.$inputId ) {

						var inputIdName = this.inputIdName || this.$input.attr('name') + '_id';

						this.$inputId = this.$el.find('input[name="'+ inputIdName + '"]');
						if ( !this.$inputId.length ) { this.$inputId = $('<input type="hidden" />').attr('name', inputIdName).appendTo( this.$el ); }

					}

					this.$inputId.val(model.id);

				}

				this.hideResults();

			}
			else if ( selectOption === 'follow' ) { window.location.href = $item.attr('href'); }
			else if ( typeof selectOption === 'function' ){ selectOption.call(this, $item, model, this); }

		},

		hideResults: function(){

			if ( !this.resultsOpened) { return; }

			this.$el.removeClass( this.options.resultsOpenedClass );
			this.resultsOpened = false;
			this.$input.trigger('closingResults');
			this.documentCancelEvents( 'off' );
			return this;

		},

		clear: function(){

			this.hideResults();
			this.$input.val('').trigger('change');

		},

		destroy: function(){

			$document.off(this.ens);
			this.$input.off(this.ens);
			this.$el.off(this.ens).removeClass( this.options.resultsOpenedClass ).removeClass( this.options.loadingClass );
			if (this.$resultsCont) { this.$resultsCont.remove(); }

			delete this.$el.data().fastsearch;

		}

	});

	$.fastsearch = Fastsearch;

	$.fastsearch.defaults = {
		'url': null,
		'wrapSelector': 'form',
		'responseType': 'JSON',
		'preventSubmit': false,

		'resultsContClass': 'fs_results',
		'resultsOpenedClass': 'fsr_opened',
		'groupClass': 'fs_group',
		'itemClass': 'fs_result_item',
		'groupTitleClass': 'fs_group_title',
		'loadingClass': 'loading',
		'noResultsClass': 'fs_no_results',

		'typeTimeout': 140,
		'minQueryLength': 2,

		'template': null,

		'responseFormat': {
			'url': 'url',
			'html': 'html',
			'label': 'label',
			'groupCaption': 'caption',
			'groupItems': 'items'
		},

		'inputIdName': null,
		'apiInputName': null,

		'noResultsText': 'No results found',
		'onItemSelect': 'follow',

		'onResultsCreate': null,
		'onGroupCreate': null,
		'onItemCreate': null
	};

	$.fn.fastsearch = function ( options ) {
		return this.each(function () {
			if (!$.data(this, 'fastsearch')) {
				$.data(this, 'fastsearch', new Fastsearch(this, options));
			}
		});
	};

})(window.jQuery || window.Zepto, window, document);