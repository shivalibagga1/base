require(["modules/jquery-mozu", "hyprlive", "hyprlivecontext", "modules/backbone-mozu","modules/backbone-mozu-model"], function($, Hypr, HyprLiveContext, Backbone,MozuModel) {

    var FooterStoreLocator = Backbone.MozuView.extend({
        templateName: 'modules/location/store-locator-footer',
        additionalEvents: {
            "keypress [data-mz-footer-storelocator]": "enteKeyStoreLocator",
            "click [data-mz-find-store]": "findStoreFooter"
        },
        findStoreFooter: function(e) {
            var zipcode = $.trim($("#footerZipCodeInput").val());
            if(!zipcode){
                $('#zipcodeHelpBlock').removeClass('hidden');
                return false;
            }else{
                $('#zipcodeHelpBlock:not(".hidden")').addClass('hidden');
            }
            zipcode = (zipcode.length === 0 ? "Enter+Zip" : zipcode);
            window.location.href = window.location.origin + "/store-locator?zipcode=" + zipcode;
        },
        enteKeyStoreLocator: function(e) {
            if(e.which===13){
                $("#btnFindStore").trigger('click');
                return false;
            }
        }
    });

    $(document).ready(function() {
       var footerViewStoreLocator= new FooterStoreLocator({
            el: $('#footerStoreLocator'),
            model: MozuModel
        });

    });

});
