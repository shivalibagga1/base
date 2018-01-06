require([
        'modules/jquery-mozu',
        'hyprlive',
        "hyprlivecontext",
        'underscore',
        'modules/api',
        'modules/backbone-mozu',
        'modules/models-product',
        'widgets/rti/recommended-products',
        'bxslider'
        //'vendor/jquery/jquery-ui'
    ],
    function($, Hypr, HyprLiveContext, _, api, Backbone, ProductModels, RecommendedProducts, bxslider) {

        // rtiOptions will contain variables used by the
        //whole page. They can be set in every widget editor, but only the first
        //one on the page is the one that we'll listen to for these variables.

        var firstDisplay = $('.recommended-product-container').first();
        var firstConfig = firstDisplay.data('mzRtiRecommendedProducts');

        var rtiOptions = {
            customerId: firstConfig.customerId || "",
            customerCode: firstConfig.customerCode || "",
            pageType: firstConfig.pageType || "",
            jsInject: firstConfig.javascriptInjection || "",
            includeSiteId: firstConfig.includeSiteId || false,
            includeTenantId: firstConfig.includeTenantId || false
        };

        var pageContext = require.mozuData('pagecontext');
        var siteContext = require.mozuData('sitecontext');

        /*
        containerList holds data about all of the widgets we're going to make.
        */
        var containerList = [];

        /*
        The following loop acts as cleanup; it populates containerList with the needed data,
        ignoring and delegitimizing any divs on the page with duplicate placeholder names.
        */
        $('.recommended-product-container').each(function() {
            if (!$(this).hasClass('ignore')) {
                var configData = $(this).data('mzRtiRecommendedProducts');
                //displayOptions are individual to each container.
                var displayOptions = {
                    title: configData.title || "",
                    quantity: configData.numberOfItems || "",
                    format: configData.displayType || "",
                    placeholder: configData.placeholder || ""
                };
                var container = { config: displayOptions };
                var selector = '.recommended-product-container.' + configData.placeholder;

                if ($(selector).length > 1) {
                    $(selector).each(function(index, element) {
                        if (index > 0) {
                            /*
                            We don't want to add the data from accidental duplicates to
                            our nice, clean containerList. We also don't want those duplicates to
                            accidentally render. So for all but the first element with this
                            class name, we strip all classes, add 'ignore' so the .each we're in
                            right now ignores the duplicates, hides the div, and adds a message
                            in edit mode so the user knows what happened.
                            */
                            $(element).removeClass();
                            $(element).addClass('ignore');
                            if (pageContext.isEditMode) {
                                $("<p>Error: duplicate placeholder name.</p>").insertBefore($(element));
                            }
                            $(element).hide();
                        }
                    });
                }
                containerList.push(container);
            }
        });

        /*Recommended Product Code Starts*/
        var eFlag = 0;
        var ProductModelColor = Backbone.MozuModel.extend({
            mozuType: 'products'
        });
        //***********************
        //---VIEW DEFINITIONS---//
        //************************

        //***Start Carousel view def:
        var ProductListView = Backbone.MozuView.extend({
            templateName: 'modules/product/rti-product-list'
        });
        //End Carousel view def***

        var getMozuProducts = function(rtiProductList) {

                var deferred = api.defer();
                var numReqs = rtiProductList.length;
                var productList = [];
                var filter = "";
                _.each(rtiProductList, function(attrs) {
                    if (filter !== "") filter += " or ";
                    filter += "productCode eq "+ attrs.ProductId;    
                });
                var op = api.get('products', filter);                
                op.then(function(data) {
                    _.each(data.data.items, function(product){
                         
                       var rtiProduct = _.findWhere(rtiProductList, {ProductId: product.productCode});
                       product.rtiRank = rtiProduct.rank||'';
                       product.slot = rtiProduct.slot||'';
                       product.widgetId = rtiProduct.widgetId||'';
                       product.href = rtiProduct.url||'';      
                       productList.push(product);
                       _.defer(function() {
                           deferred.resolve(productList);
                       });
                    });

                }, function(reason){
                    _.defer(function() {
                        deferred.resolve(productList);
                    });                    
                });
            return deferred.promise;
        };

        var renderData = function(data) {

            _.each(containerList, function(container) {

                var placeholder = container.config.placeholder;
                var numberOfItems = container.config.quantity;
                var configTitle = container.config.title;
                var format = container.config.format;
                if (pageContext.isEditMode) {
                    $('.recommended-product-container.' + placeholder).text('<b>Here Goes your RTI Recommended items</b>');
                    return;
                } 
                /*
                Our data will contain information about lots of different possible widgets.
                First we want to reduce that data to only the placeholderName we're dealing with.
                */
                var currentProducts = $.grep(data, function(e) {
                    return e.placeholderName == placeholder; });
                /*
                We should at this point have a list of results with the correct placeholderName,
                and that last should only be 1 item long.
                If that first item doesn't exist, there was a problem.
                */
                if (!currentProducts[0]) {
                    if (pageContext.isEditMode) {
                        /*
                        If we reach this point, it means there wasn't a placeholderName in the
                        data that was returned that matches the one we selected.
                        */
                        $('.recommended-product-container.' + placeholder).text("Placeholder not found.");
                    }
                } else {
                    //We have the data for our widget now. Time to fill it up.
                    var displayName;
                    //if configTitle has a value, the user entered a title to
                    //override the title set in RTI.
                    if (configTitle) {
                        displayName = configTitle;
                    } else {
                        //if configTitle has no value, we get the title from the
                        //product results call
                        displayName = currentProducts[0].displayName;
                    }

                    //We slice the productList we received according to the limit set
                    //in the editor
                    var productList;
                    if (currentProducts[0].productList.length > numberOfItems) {
                        productList = currentProducts[0].productList.slice(0, numberOfItems);
                    } else {
                        productList = currentProducts[0].productList;
                    }

                    //Turns list of product IDs into a product collection
                    getMozuProducts(productList).then(function(products) {
                        if (products.length !== 0) {
                            var productsByRank = _.sortBy(products, 'rtiRank');
                            productList = productsByRank;
                            var prodColl = new ProductModels.ProductCollection();
                            prodColl.set('items', productList);
                            prodColl.set('bnData', data.bnData);

                            //Time to actually render

                            if (currentProducts[0].editModeMessage) {
                                if (pageContext.isEditMode) {
                                    $('.recommended-product-container.' + placeholder).text(currentProducts[0].editModeMessage);
                                }
                            } else {
                                $("." + placeholder + ".slider-title").text(displayName);
                                if (!format) {
                                    format = "carousel";
                                }
                                if (format == "carousel") {
                                    var productListView = new ProductListView({
                                        el: $('.rti-recommended-products'),
                                        model: prodColl
                                    });
                                    productListView.render();
                                    if (productList.length > 1) {
                                        $('.rti-recommended-products .bxslider').bxSlider({
                                            minSlides: 2,
                                            maxSlides: 4,
                                            slideWidth: 270,
                                            slideMargin: 20,
                                            nextText: '<i class="fa fa-angle-right" aria-hidden="true"></i>',
                                            prevText: '<i class="fa fa-angle-left" aria-hidden="true"></i>',
                                            responsive: true,
                                            speed: 0,
                                            infiniteLoop: false,
                                            hideControlOnEnd: true
                                        });
                                    }
                                    if (productList.length === 0) {
                                        $('.recommended-product-container').hide();
                                    }
                                    return;

                                }
                            }
                        } else {
                            if (pageContext.isEditMode) {
                                $('.recommended-product-container.' + placeholder).text("There was a problem retrieving products from your catalog that match the products received from RTI.");
                            }
                        }
                    });
                }
            });
        };

        try {
            var productInstance = RecommendedProducts.getInstance(rtiOptions);
            productInstance.getProductData(function(data) {
                renderData(data);
            });
        } catch (err) {
            //console.log(err);
        }
        /*Recommended Product Code Ends*/

    });
