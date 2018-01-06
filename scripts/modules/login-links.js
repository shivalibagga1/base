/**
 * Adds a login popover to all login links on a page.
 */

define(['shim!vendor/bootstrap/js/popover[shim!vendor/bootstrap/js/tooltip[modules/jquery-mozu=jQuery]>jQuery=jQuery]>jQuery', 'modules/api', 'hyprlive', 'underscore', 'hyprlivecontext', 'vendor/jquery-placeholder/jquery.placeholder'], function ($, api, Hypr, _, HyprLiveContext) {
    var current = "";
    var usePopovers = function() {
        return !Modernizr.mq('(max-width: 480px)');
    },
    isTemplate = function(path) {
        return require.mozuData('pagecontext').cmsContext.template.path === path;
    },
    returnFalse = function () {
        return false;
    },
    returnUrl = function() {
        var returnURL = $('input[name=returnUrl]').val();
        if(!returnURL) {
            returnURL = '/';
        }
        return returnURL;
    },
    $docBody,

    polyfillPlaceholders = !('placeholder' in $('<input>')[0]);

    var DismissablePopover = function () { };

    $.extend(DismissablePopover.prototype, {
        boundMethods: [],
        setMethodContext: function () {
            for (var i = this.boundMethods.length - 1; i >= 0; i--) {
                this[this.boundMethods[i]] = $.proxy(this[this.boundMethods[i]], this);
            }
        },
        dismisser: function (e) {
            if (!$.contains(this.popoverInstance.$tip[0], e.target) && !this.loading) {
                // clicking away from a popped popover should dismiss it
                this.$el.popover('destroy');
                this.$el.on('click', this.createPopover);
                this.$el.off('click', returnFalse);
                this.bindListeners(false);
                $docBody.off('click', this.dismisser);
            }
        },
        setLoading: function (yes) {
            this.loading = yes;
            this.$parent[yes ? 'addClass' : 'removeClass']('is-loading');
        },
        newsetLoading: function (yes) {
            this.loading = yes;
            $(current)[yes ? 'addClass' : 'removeClass']('is-loading');
        },
        newdisplayMessage: function (el, msg) {
            this.newsetLoading(false);
            $(el).parents('.tab-pane').find('[data-mz-role="popover-message"]').html('<span class="mz-validationmessage">' + msg + '</span>');
        },
        newdisplayApiMessage: function (xhr) {
            //console.log(current);
            var msg = xhr.message || (xhr && xhr.responseJSON && xhr.responseJSON.message) || Hypr.getLabel('unexpectedError');
            $(current).parents('.tab-pane').find('[data-mz-role="popover-message"]').html('<span class="mz-validationmessage">' + msg + '</span>');
            //this.newdisplayMessage(current, (xhr.message || (xhr && xhr.responseJSON && xhr.responseJSON.message) || Hypr.getLabel('unexpectedError')));
        },
        onPopoverShow: function () {
            var self = this;
            _.defer(function () {
                $docBody.on('click', self.dismisser);
                self.$el.on('click', returnFalse);
            });
            this.popoverInstance = this.$el.data('bs.popover');
            this.$parent = this.popoverInstance.tip();
            this.bindListeners(true);
            this.$el.off('click', this.createPopover);
            if (polyfillPlaceholders) {
                this.$parent.find('[placeholder]').placeholder({ customClass: 'mz-placeholder' });
            }
        },
        createPopover: function (e) {
            // in the absence of JS or in a small viewport, these links go to the login page.
            // Prevent them from going there!
            var self = this;
            if (usePopovers()) {
                e.preventDefault();
                // If the parent element's not positioned at least relative,
                // the popover won't move with a window resize
                //var pos = $parent.css('position');
                //if (!pos || pos === "static") $parent.css('position', 'relative');
                this.$el.popover({
                    //placement: "auto right",
                    animation: true,
                    html: true,
                    trigger: 'manual',
                    content: this.template,
                    container: 'body'
                }).on('shown.bs.popover', this.onPopoverShow)
                .popover('show');

            }
        },
        retrieveErrorLabel: function (xhr) {
            var message = "";
            if (xhr.message) {
                message = Hypr.getLabel(xhr.message);
            } else if ((xhr && xhr.responseJSON && xhr.responseJSON.message)) {
                message = Hypr.getLabel(xhr.responseJSON.message);
            }

            if (!message || message.length === 0) {
                this.displayApiMessage(xhr);
            } else {
                var msgCont = {};
                msgCont.message = message;
                this.displayApiMessage(msgCont);
            }
        },
        displayApiMessage: function (xhr) {
            this.displayMessage(xhr.message ||
                (xhr && xhr.responseJSON && xhr.responseJSON.message) ||
                Hypr.getLabel('unexpectedError'));
        },
        displayMessage: function (msg) {
            this.setLoading(false);
            this.$parent.find('[data-mz-role="popover-message"]').html('<span class="mz-validationmessage">' + msg + '</span>');
        },
        init: function (el) {
            this.$el = $(el);
            this.loading = false;
            this.setMethodContext();
            if (!this.pageType){
                this.$el.on('click', this.createPopover);
            }
            else {
               this.$el.on('click', _.bind(this.doFormSubmit, this));
            }
        },
        doFormSubmit: function(e){
            e.preventDefault();
            this.$parent = this.$el.closest(this.formSelector);
            this[this.pageType]();
        }
    });

    var LoginPopover = function() {
        DismissablePopover.apply(this, arguments);
        this.login = _.debounce(this.login, 150);
        this.retrievePassword = _.debounce(this.retrievePassword, 150);
    };
    LoginPopover.prototype = new DismissablePopover();
    $.extend(LoginPopover.prototype, {
        boundMethods: ['handleEnterKey', 'handleLoginComplete', 'displayResetPasswordMessage', 'dismisser', 'displayMessage', 'displayApiMessage', 'createPopover', 'slideRight', 'slideLeft', 'login', 'retrievePassword', 'onPopoverShow'],
        template: Hypr.getTemplate('modules/common/login-popover').render(),
        bindListeners: function (on) {
            var onOrOff = on ? "on" : "off";
            this.$parent[onOrOff]('click', '[data-mz-action="forgotpasswordform"]', this.slideRight);
            this.$parent[onOrOff]('click', '[data-mz-action="loginform"]', this.slideLeft);
            this.$parent[onOrOff]('click', '[data-mz-action="submitlogin"]', this.login);
            this.$parent[onOrOff]('click', '[data-mz-action="submitforgotpassword"]', this.retrievePassword);
            this.$parent[onOrOff]('keypress', 'input', this.handleEnterKey);
        },
        onPopoverShow: function () {
            DismissablePopover.prototype.onPopoverShow.apply(this, arguments);
            this.panelWidth = this.$parent.find('.mz-l-slidebox-panel').first().outerWidth();
            this.$slideboxOuter = this.$parent.find('.mz-l-slidebox-outer');

            if (this.$el.hasClass('mz-forgot')){
                this.slideRight();
            }
        },
        handleEnterKey: function (e) {
            if (e.which === 13) {
                var $parentForm = $(e.currentTarget).parents('[data-mz-role]');
                switch ($parentForm.data('mz-role')) {
                    case "login-form":
                        this.login();
                        break;
                    case "forgotpassword-form":
                        this.retrievePassword();
                        break;
                }
                return false;
            }
        },
        slideRight: function (e) {
            if (e) e.preventDefault();
            this.$slideboxOuter.css('left', -this.panelWidth);
        },
        slideLeft: function (e) {
            if (e) e.preventDefault();
            this.$slideboxOuter.css('left', 0);
        },
        login: function () {

            this.setLoading(true);

            //NGCOM-623
            //If a returnUrl has been specified in the url query and there
            //is no returnUrl value provided by the server,
            //we'll use the one specified in the url query. If a returnURl has been
            //provided by the server, it will live in an invisible input in the
            //login links box.

            var returnUrl = "";
            var returnUrlParam = new URLSearchParams(window.location.search).get('returnUrl'); // jshint ignore:line
            if (returnUrlParam && !this.$parent.find('input[name=returnUrl]').val()){
              returnUrl = returnUrlParam;
            } else {
              returnUrl = this.$parent.find('input[name=returnUrl]').val();
            }


            api.action('customer', 'loginStorefront', {
                email: this.$parent.find('[data-mz-login-email]').val(),
                password: this.$parent.find('[data-mz-login-password]').val()
            }).then(this.handleLoginComplete.bind(this, returnUrl), this.displayApiMessage);

        },
        anonymousorder: function() {
            var email = "";
            var billingZipCode = "";
            var billingPhoneNumber = "";

            switch (this.$parent.find('[data-mz-verify-with]').val()) {
                case "zipCode":
                    {
                        billingZipCode = this.$parent.find('[data-mz-verification]').val();
                        email = null;
                        billingPhoneNumber = null;
                        break;
                    }
                case "phoneNumber":
                    {
                        billingZipCode = null;
                        email = null;
                        billingPhoneNumber = this.$parent.find('[data-mz-verification]').val();
                        break;
                    }
                case "email":
                    {
                        billingZipCode = null;
                        email = this.$parent.find('[data-mz-verification]').val();
                        billingPhoneNumber = null;
                        break;
                    }
                default:
                    {
                        billingZipCode = null;
                        email = null;
                        billingPhoneNumber = null;
                        break;
                    }

            }

            this.setLoading(true);
            // the new handle message needs to take the redirect.
            api.action('customer', 'orderStatusLogin', {
                ordernumber: this.$parent.find('[data-mz-order-number]').val(),
                email: email,
                billingZipCode: billingZipCode,
                billingPhoneNumber: billingPhoneNumber
            }).then(function () { window.location.href = (HyprLiveContext.locals.siteContext.siteSubdirectory||'') +  "/my-anonymous-account?returnUrl="+(HyprLiveContext.locals.siteContext.siteSubdirectory||'')+"/myaccount"; }, _.bind(this.retrieveErrorLabel, this));
        },
        retrievePassword: function () {
            this.setLoading(true);
            api.action('customer', 'resetPasswordStorefront', {
                EmailAddress: this.$parent.find('[data-mz-forgotpassword-email]').val()
            }).then(_.bind(this.displayResetPasswordMessage,this), this.displayApiMessage);
        },
        handleLoginComplete: function (returnUrl) {
            if ( returnUrl ){
                window.location.href= returnUrl;
            }else{
                window.location.reload();
            }
        },
        displayResetPasswordMessage: function () {
            this.displayMessage(Hypr.getLabel('resetEmailSent'));
        }
    });

    var SignupPopover = function() {
        DismissablePopover.apply(this, arguments);
        this.signup = _.debounce(this.signup, 150);
    };
    SignupPopover.prototype = new DismissablePopover();
    $.extend(SignupPopover.prototype, LoginPopover.prototype, {
        boundMethods: ['handleEnterKey', 'dismisser', 'displayMessage', 'displayApiMessage', 'createPopover', 'signup', 'onPopoverShow'],
        template: Hypr.getTemplate('modules/common/signup-popover').render(),
        bindListeners: function (on) {
            var onOrOff = on ? "on" : "off";
            this.$parent[onOrOff]('click', '[data-mz-action="signup"]', this.signup);
            this.$parent[onOrOff]('keypress', 'input', this.handleEnterKey);
        },
        handleEnterKey: function (e) {
            if (e.which === 13) { this.signup(); }
        },
        validate: function (payload) {
            if (!payload.account.emailAddress) return this.displayMessage(Hypr.getLabel('emailMissing')), false;
            if (!payload.password) return this.displayMessage(Hypr.getLabel('passwordMissing')), false;
            if (payload.password !== this.$parent.find('[data-mz-signup-confirmpassword]').val()) return this.displayMessage(Hypr.getLabel('passwordsDoNotMatch')), false;
            return true;
        },
        signup: function () {
            var self = this,
                email = this.$parent.find('[data-mz-signup-emailaddress]').val(),
                firstName = this.$parent.find('[data-mz-signup-firstname]').val(),
                lastName = this.$parent.find('[data-mz-signup-lastname]').val(),
                payload = {
                    account: {
                        emailAddress: email,
                        userName: email,
                        firstName: firstName,
                        lastName: lastName,
                        contacts: [{
                            email: email,
                            firstName: firstName,
                            lastNameOrSurname: lastName
                        }]
                    },
                    password: this.$parent.find('[data-mz-signup-password]').val()
                };
            if (this.validate(payload)) {
                //var user = api.createSync('user', payload);
                this.setLoading(true);
                return api.action('customer', 'createStorefront', payload).then(function () {
                    if (self.redirectTemplate) {
                        window.location.pathname = self.redirectTemplate;
                    }
                    else {
                        window.location.reload();
                    }
                }, self.displayApiMessage);
            }
        }
    });
    var MyAccountPopover = function(e){
        var self = this;
        this.init = function(el){
            self.popoverEl = $('#my-account-content');
            self.bindListeners.call(el, true);
            $('#my-account').attr('href','#');
        };
        this.bindListeners =  function (on) {
            var onOrOff = on ? "on" : "off";
            //$(this).parent()[onOrOff]('mouseover', '[data-mz-action="my-account"]', self.openPopover);
            $(this).parent()[onOrOff]('click', '[data-mz-action="my-account"]', self.openPopover);
            // bind other events
        };
        this.openPopover = function(e){
            //self.popoverEl.popover('show');
            e.preventDefault(); 
            $("#my-account").popover({
                html : true,
                placement : 'bottom',
                content: function() {
                  return self.popoverEl.html();
                }                
            }); //.popover('show');
        };
    };
        
    var LoginRegistrationModal = function(){
        var self = this;
        this.init = function(el){
            self.modalEl = $('#liteRegistrationModal');
            self.bindListeners.call(el, true);
            self.doLogin = _.debounce(self.doLogin, 150);
            self.doSignup = _.debounce(self.doSignup, 150);
            api.get('attributedefinition').then(function(attribute) {
                console.log(attribute.data.items);
                for(var i=0; i< attribute.data.items.length; i++){
                    if(attribute.data.items[i].attributeCode === "recovery-question"){
                        var recVals = attribute.data.items[i].vocabularyValues;
                        for(var j=0; j<recVals.length; j++){
                            $('<option/>').text(recVals[j].content.value).attr('value',recVals[j].value).appendTo('#recoveryQuestionList');
                        }
                    }
                }
            });
        };

        this.bindListeners =  function (on) {
            var onOrOff = on ? "on" : "off";
            $(this).parent()[onOrOff]('click', '[data-mz-action="lite-registration"]', self.openLiteModal);
            $(this).parents('.mz-utilitynav')[onOrOff]('click', '[data-mz-action="doLogin"]', self.doLogin);
            $(this).parents('.mz-utilitynav')[onOrOff]('click', '[data-mz-action="doSignup"]', self.doSignup);
            
            // bind other events
        };

        this.openLiteModal = function(){
            if (self.modalEl[0] == $("#liteRegistrationModal")[0]) {
                $(".second-tab").show();
                $(".third-tab").hide();
            }
            self.modalEl.modal('show');
        };

        this.doLogin = function(){
            //console.log("Write business logic for Login form submition");
            var returnUrl = $('#returnUrl').val();
            var payload = {
                email: $(this).parents('#login').find('[data-mz-login-email]').val(),
                password: $(this).parents('#login').find('[data-mz-login-password]').val()
            };
            current = this;
            if (self.validateLogin(this, payload) && self.validatePassword(this, payload)) {   
                //var user = api.createSync('user', payload);
                (LoginPopover.prototype).newsetLoading(true);
                return api.action('customer', 'loginStorefront', {
                    email: $(this).parents('#login').find('[data-mz-login-email]').val(), 
                    password: $(this).parents('#login').find('[data-mz-login-password]').val()
                }).then(function () {
                    if ( returnUrl ){
                        window.location.href= returnUrl;
                    }else{
                        window.location.reload();
                    } 
                }, (LoginPopover.prototype).newdisplayApiMessage);
            } 
        };
        this.validateLogin = function (el, payload) { 
            if (!payload.email) return (LoginPopover.prototype).newdisplayMessage(el, Hypr.getLabel('emailMissing')), false;
            if (!(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(payload.email))) return (LoginPopover.prototype).newdisplayMessage(el, Hypr.getLabel('emailwrongpattern')), false;            
            return true;
        };
        this.doSignup = function(){
            var redirectTemplate = 'myaccount';
            var returnUrl = $('#returnUrl').val();
            var emailupdates = $(this).parents('#newshopper').find('[data-mz-signup-emailupdates]').val();
            var accMarketing = false;
            if(emailupdates === "on")
                accMarketing = true;
            var email = $(this).parents('#newshopper').find('[data-mz-signup-emailaddress]').val().trim();
            var recoveryquestion = $(this).parents('#newshopper').find('[data-mz-signup-recoveryquestion]').val();
            var recoveryanswer = $(this).parents('#newshopper').find('[data-mz-signup-recoveryanswer]').val().trim();
            var payload = {
                account: {
                    emailAddress: email,
                    userName: email,
                    acceptsMarketing: accMarketing,
                    contacts: [{
                        email: email
                    }],
                    attributes: [
                      {
                         //"attributeDefinitionId": "14",
                         "fullyQualifiedName": "tenant~recovery-question",
                         "values": [recoveryquestion]
                      },
                      {
                         //"attributeDefinitionId": "16",
                         "fullyQualifiedName": "tenant~recovery-answer",
                         "values": [recoveryanswer]
                      }
                   ]               
                },
                password: $(this).parents('#newshopper').find('[data-mz-signup-password]').val()
            };
            current = this; 
            if (self.validateSignup(this, payload) && self.validatePassword(this, payload)) {   
                //var user = api.createSync('user', payload);
                (LoginPopover.prototype).newsetLoading(true);
                return api.action('customer', 'createStorefront', payload).then(function () {
                    if(returnUrl){
                        window.location.href = returnUrl;
                    }else if (redirectTemplate) {
                        window.location.pathname = redirectTemplate;
                    } else {
                        window.location.reload();
                    }
                }, (LoginPopover.prototype).newdisplayApiMessage);
            }
        };
        this.validatePassword = function(el, payload){
            if (!payload.password) 
                return (LoginPopover.prototype).newdisplayMessage(el, Hypr.getLabel('passwordMissing')), false; 
            if (payload.password.length < 6) {
                return (LoginPopover.prototype).newdisplayMessage(el, Hypr.getLabel('passwordlength')), false;
            } else if (payload.password.length > 50) {
                return (LoginPopover.prototype).newdisplayMessage(el, Hypr.getLabel('passwordlength')), false;
            } else if (payload.password.search(/\d/) == -1) {
                return (LoginPopover.prototype).newdisplayMessage(el, Hypr.getLabel('passwordlength')), false;
            } else if (payload.password.search(/[a-zA-Z]/) == -1) {
                return (LoginPopover.prototype).newdisplayMessage(el, Hypr.getLabel('passwordlength')), false;
            } else if (payload.password.search(/[^a-zA-Z0-9\!\@\#\$\%\^\&\*\(\)\_\+\.\,\;\:]/) != -1) {
                return (LoginPopover.prototype).newdisplayMessage(el, Hypr.getLabel('passwordlength')), false;
            }
            return true;
        };
        this.validateSignup = function (el, payload) { 
            if (!payload.account.emailAddress) return (LoginPopover.prototype).newdisplayMessage(el, Hypr.getLabel('emailMissing')), false;
            if (!(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(payload.account.emailAddress))) return (LoginPopover.prototype).newdisplayMessage(el, Hypr.getLabel('emailwrongpattern')), false;                       
            if (payload.password !== $(el).parents('#newshopper').find('[data-mz-signup-confirmpassword]').val()) return (LoginPopover.prototype).newdisplayMessage(el, Hypr.getLabel('passwordsDoNotMatch')), false;
            if (payload.account.attributes.recoveryquestion === "0") return (LoginPopover.prototype).newdisplayMessage(el, Hypr.getLabel('chooseRecoveryQuestion')), false;
            if($('#recoveryQuestionList').val() === "0") return (LoginPopover.prototype).newdisplayMessage(el, Hypr.getLabel('chooseRecoveryQuestion')), false;
            if(!$('#recoveryAnswer').val()) return (LoginPopover.prototype).newdisplayMessage(el, Hypr.getLabel('recoveryAnswerMissing')), false;
            return true;
        };
    };
    $(document).ready(function() {
        $docBody = $(document.body);

        $('[data-mz-action="lite-registration"]').each(function() {
            var modal = new LoginRegistrationModal();
            modal.init(this);
        });
        $('#my-account').attr('href','#');
        $('[data-mz-action="my-account"]').click(function() {
            var popover = new MyAccountPopover();
            popover.init(this);
            $(this).data('mz.popover', popover);
        });
        $("#my-account").popover({
                html : true,
                placement : 'bottom',
                content: function() {
                  return $('#my-account-content').html();
                }                
            });
        /*$('[data-mz-action="my-account"]').hover(function() {
            var popover = new MyAccountPopover();
            popover.init(this);
            $(this).data('mz.popover', popover);
        });
        $(document).on('mouseleave','#mz-logged-in-notice',function(){
            $('#my-account').popover('hide');
        });
        */  
        $('body').on('touchend click', function (e) {
            //only buttons
            if ($(e.target).data('toggle') !== 'popover' && !$(e.target).parents().is('.popover.in')) { 
                $('[data-toggle="popover"]').popover('hide');
            }
        });

        $('[data-mz-action="login"]').each(function() {
            var popover = new LoginPopover();
            popover.init(this);
            $(this).data('mz.popover', popover);
        });
        $('[data-mz-action="signup"]').each(function() {
            var popover = new SignupPopover();
            popover.init(this);
            $(this).data('mz.popover', popover);
        });
        $('[data-mz-action="continueAsGuest"]').on('click', function(e) {
            e.preventDefault();
            var returnURL = returnUrl();
            if(returnURL .indexOf('checkout') === -1) {
                returnURL = '';
            }

            //saveUserId=true Will logut the current user while persisting the state of the current shopping cart
            $.ajax({
                    method: 'GET',
                    url: '../../logout?saveUserId=true&returnUrl=' + returnURL,
                    complete: function(data) {
                        location.href = require.mozuData('pagecontext').secureHost + '/' + returnURL;
                    }
            });

        });
        $('[data-mz-action="launchforgotpassword"]').each(function() {
            var popover = new LoginPopover();
            popover.init(this);
            $(this).data('mz.popover', popover);
        });
        $('[data-mz-action="signuppage-submit"]').each(function(){
            var signupPage = new SignupPopover();
            signupPage.formSelector = 'form[name="mz-signupform"]';
            signupPage.pageType = 'signup';
            signupPage.redirectTemplate = 'myaccount';
            signupPage.init(this);
        });
        $('[data-mz-action="loginpage-submit"]').each(function(){
            var loginPage = new SignupPopover();
            loginPage.formSelector = 'form[name="mz-loginform"]';
            loginPage.pageType = 'login';
            loginPage.init(this);
        });
        $('[data-mz-action="anonymousorder-submit"]').each(function () {
            var loginPage = new SignupPopover();
            loginPage.formSelector = 'form[name="mz-anonymousorder"]';
            loginPage.pageType = 'anonymousorder';
            loginPage.init(this);
        });
        $('[data-mz-action="forgotpasswordpage-submit"]').each(function(){
            var loginPage = new SignupPopover();
            loginPage.formSelector = 'form[name="mz-forgotpasswordform"]';
            loginPage.pageType = 'retrievePassword';
            loginPage.init(this);
        });

        $(".ml-navbar-secondary .panel-body").each(function() {
            var headingElemnt = $(this).parent().parent().find("a[aria-controls]");
            if ($(this).text().trim() === "" && headingElemnt.data("target")) {
                headingElemnt.find("span").hide();
                headingElemnt.attr("href", "/c/" + headingElemnt.data("target").replace("#sub-nav-", "").replace("#main-nav-", ""));
                headingElemnt.removeAttr("aria-expanded aria-controls data-toggle role");
            }
        });

        $('[data-mz-action="logout"]').each(function(){
            var el = $(this);

            //if were in edit mode, we override the /logout GET, to preserve the correct referrer/page location | #64822
            if (require.mozuData('pagecontext').isEditMode) {

                 el.on('click', function(e) {
                    e.preventDefault();
                    $.ajax({
                        method: 'GET',
                        url: '../../logout',
                        complete: function() { location.reload();}
                    });
                });
            }

        });
    });

});
