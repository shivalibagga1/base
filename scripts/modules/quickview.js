define([
        'modules/jquery-mozu',
        'underscore',
        'hyprlive',
        'hyprlivecontext',
        'modules/models-product',
        'modules/cart-monitor',
        'modules/api',
        'modules/backbone-mozu',
        'modules/block-ui',
        "bxslider",
        "modules/views-productimages",
        "elevatezoom",
        "modules/color-swatches",
        'modules/common-functions'
    ],
    function($, _, Hypr, hyprlivecontext, ProductModels, CartMonitor, api, Backbone, blockUiLoader, bxslider, ProductImageViews, elevatezoom, colorSwatch, CommonFunctions) {

        var sitecontext = hyprlivecontext.locals.siteContext;
        var cdn = sitecontext.cdnPrefix;
        var siteID = cdn.substring(cdn.lastIndexOf('-') + 1);
        var imagefilepath = cdn + '/cms/' + siteID + '/files';

        var QuickviewSlider = function() {
            var self = this;
            this.init = function(el) {
                self.bindListeners.call(el, true);
            };
            this.bindListeners = function(on) {
                $('#quickViewModal').modal('show').on('hidden.bs.modal', function(e) {
                    $('.zoomContainer').remove();
                    $('#zoom').removeData('elevateZoom');
                });
                var $tabContent = $(".tab_content");
                var $ulLi = $("ul.tabs li");
                $tabContent.hide();
                $(".tab_content:first").show();
                $ulLi.click(function() {
                    $tabContent.hide();
                    var activeTab = $(this).attr("rel");
                    $("#" + activeTab).fadeIn();
                    $ulLi.removeClass("active");
                    $(this).addClass("active");
                });
            };
            this.closeQuickviewSlider = function(e) {
                $("#quickViewModal").modal("hide");
                $('.zoomContainer').remove();
                $('#zoom').removeData('elevateZoom');
            };
        };
        var slider = new QuickviewSlider();

        //using GET request CheckImage function checks whether an image exist or not
        var checkImage = function(imagepath, callback) {
            $.get(imagepath).done(function() {
                callback(true); //return true if image exist
            }).error(function() {
                callback(false);
            });
        };


        var QuickViewView = Backbone.View.extend({
            events: {
                'click .qvButton': 'buttonClicked',
                "click [data-mz-quickview-close]": "quickviewClose",
                "click #quickViewModal [data-mz-swatch-color]": "selectSwatch",
                "click #quickViewModal [data-mz-product-option-attribute]": "onOptionChangeAttribute",
                "click [data-mz-qty-minus]": "quantityMinus",
                "click [data-mz-qty-plus]": "quantityPlus",
                "click .btnAddToCart": "addToCart",
                'mouseenter #quickViewModal .color-options': 'onMouseEnterChangeImage',
                'mouseleave #quickViewModal .color-options': 'onMouseLeaveResetImage'
            },
            quickviewClose: function() {
                slider.closeQuickviewSlider();
            },
            initialize: function() {
                this.currentProductCode = null;
                this.isColorClicked = false;
                this.mainImage = '';
                _.bindAll(this, "quickviewClose");

            },
            zoomInit: function() {
                var me = this;
                $('#zoom').elevateZoom({ zoomType: "inner", cursor: "crosshair", responsive: true });
                this.$('[data-mz-product-option]').each(function() {
                    var $this = $(this),
                        isChecked, wasChecked;
                    if ($this.val()) {
                        switch ($this.attr('type')) {
                            case "checkbox":
                            case "radio":
                                isChecked = $this.prop('checked');
                                wasChecked = !!$this.attr('checked');
                                if ((isChecked && !wasChecked) || (wasChecked && !isChecked)) {
                                    //me.configure($this);
                                }
                                break;
                            default:
                                //me.configure($this);
                        }
                    }
                });
            },
            bxSliderInit: function() {
                return $('#productpager-Carousel').bxSlider({
                    slideWidth: 90,
                    minSlides: 4,
                    maxSlides: 4,
                    moveSlides: 1,
                    slideMargin: 15,
                    nextText: '<i class="fa fa-angle-right" aria-hidden="true"></i>',
                    prevText: '<i class="fa fa-angle-left" aria-hidden="true"></i>',
                    infiniteLoop: false,
                    hideControlOnEnd: true,
                    pager: false
                });
            },
            render: function() {
                var me = this;

                Backbone.MozuView.prototype.render.apply(this);
            },
            onMouseEnterChangeImage: function(_e) {
                this.mainImage = $('#quickViewModal .mz-productimages-mainimage').attr('src');
                var colorCode = $(_e.currentTarget).data('mz-swatch-color'),
                    productCode = $(_e.currentTarget).data("product-code");
                this.changeImages(colorCode, productCode, 'N');
            },
            onMouseLeaveResetImage: function(_e) {
                if (!this.isColorClicked) {
                    var _selectedColorDom = $("ul.product-color-swatches").find('li.active'),
                        colorCode = _selectedColorDom.data('mz-swatch-color'),
                        productCode = _selectedColorDom.data("product-code");
                    if (typeof colorCode != 'undefined') {
                        this.changeImages(colorCode, productCode, 'N');
                    } else if(typeof this.mainImage != 'undefined'){
                        $('#quickViewModal .mz-productimages-mainimage').attr('src', this.mainImage);
                    }else{
                        $('#quickViewModal .mz-productimages-main').html('<span class="mz-productlisting-imageplaceholder img-responsive"><span class="mz-productlisting-imageplaceholdertext">[no image]</span></span>');
                    }
                }
            },
            quantityMinus: function() {
                var _qtyObj = $('[data-mz-validationmessage-for="quantity"]'),
                    _qtyCountObj = $('.mz-productdetail-qty');
                _qtyObj.text('');
                var value = parseInt(_qtyCountObj.val(), 10);
                if (value == 1) {
                    _qtyObj.text("Quantity can't be zero.");
                    $('.tab_container ').animate({ scrollTop: $('.tab_container')[0].scrollHeight }, 'slow');
                    return;
                }
                value--;
                _qtyCountObj.val(value);
                if (typeof window.quickviewProduct.attributes.inventoryInfo.onlineStockAvailable !== 'undefined') {
                    if (window.quickviewProduct.attributes.inventoryInfo.onlineStockAvailable >= value)
                        $("#add-to-cart").removeClass("button_disabled");
                    if (window.quickviewProduct.attributes.inventoryInfo.onlineStockAvailable < value && window.quickviewProduct.attributes.inventoryInfo.onlineStockAvailable > 0)
                        $('[data-mz-validationmessage-for="quantity"]').text("*Only " + window.quickviewProduct.attributes.inventoryInfo.onlineStockAvailable + " left in stock.");
                }
            },
            quantityPlus: function() {
                var _qtyObj = $('[data-mz-validationmessage-for="quantity"]'),
                    _qtyCountObj = $('.mz-productdetail-qty');
                _qtyObj.text('');
                var value = parseInt(_qtyCountObj.val(), 10);
                if (value == 99) {
                    _qtyObj.text("Quantity can't be greater than 99.");
                    return;
                }
                value++;
                _qtyCountObj.val(value);
                if (typeof window.quickviewProduct.attributes.inventoryInfo.onlineStockAvailable !== 'undefined' && window.quickviewProduct.attributes.inventoryInfo.onlineStockAvailable < value) {
                    $("#add-to-cart").addClass("button_disabled");
                    if (window.quickviewProduct.attributes.inventoryInfo.onlineStockAvailable > 0)
                        $('[data-mz-validationmessage-for="quantity"]').text("*Only " + window.quickviewProduct.attributes.inventoryInfo.onlineStockAvailable + " left in stock.");
                }
            },
            addToCart: function() {
                $('.stock-error').remove();
                blockUiLoader.globalLoader();
                var newQty = $('.mz-productdetail-qty').val();
                if (newQty > 0) {
                    if (window.quickviewProduct.attributes.inventoryInfo.manageStock === true) {
                        if (typeof window.quickviewProduct.attributes.inventoryInfo.onlineStockAvailable === "undefined" || $(".mz-productoptions-optioncontainer").length != $(".mz-productoptions-optioncontainer .active").length) {
                            blockUiLoader.productValidationMessage();
                        } else {
                            if (window.quickviewProduct.attributes.inventoryInfo.onlineStockAvailable >= newQty) {
                                window.quickviewProduct.apiAddToCart({
                                    quantity: newQty
                                }).then(function() {
                                    CartMonitor.addToCount(newQty);
                                    $('[data-mz-validationmessage-for="quantity"]').text("");
                                    blockUiLoader.unblockUi();
                                    slider.closeQuickviewSlider();
                                }, function(err) {
                                    blockUiLoader.unblockUi();
                                    $('.stock-info').text('');
                                    if (err.message.indexOf("Validation Error: The following items have limited quantity or are out of stock:") !== -1) {
                                        $('.stock-info').after('<div class="stock-error">' + Hypr.getLabel('productOutOfStockError') + '</div>');
                                        $('.tab_container ').animate({ scrollTop: 0 }, 'slow');
                                    } else
                                        $('[data-mz-validationmessage-for="quantity"]').text(err.message);
                                    //$(".mz-validationmessage").text("Please try again later.");
                                });
                            } else {
                                if (typeof window.quickviewProduct.attributes.inventoryInfo.onlineStockAvailable !== "undefined" && window.quickviewProduct.get('inventoryInfo').onlineStockAvailable === 0) {
                                    $('[data-mz-validationmessage-for="item-out-of-stock"]').text("* This item is out of stock.");
                                    $(".stock-info").hide();
                                } else {
                                    $(".stock-info").show();
                                    $('[data-mz-validationmessage-for="item-out-of-stock"]').text("");
                                    $('[data-mz-validationmessage-for="quantity"]').text("*Only " + window.quickviewProduct.attributes.inventoryInfo.onlineStockAvailable + " left in stock.");
                                }
                                // Add error message not enough inventory
                                /*$(".mz-validationmessage").text("We're sorry, we only have " + window.quickviewProduct.attributes.inventoryInfo.onlineStockAvailable + " available. Those items have been added to your cart.");*/

                                $('.tab_container ').animate({ scrollTop: $('.tab_container')[0].scrollHeight }, 'slow');
                                blockUiLoader.unblockUi();
                                return false;
                                /*window.quickviewProduct.apiAddToCart({
                                    quantity: window.quickviewProduct.attributes.inventoryInfo.onlineStockAvailable
                                }).then(function() {
                                    CartMonitor.addToCount(newQty);
                                    blockUiLoader.unblockUi();
                                });*/
                            }
                        }
                    } else {
                        window.quickviewProduct.apiAddToCart({
                            quantity: newQty
                        }).then(function() {
                            CartMonitor.addToCount(newQty);
                        });
                        $('[data-mz-validationmessage-for="quantity"]').text("");
                        blockUiLoader.unblockUi();
                        slider.closeQuickviewSlider();
                    }
                } else {
                    $('[data-mz-validationmessage-for="quantity"]').text("Quantity can't be zero.");
                    blockUiLoader.unblockUi();
                    return;
                }
            },
            selectSwatch: function(e) {
                this.isColorClicked = true;
                var colorCode = $(e.currentTarget).data('mz-swatch-color'),
                    productCode = $(e.currentTarget).data("product-code");
                this.changeImages(colorCode, productCode, 'Y');

            },
            changeImages: function(colorCode, productCode, _updateThumbNails) {
                var width = hyprlivecontext.locals.themeSettings.productImageDirectoryMaxWidth;
                var version = 1;
                if ($("figure.mz-productimages-thumbs ul.products_list li.active").length > 0) {
                    version = $("figure.mz-productimages-thumbs ul.products_list li.active").data("mz-productimage-thumb");
                }
                var imagepath = imagefilepath + '/' + productCode + '_' + colorCode + '_v' + version + '.jpg?maxWidth=' + hyprlivecontext.locals.themeSettings.productImagePdpMaxWidth;
                var zoomimagepath = imagefilepath + '/' + productCode + '_' + colorCode + '_v' + version + '.jpg?maxWidth=' + hyprlivecontext.locals.themeSettings.productZoomImageMaxWidth;
                var _this = this;
                //TODO: following function is checking if images exist on server or not
                checkImage(imagepath, function(response) {
                    if (response) {
                        var img = $('#quickViewModal .mz-productimages-mainimage');
                        if (img.length === 0) {
                            var parentDiv = $("#quickViewModal .mz-productimages-main");
                            parentDiv.find(".mz-productlisting-imageplaceholder").remove();
                            parentDiv.append("<img id='zoom' class='mz-productimages-mainimage' data-mz-productimage-main>");
                        }
                        if (_updateThumbNails == 'Y') {
                            $('#quickViewModal .mz-productimages-mainimage').attr('src', imagepath);
                            $('.zoomContainer').remove();
                            $('#zoom').removeData('elevateZoom');
                            img.attr('src', imagepath).data('zoom-image', zoomimagepath);
                            $('#zoom').elevateZoom({ zoomType: "inner", cursor: "crosshair" });
                        } else {
                            $("#quickViewModal .mz-productimages-main img").attr('src', imagepath);
                        }
                    } else if(typeof _this.mainImage === 'undefined' || response === false) {
                        $('.zoomContainer').remove();
                        $('.mz-productimages-main').html('<span class="mz-productlisting-imageplaceholder img-responsive"><span class="mz-productlisting-imageplaceholdertext">[no image]</span></span>');
                    }
                });
                if ($("figure.mz-productimages-thumbs").length && $("figure.mz-productimages-thumbs").data("length") && _updateThumbNails == 'Y') {
                    _this.updateAltImages(colorCode, productCode);
                }
            },
            updateAltImages: function(colorCode, productCode) {
                try {
                    this.bxSliderInit().destroySlider();
                } catch (e) {}
                var slideCount = parseInt($("figure.mz-productimages-thumbs").data("length"), 10);
                for (var i = 1; i <= slideCount; i++) {
                    $(".mz-productimages-thumbs .products_list li:eq(" + (i - 1) + ") .mz-productimages-thumb img")
                        .attr({
                            "src": imagefilepath + '/' + productCode + '_' + colorCode + '_v' + i + '.jpg?maxWidth=' + hyprlivecontext.locals.themeSettings.maxProductImageThumbnailSize,
                            "data-orig-src": imagefilepath + '/' + productCode + '_' + colorCode + '_v' + i + '.jpg?maxWidth=' + hyprlivecontext.locals.themeSettings.productImagePdpMaxWidth,
                            "data-orig-zoom": imagefilepath + '/' + productCode + '_' + colorCode + '_v' + i + '.jpg?maxWidth=' + hyprlivecontext.locals.themeSettings.productZoomImageMaxWidth
                        });
                }
                if (slideCount > 4) {
                    this.bxSliderInit();
                }
            },
            onOptionChangeAttribute: function(e) {
                if (window.quickviewProduct !== null) {
                    if ((!$(e.currentTarget).hasClass("disabled") || ($(e.currentTarget).parents('.product-color-swatches').length > 0 && $(e.currentTarget).hasClass("disabled"))) && !$(e.currentTarget).hasClass('active')) {
                        if ($(e.currentTarget).parents('.product-color-swatches').length > 0) {
                            colorSwatch.changeColorSwatch(e);
                        }
                        blockUiLoader.globalLoader();
                        return this.configureAttribute($(e.currentTarget));
                    }
                }
            },
            configureAttribute: function($optionEl) {
                if (!$optionEl.hasClass("active")) {
                    var $this = this,
                        newValue = $optionEl.data('value'),
                        oldValue,
                        id = $optionEl.data('mz-product-option-attribute'),
                        optionEl = $optionEl[0],
                        isPicked = (optionEl.type !== 'checkbox' && optionEl.type !== 'radio') || optionEl.checked,
                        option = window.prodOptions.get(id),
                        product = window.quickviewProduct;
                    if (option) {
                        if (option.get('attributeDetail').inputType === 'YesNo') {
                            option.set("value", isPicked);
                        } else if (isPicked) {
                            oldValue = option.get('value');
                            if (oldValue !== newValue && !(oldValue === undefined && newValue === '')) {
                                option.set('value', newValue);
                            }
                        }
                    }
                    $('button.btnAddToCart').addClass('button_disabled');

                    var isRequiredOptionsSet = true;
                    var productOptions = window.prodOptions.models;
                    var _optionsObj = CommonFunctions.filterProductOptions(window.prodOptions.models);

                    var allOptions = Object.keys(_optionsObj).length;
                    //for all available options
                    for (var i = 0; i < productOptions.length; i++) {
                        //check if this option is req
                        if (productOptions[i].attributes.isRequired) {
                            //check if any option has any property isEnabled = "true"                    
                            var isEnabled = CommonFunctions.checkIsEnabled(productOptions[i].attributes.values);
                            if (isEnabled) {
                                isRequiredOptionsSet = true;
                            } else {
                                isRequiredOptionsSet = false;
                            }
                        }
                    }

                    product.on("change", function() {
                        if (window.quickviewProduct.attributes.inventoryInfo.onlineStockAvailable && typeof window.quickviewProduct.attributes.inventoryInfo.onlineStockAvailable !== "undefined") {
                            var sp_price = "";
                            if (window.quickviewProduct.get('inventoryInfo').onlineStockAvailable && typeof window.quickviewProduct.attributes.inventoryInfo.onlineStockAvailable !== "undefined") {
                                if (typeof window.quickviewProduct.attributes.price.get('salePrice') != 'undefined')
                                    sp_price = window.quickviewProduct.attributes.price.get('salePrice');
                                else
                                    sp_price = window.quickviewProduct.attributes.price.get('price');
                                var price = Hypr.engine.render("{{price|currency}}", { locals: { price: sp_price } });
                                $('.stock-info').show().html("<span>In Stock </span>" + price);
                                $('[data-mz-validationmessage-for="item-out-of-stock"]').text("");
                            } else {
                                $('.stock-info').hide();
                            }
                        }
                        if (window.quickviewProduct.attributes.variationProductCode && typeof window.quickviewProduct.attributes.variationProductCode !== "undefined") {
                            $(".mz-productcodes-productcode").text("Sku # " + window.quickviewProduct.attributes.variationProductCode);
                        }
                        // Set product price       
                        if (window.quickviewProduct.attributes.price.attributes.price) {
                            var priceModel = { onSale: product.attributes.price.onSale() },
                                priceDiscountTemplate = Hypr.getTemplate("modules/product/price-discount"),
                                priceTemplate = Hypr.getTemplate("modules/common/price");

                            _.extend(priceModel, product.attributes.price.attributes);

                            $(".quickviewElement .mz-pricestack").html(priceDiscountTemplate.render({
                                model: priceModel
                            }) + '<span class="not-range">' + priceTemplate.render({
                                model: priceModel
                            }) + '</span>');
                        }
                        if ($(".mz-productoptions-valuecontainer input:radio")) {
                            var color = "#ff0000";
                            if ($(".mz-productoptions-valuecontainer input:radio:checked").val()) {
                                color = "#000";
                            }
                            $(".mz-productoptions-valuecontainer input:radio + label").each(function() {
                                $(this).css("border-color", color);
                            });
                        }
                        $(".mz-productdetail-options input, .mz-productdetail-options select").each(function() {
                            if (($(this).data('value') && $(this).data('value').toLowerCase() == "select") || !$(this).data('value')) {
                                $(this).css("border-color", "red");
                            } else {
                                $(this).css("border-color", "black");
                            }
                        });
                    });

                    var prodOptions = [];
                    $(product.attributes.options.models).each(function() {
                        if (this.attributes.value) {
                            prodOptions.push(this);
                        }
                    });
                    product.apiConfigure({ options: prodOptions }).then(function(e) {
                        $('[data-mz-validationmessage-for="quantity"]').text("");
                        if (isRequiredOptionsSet) {
                            if (window.quickviewProduct.attributes.inventoryInfo.manageStock === true) {
                                if (typeof window.quickviewProduct.attributes.inventoryInfo.onlineStockAvailable === "undefined") {
                                    $('button.btnAddToCart').removeClass('button_disabled');
                                }
                                if (window.quickviewProduct.attributes.inventoryInfo.onlineStockAvailable > 0 && window.quickviewProduct.attributes.inventoryInfo.onlineStockAvailable < hyprlivecontext.locals.themeSettings.minimumQuantityForInStockQuantityMessage) {
                                    $('[data-mz-validationmessage-for="quantity"]').text("*Only " + window.quickviewProduct.attributes.inventoryInfo.onlineStockAvailable + " left in stock.");
                                }
                                if (window.quickviewProduct.attributes.inventoryInfo.onlineStockAvailable >= 1) {
                                    $('button.btnAddToCart').removeClass('button_disabled');

                                    $(".quickviewElement input, .quickviewElement ul.product-swatches").removeAttr("disabled");
                                } else {
                                    $(".mz-qty-control").addClass("disabled");
                                    $('button.btnAddToCart').addClass('button_disabled');

                                    $(".quickviewElement input, .quickviewElement ul.product-swatches").not("#mz-close-button, #add-to-cart").attr("disabled", "disabled");
                                    if (window.quickviewProduct.attributes.inventoryInfo.onlineStockAvailable !== undefined) {
                                        $('[data-mz-validationmessage-for="item-out-of-stock"]').text("* This item is out of stock.");
                                        $('.stock-info').hide();
                                    } else {
                                        $('[data-mz-validationmessage-for="item-out-of-stock"]').text("");
                                        $('.stock-info').show();
                                    }
                                }
                            } else {
                                $('button.btnAddToCart').removeClass('button_disabled');
                                $(".quickviewElement input, .quickviewElement ul.product-swatches").removeAttr("disabled");
                            }

                        } else {
                            $('button.btnAddToCart').addClass('button_disabled');

                            $(".quickviewElement input, .quickviewElement ul.product-swatches").not("#mz-close-button, #add-to-cart").attr("disabled", "disabled");
                        }

                        var _ot = Hypr.getTemplate("modules/product/product-options");
                        $(".quickviewSlider .mz-productdetail-options").html(_ot.render({
                            model: e.data
                        }));
                        $this.isColorClicked = false;
                        blockUiLoader.unblockUi();
                    });
                }
            },
            buttonClicked: function(e) {
                blockUiLoader.globalLoader();
                var self = this;
                window.quickviewProduct = null;
                this.currentProductCode = null;

                // Reset modal dialog content
                $('.quickviewSlider .modal-body').html('');

                var qvProductCode = $(e.currentTarget).data("target");
                var productJSONData = $(e.currentTarget).data("mz-product-data");
                var product = new ProductModels.Product(productJSONData);



                window.quickviewProduct = product;
                this.currentProductCode = qvProductCode;
//                product.apiGet().then(function(_r) {
                    var options_pro = product.attributes.options;
                    var availableColors = [];
                    if (options_pro.models) {
                        for (var i = 0; i < options_pro.models.length; i++) {
                            if (options_pro.models[i].id == "tenant~color") {
                                for (var j = 0; j < options_pro.models[i].legalValues.length; j++) {
                                    var color = options_pro.models[i].legalValues[j].trim().replace(/ /g, '_');
                                    var swatchIconSize =
                                        hyprlivecontext.locals.themeSettings.listProductSwatchIconSize;
                                    var swatchIconPath = imagefilepath + '/' + options_pro.models[i].collection.parent.id + '_' + color + '.jpg?max=' + swatchIconSize;
                                    availableColors.push({
                                        color: options_pro.models[i].legalValues[j],
                                        swatchIconPath: swatchIconPath,
                                        swatch_color: color
                                    });
                                }
                                product.attributes.availableColors = availableColors;
                            }
                        }
                    }
                    var sizeObj = "";
                    sizeObj = _.find(product.attributes.properties, function(e) {
                        return e.attributeFQN === "tenant~moreInfo" && e.values;
                    });
                    //If Size Object exist then append a new key "sizeChartImagePath" with value URL(SIZE CHART) as string.
                    product.attributes.sizeChartPath = sizeObj ? (imagefilepath + '/' + sizeObj.values[0].value) : null;
                    product.attributes.quickView = "yes";

                    var modalTemplate = Hypr.getTemplate('modules/product/product-quick-view');

                    var htmlToSetAsContent = modalTemplate.render({
                        model: product.toJSON({
                            helpers: true
                        })
                    });

                    // SET OPTIONS
                    window.prodOptions = window.quickviewProduct.attributes.options;
                    $('.quickviewSlider').html(htmlToSetAsContent);
                    slider.init(this);
                    setTimeout(function() {
                        if ($('.zoomContainer').length > 0) {
                            $('.zoomContainer').remove();
                        }
                        self.zoomInit();
                        var productImagesView = new ProductImageViews.ProductPageImagesView({
                            el: $('[data-mz-productimages]'),
                            model: product
                        });
                        self.bxSliderInit();
                    }, 500);
                    if (window.quickviewProduct.get('variationProductCode')) {
                        var sp_price = "";
                        if (window.quickviewProduct.get('inventoryInfo').onlineStockAvailable && typeof window.quickviewProduct.attributes.inventoryInfo.onlineStockAvailable !== "undefined") {
                            if (typeof window.quickviewProduct.attributes.price.get('salePrice') != 'undefined')
                                sp_price = window.quickviewProduct.attributes.price.get('salePrice');
                            else
                                sp_price = window.quickviewProduct.attributes.price.get('price');
                            var price = Hypr.engine.render("{{price|currency}}", { locals: { price: sp_price } });
                            $('.stock-info').show().html("<span>In Stock </span>" + price);
                            $('[data-mz-validationmessage-for="item-out-of-stock"]').text("");
                        } else {
                            $('.stock-info').hide();
                        }
                    }
                    if (typeof window.quickviewProduct.attributes.inventoryInfo.onlineStockAvailable !== "undefined" && window.quickviewProduct.get('inventoryInfo').onlineStockAvailable === 0) {
                        $('[data-mz-validationmessage-for="item-out-of-stock"]').text("* This item is out of stock.");
                        $('.stock-info').hide();
                    } else {
                        $('[data-mz-validationmessage-for="item-out-of-stock"]').text("");
                        $(".stock-info").show();
                    }
                    blockUiLoader.unblockUi();

//                });
            }
        });

        $(document).ready(function() {
            var quickViewView = new QuickViewView({
                el: 'body'
            });
            $('body').on('click', '#mz-close-button', function(e) {
                e.preventDefault();
                blockUiLoader.unblockUi();
                $('#zoom').elevateZoom({ zoomType: "inner", cursor: "crosshair" });
            });

        });
    });