define([
    'modules/jquery-mozu',
    "doubletaptogo"
], function($, doubletaptogo) {
    //Sub Dropdown Menu
    function calculatingSubPosition() {
        var leftReference = $(".ml-header-content").offset().left,
            rightReference = leftReference + $(".ml-header-content").outerWidth(),
            colWidth = $(document).width() > 991 ? 235 : 175;
        $(".mz-sitenav-sub-container").css({ "left": 0, "right": "auto" }).addClass("calculating-position").removeClass("calculated-position").each(function() {
            var currentElemnt = $(this),
                leftPosition = -10,
                rightPosition = 0,
                currentDropWidth = 0;
            if ( currentElemnt.find(".sub-level-col").length>=4 && $(document).width() <= 1025) {
                currentElemnt.find(".sub-level-image").hide();
            }
            else {
                currentElemnt.find(".sub-level-image").show();
            }
            currentDropWidth = (colWidth * currentElemnt.find(".sub-level-col").length) + 35 + currentElemnt.find(".sub-level-image").outerWidth()||0;
            if (currentDropWidth < $(".container:eq(0)").outerWidth()) {
                leftPosition = currentElemnt.parents(".mz-sitenav-item-inner").offset().left - 20 - leftReference;
                rightPosition = "auto";
                if (leftPosition + currentDropWidth + leftReference >= rightReference) {
                    leftPosition = "auto";
                    rightPosition = 0;
                }
            }
            currentElemnt.css({ "left": leftPosition, "right": rightPosition });
        }).removeClass("calculating-position").addClass("calculated-position");
    }
    $(document).ready(function() {
        try {
            $('.sub-nav-section li:has(.sub-dropdown-menu)').doubletaptogo();
        } catch (e0) {
            //console.log('Error in loading: ' + e0);
        }
    });
    $(window).resize(function() {
        calculatingSubPosition();
    });
    $('.sub-level-col.col-sm-3').each(function(index, el) {
        var html = $(el).html().trim();
        if (html === "")
            $(el).remove();
    });
    $('.sub-level-image.col-sm-3').each(function(index, el){
         var html = $(el).find('img').attr('src');
         if (html === "" || html === '#')
            $(el).remove();
    });
    calculatingSubPosition();
    //Footer Back to Top
    if ($(".back-to-top").length) {
        $(".back-to-top").click(function() {
            $("html, body").animate({ scrollTop: 0 }, 500);
        });
    }
});