function jsonCallback(jsonObject) {
    setTimeout(function() {
        var modifiedTime    = jsonObject.lastModified;
        var currentTime     = Math.round((new Date()).getTime() / 1000);
        
        if (currentTime < (modifiedTime + 5)) {
            setTimeout(function() {
                location.reload();
            }, 500);
        }
        
        reload_js("json/liveDev.json");
    }, 500);
}

function reload_js(src) {
    $('script[src="' + src + '"]').remove();
    $('<script>').attr('src', src).appendTo('head');
}