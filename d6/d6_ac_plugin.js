(function($) {
    var AUTOCOMPLETE;
    var NAME = 'ac_product_browse';

    if(typeof window.AUTOCOMPLETE === 'undefined'){
        AUTOCOMPLETE = {
            'populatePopup' : {},
            'found' : {},
            'hidePopup' : {},
            'types' : []
        };
    }else{
        AUTOCOMPLETE = window.AUTOCOMPLETE;
    }

    AUTOCOMPLETE.types.push(NAME);

    /**
     * Implements the functions to populatePopup
     * @param jsac
     * @returns {{method: string, searchData: string}}
     */
    AUTOCOMPLETE.populatePopup[NAME] = function(jsac){
        var toReturn = {
            method : 'post',
            searchData : {
                searchString : jsac.input.value,
                itemType : jsac.input.id.replace('product_browse_', '')
            }
        };

        var curretValues = productBrowseBehaviors.getValues();
        toReturn.searchData = $.extend(toReturn.searchData, curretValues);

        var params;
        if(typeof jsac.paginatorParams === 'object'){
            params = jsac.paginatorParams;
            delete jsac.paginatorParams;
        }
        if(typeof params === 'object'){
            toReturn.searchData = $.extend(toReturn.searchData, params);
        }


        $(jsac.popup).css({
            marginTop: jsac.input.offsetHeight +'px',
            width: jsac.input.offsetWidth +'px'
        }).addClass(NAME + " autocomplete_list");
        $(jsac.popup).empty().append('<div style="margin: 0 auto;" class="loading-animation"></div>').show();

        return toReturn;
    };

    /**
     * Implements the functions to found
     * @param jsac
     * @param matches
     */
    AUTOCOMPLETE.found[NAME] = function(jsac, matches){
        // containers
        var ul = document.createElement('ul');
        var $container = $(jsac.popup);
        var $ulWrapper = $('<div id="' + NAME + '_list"></div>');

        // variables for paginator
        var actualPage = matches.properties.pageNumber;
        var totalPages = matches.properties.totalPages;
        var paginator = jsac.paginator(actualPage, totalPages);
        var totalHt = $(window).height() - $('.Footer').outerHeight();
        var popupHt = 0, availableHt = 0, scrollHt = 0, pagHt = 0;

        var documents = matches.documents || [] ;
        for(var i = 0, length = documents.length; i < length; i++){
            var li = document.createElement('li');
            var $li = $(li);
            $li.html('<div title="'+documents[i].name+'">'+ documents[i].name +'<span class="selectBtn">Select</span></div>');

            $li.mouseover(function () { jsac.highlight(this); });
            $li.mouseout(function () { jsac.unhighlight(this); });

            li.autocompleteKey = documents[i].key;
            li.autocompleteValue = documents[i].name;

            $(ul).append(li);
        }

        //insert UL in the container
        $ulWrapper.append(ul);

        // Show popup with matches, if any
        if (jsac.popup) {
            if (ul.childNodes.length > 0) { // if there are results
                $container.empty().append($ulWrapper).append(paginator).show(); //include popup content and paginator and show the popup

                popupHt = $container.outerHeight();  // Available height calculations
                availableHt = totalHt - $container.offset().top;
                pagHt = $container.find('.paginator').outerHeight();
                scrollHt = $container.height() - pagHt;
                if(totalHt < popupHt + $container.offset().top){
                    $container.height(availableHt - 10);
                    scrollHt = availableHt - pagHt - 10;
                }

                if(($container.height() - pagHt) < $ulWrapper.outerHeight()){ // insert scroll if it is need
                    $ulWrapper.slimScroll({
                        height: scrollHt,
                        alwaysVisible: false
                    });
                }
            }
            else {
                $(jsac.popup).css({visibility: 'hidden'});
                jsac.hidePopup();
            }
        }


    };

    AUTOCOMPLETE.hidePopup[NAME] = function (jsac, keycode) {
        // Select item if the right key or mousebutton was pressed
        if (jsac.selected && ((keycode && keycode != 46 && keycode != 8 && keycode != 27) || !keycode)) {
            var value = {
                type :  jsac.input.name.replace('product_browse_', ''),
                values : { name : jsac.selected.autocompleteValue , key : jsac.selected.autocompleteKey }
            };

            productBrowseBehaviors.selectValue(value);
        }
        // Hide popup
        var popup = jsac.popup;
        if (popup) {
            jsac.popup = null;
            $(popup).fadeOut('fast', function() { $(popup).remove(); });
        }
        jsac.selected = false;
    };

    window.AUTOCOMPLETE = AUTOCOMPLETE;

})(jQuery);
