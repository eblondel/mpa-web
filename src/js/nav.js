$(document).ready(function() {
    "use strict";
    
    // Redirect old URL to new
    if (document.URL.indexOf("~mpaweb") >= 0){ 
        window.location.replace("https://mpa-web.catalina.grida.no/");
    }
    
    /*if (window.location.hash) {
        changePage(window.location.hash);
    }
    
    $(window).on('hashchange', function(e) {
        changePage(window.location.hash);
    });*/
    
    $(document).on("click", "nav li", function() {
        changePage($(this), $(this).data("where"));
    });
    
    $("#analyzer").on("click", function() {
        changePage(0, "#pageResults");
    });
    
    function changePage(button, page) {
        if (button) {
            $("nav li").removeClass("active");
            button.addClass("active");
        } else if (!button && page == "#pageResults") {
            $("nav li").removeClass("active");
            $("nav li[data-where='#pageResults']").addClass("active");
        }
        
        $(".page").hide();
        $(page).show();
        
        if (page == "#pageResults") {
            if ($("#mpaResultsWrapper").is(":empty")) {
                $("#mpaResultsWrapper").html("<center class='pendingText'>Run the <i>analysis</i> first, then check out the <i>results</i>.</center>");
            }
        } else if (page == "#pageReports") {
            if ($("#mpaReportsWrapper").is(":empty")) {
                $("#mpaReportsWrapper").html("<center class='pendingText'>Run the <i>analysis</i> first, then check out the <i>results</i> to select a <i>report</i>.</center>");
            }
        }
    }
});

$(document).ready(function() {
    "use strict";
    
    $("#ESRI-WLGB_1").trigger("click");
});