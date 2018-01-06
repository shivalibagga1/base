require(["modules/jquery-mozu", "hyprlive", "modules/backbone-mozu", "modules/api"], function($, Hypr, Backbone, api) {
    var PrintOrderView = Backbone.MozuView.extend({
        templateName: 'modules/my-account/print-order',
        printOrder: function(){
          window.print();
        },
        initialize : function(){
            var self = this;
            console.log("HERE");
            var custid = require.mozuData('user');
            var ordid = location.hash.substring(1);
            var categorydetailsurl = '/api/commerce/orders/' + ordid;
            api.request('GET', categorydetailsurl).then(function(resp) {
                var cmpdet = {
                    "name": document.getElementById('companyname').value,
                    "add": document.getElementById('companyaddr').value,
                    "url": document.getElementById('company-url').value
                };
                resp.cmp = cmpdet;
                self.model.set(resp);
                window.view.render();
            });
        },
        render: function() {
          Backbone.MozuView.prototype.render.apply(this);
        }
    });

    $(document).ready(function(){
            var printViewModel = Backbone.MozuModel.extend();
            document.getElementById("print").style.display = "block";
            var printModel = new printViewModel();
            var printOrderView = window.view = new PrintOrderView({
                el: $('#print'),
                model: printModel
            });
            printOrderView.render(); 
    });
});
