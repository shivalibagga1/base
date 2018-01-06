define(['modules/backbone-mozu', 'hyprlive', 'hyprlivecontext', 'modules/jquery-mozu', 'underscore', 'modules/editable-view', 'modules/models-customer'], function(Backbone, Hypr, HyprLiveContext, $, _, EditableView, CustomerModels) {


    var CatalogRequestAddressForm = EditableView.extend({
        templateName: "modules/catalog-request/catalog-request-address-form",
        autoUpdate: [
            'firstName',
            'middleNameInitials',
            'lastNameOrSurname',
            'address.address1',
            'address.address2',
            'address.cityOrTown',
            'address.countryCode',
            'address.stateOrProvince',
            'address.postalOrZipCode',
            'address.addressType',
            'phoneNumbers.office',
            'phoneNumbers.home',
            'email',
            'marketingEnabled'
        ],
        renderOnChange: [
            'address.countryCode'
        ],
        finishEditContact: function() {
            var self = this,
                isAddressValidationEnabled = HyprLiveContext.locals.siteContext.generalSettings.isAddressValidationEnabled;
            var operation = this.doModelAction('requestCatalog', { forceIsValid: isAddressValidationEnabled }); // hack in advance of doing real validation in the myaccount page, tells the model to add isValidated: true
            if (operation) {
                operation.then(function(result) {
                    //console.log("ENTITYLIST response : ", result);
                    self.editing.contact = true;
                    $('#form-viewport,#mz-drop-zone-email-signup-top').hide();
                    $('.register-success-panel').show();
                }, function(error) {

                });
                this.editing.contact = false;
            }
        },
        render: function() {
            //console.log("rendering");
            Backbone.MozuView.prototype.render.apply(this);
        }
    });



    $(document).ready(function() {

        var validations = _.extend({}, CustomerModels.Contact.prototype.validation, {
            'phoneNumbers.office': [{
                required: false,
                msg: Hypr.getLabel("phoneMissing")
            }, {
                pattern: "digits",
                msg: Hypr.getLabel("invalidPhone")
            }, {
                length: 10,
                msg: Hypr.getLabel("invalidPhoneLength")
            }],
            'phoneNumbers.home': [{
                required: false,
                msg: Hypr.getLabel("phoneMissing")
            }, {
                pattern: "digits",
                msg: Hypr.getLabel("invalidPhone")
            }, {
                length: 10,
                msg: Hypr.getLabel("invalidPhoneLength")
            }],
            'email': [{
                required: true,
                pattern: 'email',               
                msg: Hypr.getLabel('emailMissing')
            }]            
        });


        var Model = CustomerModels.Contact.extend({
            validation: validations,
            defaults: {
                marketingEnabled: true
            }            
        });

        var catalogRequestModel = window.CatalogRequestModel = new Model();
        var $addressBookEl = $('#catalog-address-form-container'),
            $messagesEl = $('#catalog-address-form-messages');


        var catalogRequestAddressForm = new CatalogRequestAddressForm({
            el: $addressBookEl,
            model: catalogRequestModel,
            messagesEl: $messagesEl
        });
        window.catalogRequestAddressForm = catalogRequestAddressForm;

        catalogRequestAddressForm.render();

        // TODO: upgrade server-side models enough that there's no delta between server output and this render,
        // thus making an up-front render unnecessary.
        //_.invoke(window.accountViews, 'render');

    });
});
