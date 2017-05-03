myApp.initResultsChart = function(data) {
    'use strict';
    var this_ = this;
    console.log(data);
    var chartNames  = jQuery.extend([], data[0]);
    var chartData   = jQuery.extend([], data[1]);
    var dataDisplay = [[],[]];
    var EEZ         = "";
    var AllMPAs     = "";
    
    chartNames      = chartNames.splice(4, (chartNames.length - 4));
    EEZ             = chartData[0].name;
    AllMPAs         = chartData[1].name;
    
    for (var i = 0; i <= 1; i++) {
        data = jQuery.extend({}, chartData[i]); //shallow copy required to delete surface
        delete data.surface; // delete 1st column "Area" (property 'surface')
        chartData[i] = Object.assign({}, data); // If not, it acts like a pointer to the table data.
        
        delete chartData[i].id;
        delete chartData[i].name;
        delete chartData[i].type;
        
        $.each(chartData[i], function(index, value) {
            dataDisplay[i].push(this_.renderStatValue(value, "surface"));
        });
    }
    
    $('#mpaResultsCharts').highcharts({
        chart: {
            type: 'column'
        },title: {
            text: ''
        },xAxis: {
            categories: chartNames
        },yAxis: {
            allowDecimals: false,
            min: 0,
            title: {
                text: 'Area in square kilometers'
            }
        },tooltip: {
            formatter: function () {
                return '<b>' + this.x + '</b><br/>' +
                    this.series.name + ': ' + this.y + '<br/>' +
                    'Total: ' + this.point.stackTotal;
            }
        },plotOptions: {
            column: {
                stacking: 'normal',
            }
        },series: [{
            name: EEZ,
            data: dataDisplay[0],
            stack: 'EEZ',
            color: '#7cb5ec'
        }, {
            name: AllMPAs,
            data: dataDisplay[1],
            stack: 'feature',
            color: '#66c166'
        }]
    });
    
};
