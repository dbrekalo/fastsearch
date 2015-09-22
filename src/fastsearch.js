;(function($, window, document) {

    var $document = $(document),
        instanceNum = 0,
        keyMap = {
            13: 'enter',
            27: 'escape',
            40: 'downArrow',
            38: 'upArrow'
        };

    function Fastsearch(input, options) {

        this.$input = $(input);
        this.options = $.extend(true, {}, Fastsearch.defaults, options);
        this.init();

    }

    $.extend(Fastsearch.prototype, {

        init: function() {

            this.$el = this.$input.closest(this.options.wrapSelector);

            var data = this.$el.data(),
                options = this.options;

            $.extend(options, {
                url: data.url || options.url || this.$el.attr('action'),
                onItemSelect: data.onItemSelect || options.onItemSelect,
                noResultsText: data.noResultsText || options.noResultsText,
                inputIdName: data.inputIdName || options.inputIdName,
                apiInputName: data.apiInputName || options.apiInputName
            });

            this.ens = '.fastsearch' + (++instanceNum);
            this.itemSelector = '.' + options.itemClass.replace(/\s/g, '.');
            this.focusedItemSelector = '.' + options.focusedItemClass.replace(/\s/g, '.');

            this.events();

        },

        events: function() {

            var self = this,
                options = this.options;

            this.$input.on('keyup focus click '.replace(/\s/g, this.ens + ' '), function(e) {

                keyMap[e.keyCode] !== 'enter' && self.handleTyping();

            }).on('keydown' + this.ens, function(e) {

                keyMap[e.keyCode] === 'enter' && options.preventSubmit && e.preventDefault();

                if (self.hasResults && self.resultsOpened) {

                    switch (keyMap[e.keyCode]) {
                        case 'downArrow': e.preventDefault(); self.navigateItem('down'); break;
                        case 'upArrow': e.preventDefault(); self.navigateItem('up'); break;
                        case 'enter': self.onEnter(e); break;
                    }

                }

            });

            this.$el.on('click' + this.ens, this.itemSelector, function(e) {

                e.preventDefault();
                self.handleItemSelect($(this));

            });

            !options.isTouch && this.$el.on('mouseleave' + this.ens, this.itemSelector, function(e) {

                $(this).removeClass(options.focusedItemClass);

            }).on('mouseenter' + this.ens, this.itemSelector, function(e) {

                self.$resultItems.removeClass(options.focusedItemClass);
                $(this).addClass(options.focusedItemClass);

            });

        },

        handleTyping: function() {

            var inputValue = $.trim(this.$input.val()),
                self = this;

            if (inputValue.length < this.options.minQueryLength) {

                this.hideResults();
                return;

            }

            if (inputValue === this.query) {

                this.showResults();
                return;

            }

            this.$el.addClass(this.options.loadingClass);

            clearTimeout(this.keyupTimeout);

            this.keyupTimeout = setTimeout(function() {

                self.query = inputValue;
                self.getResults();

            }, this.options.typeTimeout);

        },

        getResults: function() {

            var self = this,
                formValues = this.$el.find('input, textarea, select').serializeArray();

            if (this.options.apiInputName) {
                formValues.push({'name': this.apiInputName, 'value': this.$input.val()});
            }

            $.get(this.options.url, formValues, function(data) {

                if (self.options.parseResponse) {
                    data = self.options.parseResponse.call(this, data, this);
                }

                self.showResults(self.generateResults(data), data);
                self.hasResults = data.length !== 0;

            });

        },

        generateResults: function(data) {

            var $allResults = $('<div>'),
                options = this.options;

            this.itemModels = [];

            if (options.template) {
                return $(options.template(data, this));
            }

            if (data.length === 0) {

                $allResults.html(
                    '<p class="' + options.noResultsClass + '">' +
                        (typeof options.noResultsText === 'function' ? options.noResultsText.call(this) : options.noResultsText) +
                    '</p>'
                );

            } else {

                if (this.options.responseType === 'html') {

                    $allResults.html(data);

                } else {

                    this['generate' + (data[0][options.responseFormat.groupItems] ? 'GroupedResults' : 'SimpleResults')](data, $allResults);

                }

            }

            return $allResults.html();

        },

        generateSimpleResults: function(data, $cont) {

            var self = this;

            $.each(data, function(i, item) {
                $cont.append(self.generateItem(item));
            });

        },

        generateGroupedResults: function(data, $cont) {

            var self = this,
                options = this.options,
                format = options.responseFormat;

            $.each(data, function(i, groupData) {

                var $group = $('<div class="' + options.groupClass + '">').appendTo($cont);

                if (groupData[format.groupCaption]) {

                    $group.append(
                        '<h3 class="' + options.groupTitleClass + '">' + groupData[format.groupCaption] + '</h3>'
                    );

                }

                $.each(groupData.items, function(i, item) {

                    $group.append(self.generateItem(item));

                });

                options.onGroupCreate && options.onGroupCreate.call(self, $group, groupData, this);

            });

        },

        generateItem: function(item) {

            var options = this.options,
                format = options.responseFormat,
                url = item[format.url],
                html = item[format.html] || item[format.label],
                $tag = $('<' + (url ? 'a' : 'span') + '>').html(html).addClass(options.itemClass);

            this.itemModels.push(item);

            url && $tag.attr('href', url);

            options.onItemCreate && options.onItemCreate.call(this, $tag, item, this);

            return $tag;

        },

        showResults: function($content, data) {

            if (!$content && this.resultsOpened) {
                return;
            }

            this.$el.removeClass(this.options.loadingClass).addClass(this.options.resultsOpenedClass);

            this.$resultsCont = this.$resultsCont || $('<div>').addClass(this.options.resultsContClass).appendTo(this.$el);

            if ($content) {

                this.$resultsCont.html($content);
                this.$resultItems = this.$resultsCont.find(this.itemSelector);
                this.options.onResultsCreate && this.options.onResultsCreate.call(this, this.$resultsCont, data, this);

            }

            if (!this.resultsOpened) {

                this.documentCancelEvents('on');
                this.$input.trigger('openingResults');

            }

            this.resultsOpened = true;

        },

        documentCancelEvents: function(setup) {

            var self = this;

            if (setup === 'off' && this.closeEventsSetuped) {

                $document.off(this.ens);
                this.closeEventsSetuped = false;
                return;

            } else if (setup === 'on' && !this.closeEventsSetuped) {

                $document.on('click' + this.ens + ' keyup' + this.ens, function(e) {

                    if (keyMap[e.keyCode] === 'escape' || (!$(e.target).is(self.$el) && !$.contains(self.$el.get(0), e.target))) {

                        self.hideResults();
                        return;

                    }

                });

                this.closeEventsSetuped = true;

            }

        },

        navigateItem: function(direction) {

            var $currentItem = this.$resultItems.filter(this.focusedItemSelector),
                maxPosition = this.$resultItems.length - 1;

            if ($currentItem.length === 0) {

                this.$resultItems.eq(direction === 'up' ? maxPosition : 0).addClass(this.options.focusedItemClass);
                return;

            }

            var currentPosition = this.$resultItems.index($currentItem),
                nextPosition = direction === 'up' ? currentPosition - 1 : currentPosition + 1;

            nextPosition > maxPosition && (nextPosition = 0);
            nextPosition < 0 && (nextPosition = maxPosition);

            $currentItem.removeClass(this.options.focusedItemClass);

            this.$resultItems.eq(nextPosition).addClass(this.options.focusedItemClass);

        },

        navigateDown: function() {

            this.navigateItem('down');

        },

        navigateUp: function() {

            this.navigateItem('up');

        },

        onEnter: function(e) {

            var $currentItem = this.$resultItems.filter(this.focusedItemSelector);

            if ($currentItem.length) {
                e.preventDefault();
                this.handleItemSelect($currentItem);
            }

        },

        handleItemSelect: function($item) {

            var selectOption = this.options.onItemSelect,
                model = this.itemModels.length ? this.itemModels[this.$resultItems.index($item)] : {},
                format = this.options.responseFormat;

            this.$input.trigger('itemSelected');

            if (selectOption === 'fillInput') {

                this.query = model[format.label];
                this.$input.val(model[format.label]).trigger('change');

                if (this.options.fillInputId && model.id) {

                    if (!this.$inputId) {

                        var inputIdName = this.options.inputIdName || this.$input.attr('name') + '_id';

                        this.$inputId = this.$el.find('input[name="' + inputIdName + '"]');

                        if (!this.$inputId.length) {
                            this.$inputId = $('<input type="hidden" name="' + inputIdName + '" />').appendTo(this.$el);
                        }

                    }

                    this.$inputId.val(model.id).trigger('change');

                }

                this.hideResults();

            } else if (selectOption === 'follow') {

                window.location.href = $item.attr('href');

            } else if (typeof selectOption === 'function') {

                selectOption.call(this, $item, model, this);

            }

        },

        hideResults: function() {

            if (this.resultsOpened) {

                this.resultsOpened = false;
                this.$el.removeClass(this.options.resultsOpenedClass);
                this.$input.trigger('closingResults');
                this.documentCancelEvents('off');

            }

            return this;

        },

        clear: function() {

            this.hideResults();
            this.$input.val('').trigger('change');

            return this;

        },

        destroy: function() {

            $document.off(this.ens);

            this.$input.off(this.ens);

            this.$el.off(this.ens)
                .removeClass(this.options.resultsOpenedClass)
                .removeClass(this.options.loadingClass);

            if (this.$resultsCont) {

                this.$resultsCont.remove();
                delete this.$resultsCont;

            }

            delete this.$el.data().fastsearch;

        }

    });

    Fastsearch.defaults = {
        wrapSelector: 'form', // fastsearch container defaults to closest form. Provide selector for something other
        url: null, // plugin will get data from data-url propery, url option or container action attribute
        responseType: 'JSON', // default expected server response type - can be set to html if that is what server returns
        preventSubmit: false, // prevent submit of form with enter keypress

        resultsContClass: 'fs_results', // html classes
        resultsOpenedClass: 'fsr_opened',
        groupClass: 'fs_group',
        itemClass: 'fs_result_item',
        groupTitleClass: 'fs_group_title',
        loadingClass: 'loading',
        noResultsClass: 'fs_no_results',
        focusedItemClass: 'focused',

        typeTimeout: 140, // try not to hammer server with request for each keystroke if possible
        minQueryLength: 2, // minimal number of characters needed for plugin to send request to server

        template: null, // provide your template function if you need one - function(data, fastsearchApi)

        isTouch: 'ontouchstart' in window || 'onmsgesturechange' in window, // detect if client is touch enabled so plugin can decide if mouse specific events should be set.

        responseFormat: { // Adjust where plugin looks for data in your JSON server response
            url: 'url',
            html: 'html',
            label: 'label',
            groupCaption: 'caption',
            groupItems: 'items'
        },

        fillInputId: true, // on item select plugin will try to write selected id from item data model to input
        inputIdName: null, // on item select plugin will try to write selected id from item data model to input with this name

        apiInputName: null, // by default plugin will post input name as query parameter - you can provide custom one here

        noResultsText: 'No results found',
        onItemSelect: 'follow', // by default plugin follows selected link - other options available are "fillInput" and custom callback - function($item, model, fastsearchApi)

        parseResponse: null, // parse server response with your handler and return processed data - function(response, fastsearchApi)
        onResultsCreate: null, // adjust results element - function($allResults, data, fastsearchApi)
        onGroupCreate: null, // adjust group element when created - function($group, groupModel, fastsearchApi)
        onItemCreate: null // adjust item element when created - function($item, model, fastsearchApi)
    };

    $.fastsearch = Fastsearch;

    $.fn.fastsearch = function(options) {
        return this.each(function() {
            if (!$.data(this, 'fastsearch')) {
                $.data(this, 'fastsearch', new Fastsearch(this, options));
            }
        });
    };

})(window.jQuery || window.Zepto, window, document);
