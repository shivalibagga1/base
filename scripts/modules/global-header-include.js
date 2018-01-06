define(
    ['modules/jquery-mozu'],
    function ($) {
        $(function () {
            $('#global-header-wrapper').each(function (index, globalHeader) {
                globalHeader = $(globalHeader);
                var globalHeaderIncludeClosed = sessionStorage.getItem('globalHeaderIncludeClosed');
                if(!globalHeaderIncludeClosed){
                    globalHeader.slideDown();
                }

                globalHeader.on('click','#globalHeaderIncludeCloseBtn',function(){
                    globalHeader.slideUp();
                    sessionStorage.setItem('globalHeaderIncludeClosed', true);
                });
            });
        });
    }
);