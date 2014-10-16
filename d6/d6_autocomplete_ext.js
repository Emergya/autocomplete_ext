(function ($) {
    if (Drupal.jsAC !== 'undefined') {

        Drupal.behaviors.autocomplete = function (context) {
            var acdb = [];
            $('input.autocomplete:not(.autocomplete-processed)', context).each(function () {
                var uri = this.value;
                if (!acdb[uri]) {
                    acdb[uri] = new Drupal.ACDB(uri);
                }
                //Check we are using an autofill autocomplete
                var fieldId = this.id.substr(0, this.id.length - 13);

                var input = $('input[id=' + fieldId + ']').attr('autocomplete', 'OFF')[0];

                $(input.form).submit(Drupal.autocompleteSubmit);

                new Drupal.jsAC(input, acdb[uri]);
                $(this).addClass('autocomplete-processed');
            });
        };

        //var to keep all previous jsAC prototypes before change the constructor
        var oldPrototypes = Drupal.jsAC.prototype;

        /**
         * An AutoComplete object
         */
        Drupal.jsAC = function (input, db) {

            var ac = this;
            var $input = $(input);
            var foundCase = false;

            this.input = input;
            this.db = db;
            this.acType = 'default';


            if (typeof AUTOCOMPLETE === 'object') {
                if (typeof AUTOCOMPLETE.types === 'object') {
                    $.each(AUTOCOMPLETE.types, function (key, value) {
                        if ($input.hasClass(value) && !foundCase) {
                            ac.acType = value;
                            foundCase = true;
                        }
                    });
                }

            }

            $input
                .keydown(function (event) {
                    return ac.onkeydown(this, event);
                })
                .keyup(function (event) {
                    ac.onkeyup(this, event);
                })
                .blur(function () {
                    // On IE, if we click on the scrollbar, blur event is fired.
                    // https://drupal.org/node/913418
                    if (ac.selected === false && document.activeElement.id == "autocomplete") {
                        input.focus();
                    } else {
                        ac.hidePopup();
                        ac.db.cancel();
                    }
                })
                .bind('paste', function (event) {
                    return ac.onpaste(this, event);
                });

        };
        //Restore old prototypes
        Drupal.jsAC.prototype = oldPrototypes;


        /**
         * Positions the suggestions popup and starts a search
         */
        Drupal.jsAC.prototype.populatePopup = function () {
            // Show popup
            if (this.popup) {
                $(this.popup).remove();
            }
            this.selected = false;
            this.popup = document.createElement('div');
            this.popup.id = 'autocomplete';
            this.popup.owner = this;

            var searchString = this.input.value;
            var method = 'get';
            var $input = $(this.input);
            var searchData = searchString;
            $input.before(this.popup);

            // Do search
            this.db.owner = this;


            var foundCase = typeof AUTOCOMPLETE === 'object'
                && typeof AUTOCOMPLETE.populatePopup === 'object'
                && typeof AUTOCOMPLETE.populatePopup[this.acType] === 'function';

            if (foundCase) {
                var result = AUTOCOMPLETE.populatePopup[this.acType](this);
                searchData = result.searchData;
                method = result.method;
            }else{//Use default autocomplete case
                $(this.popup).css({
                    marginTop: this.input.offsetHeight + 'px',
                    width: (this.input.offsetWidth - 4) + 'px'
                });

            }

            this.db.search(searchData, method);
        };

        /**
         * Fills the suggestion popup with any matches received
         */
        Drupal.jsAC.prototype.found = function (matches) {
            // If no value in the textfield, do not show the popup.
            if (!this.input.value.length) {
                return false;
            }

            var $input = $(this.input);

            var foundCase = typeof AUTOCOMPLETE === 'object'
                && typeof AUTOCOMPLETE.found === 'object'
                && typeof AUTOCOMPLETE.found[this.acType] === 'function';


            if (foundCase){
                AUTOCOMPLETE.found[this.acType](this, matches);
            }else{
                //Use default autocomplete case
                // Prepare matches
                var ul = document.createElement('ul');
                var ac = this;
                for (key in matches) {
                    var li = document.createElement('li');
                    $(li)
                        .html('<div>' + matches[key] + '</div>')
                        .mousedown(function () { ac.select(this); })
                        .mouseover(function () { ac.highlight(this); })
                        .mouseout(function () { ac.unhighlight(this); });
                    li.autocompleteValue = key;
                    $(ul).append(li);
                }

                // Show popup with matches, if any
                if (this.popup) {
                    if (ul.childNodes.length > 0) {
                        $(this.popup).empty().append(ul).show();
                    }
                    else {
                        $(this.popup).css({visibility: 'hidden'});
                        this.hidePopup();
                    }
                }
            }
            this.input.focus();
        };


        /**
         * Hides the autocomplete suggestions
         */
        Drupal.jsAC.prototype.hidePopup = function (keycode) {

            var foundCase = typeof AUTOCOMPLETE === 'object'
                && typeof AUTOCOMPLETE.hidePopup === 'object'
                && typeof AUTOCOMPLETE.hidePopup[this.acType] === 'function';

            if(foundCase){
                AUTOCOMPLETE.hidePopup[this.acType](this, keycode);
            } else { //Use default autocomplete case
                // Select item if the right key or mousebutton was pressed
                if (this.selected && ((keycode && keycode != 46 && keycode != 8 && keycode != 27) || !keycode)) {
                    this.input.value = this.selected.autocompleteValue;
                    $(this.input).trigger('autocomplete_select');
                }
                // Hide popup
                var popup = this.popup;
                if (popup) {
                    this.popup = null;
                    $(popup).fadeOut('fast', function () {
                        $(popup).remove();
                    });
                }
                this.selected = false;
            }

        };


        /**
         * Pagination plugin...
         */
        Drupal.jsAC.prototype.paginator = function (actualPage, totalPages) {

            var jsac = this;

            var _executePopulatePopup = function(pageNumber, itemsPerPage, jsac) {
                var params = {
                    pageNumber : pageNumber,
                    itemsPerPage : itemsPerPage
                };
                setTimeout(function () {
                    jsac.paginatorParams = params;
                    jsac.populatePopup();
                }, 10);

            };

            // Total pages shown (apart of first and last if in middle case)
            var maxPagesShown = 5;

            actualPage = parseInt(actualPage);
            totalPages = parseInt(totalPages);
            if (totalPages == 1) {
                return;
            }

            if (maxPagesShown > totalPages) {
                maxPagesShown = totalPages;
            }

            // Beginin of paginator case
            if (actualPage <= maxPagesShown) {
                var ini = '';
                var mid = Math.ceil(maxPagesShown / 2);
                if (totalPages > maxPagesShown) {
                    var end = totalPages;
                }
                else {
                    var end = '';
                }
            }
            // End of paginator case
            else if (actualPage > (totalPages - maxPagesShown)) {
                var ini = 1;
                var mid = totalPages - Math.ceil(maxPagesShown / 2);
                var end = '';
            }
            // Middle case
            else {
                var ini = 1;
                var mid = actualPage;
                var end = totalPages;
            }


            var div = document.createElement('div');

            $(div).attr('class', 'paginator');

            // Case we have link to first page
            if (ini != '') {
                var a = document.createElement('a');
                $(a)
                    .html(ini)
                    .attr('href', 'javascript://')
                    .attr('id', 'pag-' + ini)
                    .mousedown(function () {
                        _executePopulatePopup(ini, 10, jsac);
                    });
                $(div).append(a);
                $(div).append('<span class="dot">&hellip;</span>');
            }

            var xini = (mid - Math.ceil(maxPagesShown / 2)) + 1;
            var xend = (mid + Math.ceil(maxPagesShown / 2));

            for (var x = xini; x <= xend; x++) {
                var a = document.createElement('a');
                if (x == actualPage) {
                    $(a).attr('class', 'active');
                }
                $(a)
                    .html(x)
                    .attr('id', 'pag-' + x)
                    .attr('href', 'javascript://')
                    .mousedown(function () {
                        var param = parseInt($(this).text());
                        _executePopulatePopup(param, 10, jsac);
                    });
                $(div).append(a);
            }

            // Case we have link to last page
            if (end != '') {
                $(div).append('<span class="dot">&hellip;</span>');
                var a = document.createElement('a');
                $(a)
                    .html(end)
                    .attr('id', 'pag-' + end)
                    .attr('href', 'javascript://')
                    .mousedown(function () {
                        _executePopulatePopup(end, 10, jsac);
                    });
                $(div).append(a);
            }

            return div;
        }


        ////////////////////////////////////


        /**
         * redefine Drupal.ACDB.prototype.search to allow use get as well as post
         * @param data
         * @param method
         */
        Drupal.ACDB.prototype.search = function (data, method) {

            method = method || 'get';

            if (method === 'get') {
                if (typeof data !== 'string') {
                    data = data.searchString;
                }
                this._searchByGet(data);
            } else {
                this._searchByPost(data);
            }

        };


        Drupal.ACDB.prototype._searchByGet = function (searchString) {

            var db = this;
            this.searchString = searchString;

            // See if this key has been searched for before
            if (this.cache[searchString]) {
                return this.owner.found(this.cache[searchString]);
            }

            // Initiate delayed search
            if (this.timer) {
                clearTimeout(this.timer);
            }
            this.timer = setTimeout(function () {
                db.owner.setStatus('begin');

                // Ajax GET request for autocompletion
                $.ajax({
                    type: "GET",
                    url: db.uri + '/' + Drupal.encodeURIComponent(searchString),
                    dataType: 'json',
                    success: function (matches) {
                        if (typeof matches['status'] == 'undefined' || matches['status'] != 0) {
                            db.cache[searchString] = matches;
                            // Verify if these are still the matches the user wants to see
                            if (db.searchString == searchString) {
                                db.owner.found(matches);
                            }
                            db.owner.setStatus('found');
                        }
                    },
                    error: function (xmlhttp) {
                        //alert(Drupal.ahahError(xmlhttp, db.uri));
                    }
                });
            }, this.delay);
        };


        Drupal.ACDB.prototype._searchByPost = function (data) {

            //use it to allow cache on post multivalues mode
            var dataHash = $.base64.encode(JSON.stringify(data));
            var db = this;

            var searchString;

            if (typeof data === 'string') {
                searchString = data;
            } else if (typeof data === 'object') {
                if (data.searchData !== 'undefined') {
                    searchString = data.searchString;
                }
            }

            this.searchString = searchString;

            // See if this key has been searched for before
            if (this.cache[dataHash]) {
                return this.owner.found(this.cache[dataHash]);
            }

            // Initiate delayed search
            if (this.timer) {
                clearTimeout(this.timer);
            }
            this.timer = setTimeout(function () {
                db.owner.setStatus('begin');

                // Ajax GET request for autocompletion
                $.ajax({
                    type: "POST",
                    url: db.uri,
                    data: data,
                    dataType: 'json',
                    success: function (matches) {
                        if (typeof matches['status'] == 'undefined' || matches['status'] != 0) {
                            db.cache[dataHash] = matches;
                            // Verify if these are still the matches the user wants to see
                            if (db.searchString == searchString) {
                                db.owner.found(matches);
                            }
                            db.owner.setStatus('found');
                        }
                    },
                    error: function (xmlhttp) {
                        //alert(Drupal.ahahError(xmlhttp, db.uri));
                    }
                });
            }, this.delay);
        };
    }
})(jQuery);

