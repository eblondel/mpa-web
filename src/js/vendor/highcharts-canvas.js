
// create canvas function from highcharts example http://jsfiddle.net/highcharts/PDnmQ/
(function (H) {
    H.Chart.prototype.createCanvas = function (divId) {
        var svg = this.getSVG(),
            width = parseInt(svg.match(/width="([0-9]+)"/)[1]),
            height = parseInt(svg.match(/height="([0-9]+)"/)[1]),
            canvas = document.createElement('canvas');

        canvas.setAttribute('width', width);
        canvas.setAttribute('height', height);

        if (canvas.getContext && canvas.getContext('2d')) {

            canvg(canvas, svg);

            return canvas.toDataURL("image/png");

        }else{
            alert("Your browser doesn't support this feature, please use a modern browser");
            return false;
        }

    }
}(Highcharts));

