#Fastsearch
Lightweight fast search / autocomplete plugin based on jQuery

##Basic usage
```javascript

$('input.fastsearch').fastsearch();

$('input.fastsearch').fastsearch({
	'noResultsText': 'No results found',
	'onItemCreate': function($item, model, fastsearchApi){
		$item.append(model.subtitle);
	}
});

```
##Defaults / options
```javascript
$.fastsearch.defaults = {
    wrapSelector: 'form', // fastsearch container defaults to closest form. Provide selector for something other
    url: null, // plugin will get data from data-url propery, url option or container action attribute
    responseType: 'JSON', // default expected server response type - can be set to html if that is what server returns
    preventSubmit: false, // prevent submit of form with enter keypress

    resultsContClass: 'fs_results', // html classes
    resultsOpenedClass: 'fsr_opened',
    resultsFlippedClass: 'fsr_flipped',
    groupClass: 'fs_group',
    itemClass: 'fs_result_item',
    groupTitleClass: 'fs_group_title',
    loadingClass: 'loading',
    noResultsClass: 'fs_no_results',
    focusedItemClass: 'focused',

    typeTimeout: 140, // try not to hammer server with request for each keystroke if possible
    minQueryLength: 2, // minimal number of characters needed for plugin to send request to server

    template: null, // provide your template function if you need one - function(data, fastsearchApi)
    mouseEvents: !('ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0), // detect if client is touch enabled so plugin can decide if mouse specific events should be set.
    focusFirstItem: false,
    flipOnBottom: false,

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
```

