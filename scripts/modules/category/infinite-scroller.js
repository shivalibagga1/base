define([
    'modules/backbone-mozu',
    'modules/jquery-mozu',
    "hyprlive",
    'underscore',
    "hyprlivecontext",
    "modules/api",
    "modules/get-partial-view",
    "modules/block-ui"
], function(Backbone, $, Hypr, _, HyprLiveContext, api, getPartialView, blockUiLoader) {
    var items = require.mozuData('facetedproducts').items;
    var sitecontext = HyprLiveContext.locals.siteContext;
    var cdn = sitecontext.cdnPrefix;
    var isLoadMore = true;
    var siteID = cdn.substring(cdn.lastIndexOf('-') + 1);
    var imagefilepath = cdn + '/cms/' + siteID + '/files';
    var startIndex = require.mozuData('facetedproducts').startIndex;
    var pageSize = HyprLiveContext.locals.themeSettings.productInfinitySize;

    var ProductListItemView = Backbone.MozuView.extend({
        tagName: 'li',
        className: 'mz-productlist-item col-xs-6 col-sm-4',
        templateName: 'modules/product/product-listing',
        initialize: function() {
            var self = this;
            self.listenTo(self.model, 'change', self.render);
        },
        render: function() {
            Backbone.MozuView.prototype.render.apply(this);
            this.$el.attr("data-mz-product", this.$el.find(".mz-productlisting").data("mz-product"));
            return this;
        }
    });

    var Model = Backbone.MozuModel.extend();

    var ProductsListView = Backbone.MozuView.extend({
        templateName: 'modules/category/infinity-scroll',
        initialize: function() {
            var self = this;
            $(window).scroll(function() {
                if ($(window).scrollTop() >= $(document).height() - $(window).height() - $('.ml-global-footer').height() - $('footer').height() - 200) {
                    if ($(".view-all.selected").length) {
                        $("#more-item-container").show();
                        self.loadMoreProducts();
                    } else {
                        $("#more-item-container").hide();
                    }
                }
            });
        },
        render: function() {
            var me = this;
            items = require.mozuData('facetedproducts').items;
            me.model.attributes.products = items;
            Backbone.MozuView.prototype.render.apply(this);
            $('#more-product-list').empty();
        },
        addProduct: function(prod) {
            var view = new ProductListItemView({ model: new Model(prod) });
            var renderedView = view.render().el;
            $('#more-product-list').append(renderedView);
        },
        loadMoreProducts: function() {
            var me = this;
            var totalProducts = require.mozuData('facetedproducts').totalCount;

            if (totalProducts > startIndex && isLoadMore) {
                isLoadMore = false;
                $("#loaderIcon").show();
                var url = window.location.pathname;
                var search = window.location.search;
                search += (search.indexOf('?') == -1) ? '?' : '&';
                if (startIndex !== 0) {
                    blockUiLoader.globalLoader();
                    getPartialView(url + search + 'startIndex=' + startIndex, 'category-interior-json').then(function(response) {
                        var products = JSON.parse(response.body);
                        _.each(products.items, me.addProduct.bind(me));
                        blockUiLoader.unblockUi();
                        $("#loaderIcon").hide();
                        isLoadMore = true;
                        startIndex += pageSize;
                    }, function(error) {
                        $("#loaderIcon").hide();
                        blockUiLoader.unblockUi();
                        isLoadMore = true;
                        console.log(error);
                    });
                } else {
                    startIndex += pageSize;
                }
            }
        }
    });

    return {
        update: function() {
            var productsListView = new ProductsListView({
                model: new Model({ products: items }),
                el: '#more-item-container'
            });
            startIndex = pageSize;
            productsListView.render();
        }
    };
});