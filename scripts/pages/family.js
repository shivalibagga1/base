define([
    'modules/jquery-mozu',
    'underscore',
    "modules/api",
    "modules/backbone-mozu",
    'hyprlivecontext',
    "bxslider",
    'modules/block-ui',
    "hyprlive",
    'modules/models-product'
], function($, _, api, Backbone, HyprLiveContext, bxslider, blockUiLoader, Hypr, ProductModels) {
    var sitecontext = HyprLiveContext.locals.siteContext,
    cdn = sitecontext.cdnPrefix,
    siteID = cdn.substring(cdn.lastIndexOf('-') + 1),
    imagefilepath = cdn + '/cms/' + siteID + '/files',
    width_fam = HyprLiveContext.locals.themeSettings.familyProductImageMaxWidth,
    deviceType = navigator.userAgent.match(/Android|BlackBerry|iPhone|iPod|Opera Mini|IEMobile/i),
   
    //using GET request CheckImage function checks whether an image exist or not
    checkImage = function(imagepath, callback) {
        $.get(imagepath).done(function() {
            callback(true); //return true if image exist
        }).error(function() {
            callback(false);
        });
    };

    var FamilyItemView = Backbone.MozuView.extend({
        tagName: 'div',
        className: 'mz-familylist-item col-xs-12',
        templateName: 'modules/product/family/family-item',
        additionalEvents: {
            "click [data-mz-product-option-attribute]": "onOptionChangeAttribute",
            "click [data-mz-qty-minus]": "quantityMinus",
            "click [data-mz-qty-plus]": "quantityPlus",
            'mouseenter .color-options': 'onMouseEnterChangeImage',
            'mouseleave .color-options': 'onMouseLeaveResetImage'
        },
        initialize: function() {
            var self = this;
            self.listenTo(self.model, 'change', self.render);
        },
        render: function() {
            Backbone.MozuView.prototype.render.apply(this);
            return this;
        },
        quantityMinus: function() {
            this.model.messages.reset();
            var qty = this.model.get('quantity');
            if (qty === 0) {
                //this.model.trigger('error', {message: Hypr.getLabel("quantityZeroError")});
                return;
            }
            this.model.set('quantity',--qty);
        },
        quantityPlus: function() {
            this.model.messages.reset();
            var qty = this.model.get('quantity');
            this.model.set('quantity',++qty);
        },
        onOptionChangeAttribute: function(e) {
            return this.configureAttribute($(e.currentTarget));
        },
        configureAttribute: function($optionEl) {
            var $this = this;
            if (!$optionEl.hasClass("active")) {
                if ($optionEl.attr('disabled') == 'disabled') {
                    return false;
                } else {
                    blockUiLoader.globalLoader();
                    var newValue = $optionEl.data('value'),
                        oldValue,
                        id = $optionEl.data('mz-product-option-attribute'),
                        optionEl = $optionEl[0],
                        isPicked = (optionEl.type !== "checkbox" && optionEl.type !== "radio") || optionEl.checked,
                        option = this.model.get('options').get(id);
                    if (!option) {
                        var byIDVal = JSON.parse(JSON.stringify(this.model.get('options')._byId));
                        for (var key in byIDVal) {
                            if (id === byIDVal[key].attributeFQN) {
                                option = this.model.get('options').get(key);
                            }
                        }
                    }
                    if (option) {
                        if (option.get('attributeDetail').inputType === "YesNo") {
                            option.set("value", isPicked);
                        } else if (isPicked) {
                            oldValue = option.get('value');
                            if (oldValue !== newValue && !(oldValue === undefined && newValue === '')) {
                                option.set('value', newValue);
                            }
                        }
                    }
                    this.model.whenReady(function() { 
                        setTimeout(function() {
                            blockUiLoader.unblockUi();
                            $this.isColorClicked = false; 
                        }, 1000);
                    });
                }
            }
        },
        onMouseEnterChangeImage: function(_e) {
            if (!deviceType) {            	           	
            	this.mainImage = $(_e.delegateTarget).find('img').attr('src');                
                var colorCode = $(_e.currentTarget).data('mz-swatch-color');
                this.changeImages(_e,colorCode, 'N');
            }
        },
        onMouseLeaveResetImage: function(_e) {
            if (!this.isColorClicked && !deviceType) {
                var colorCode = $(_e.delegateTarget).find('ul.product-color-swatches').find('li.active').data('mz-swatch-color');
                if (typeof colorCode != 'undefined') {
                    this.changeImages(_e,colorCode, 'N');
                } else if (typeof this.mainImage != 'undefined') {
                    $(_e.delegateTarget).find('img').attr('src', this.mainImage);
                } else {
                    $('.mz-productimages-main').html('<span class="mz-productlisting-imageplaceholder img-responsive"><span class="mz-productlisting-imageplaceholdertext">[no image]</span></span>');
                }
            }
        },
        selectSwatch: function(e) {
            this.isColorClicked = true;
            var colorCode = $(e.currentTarget).data('mz-swatch-color');
            this.changeImages(e,colorCode, 'Y');

        },
        changeImages: function(_e,colorCode, _updateThumbNails) {
            var self = this;
            var version = 1;
       
            var imagepath = imagefilepath + '/' + this.model.attributes.productCode + '_' + colorCode + '_v' + version + '.jpg';
            var mainImage = imagepath + '?maxWidth='+ width_fam;
      
            var _this = this;
            //TODO: following function is checking if images exist on server or not
            checkImage(imagepath, function(response) {
                if (response) {
                    	$(_e.delegateTarget).find('img').attr('src', mainImage);
                        if(self.isColorClicked)
                            self.model.set('mainImage', imagepath);
                } else if (typeof self.mainImage === 'undefined') {
                    $('.mz-productimages-main').html('<span class="mz-productlisting-imageplaceholder img-responsive"><span class="mz-productlisting-imageplaceholdertext">[no image]</span></span>');
                }
               
            });
        }
    });
    var Model = Backbone.MozuModel.extend();
    return FamilyItemView;
});
