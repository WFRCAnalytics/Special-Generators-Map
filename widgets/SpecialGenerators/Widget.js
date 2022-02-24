//javascript for controlling Special Generator WebMap
//written by Bill Hereth February 2022

var dChartX = [2019, 2030, 2040, 2050];

var dChartSeries = [
    { label: "Jobs"               , category: "JB"  },
    { label: "Households"         , category: "HH"  },
    { label: "Jobs and Households", category: "COMP"}
];

var dChartLineTypes_TAZ    = [];
var dChartLineTypes_Area = [];

var fnTAZID = "CO_TAZID";

//ATO Variables
var curCategory = '';
var curSpecGen  = '';
var curDisplay  = '';
var lyrTAZ;
var lyrAreas;
var lyrDispLayers = []          ;
var sDispLayersP  = "ATO_gdb - "; //prefix for layer names
var sDispLayers   = []          ; //layer name for all display layers (filled programatically)
var sTAZLayer     = "TAZ_ATO"   ; //layer name for TAZs
var sAreasLayer   = "Areas_ATO" ; //layer name for Areas
var sCDefaultGrey = "#CCCCCC"   ; //color of default line
var sFNATOTAZID   = "TAZID"     ; //field name for TAZID
var sFNATOBinP    = "BIN_"      ; //field name for display (color) using bins
var chartkey      = []          ;
var chartdata     = []          ;

var minScaleForLabels = 87804;
var labelClassOn;
var labelClassOff;
var sCWhite = "#FFFFFF";
var dHaloSize = 2.0;

var bindata;

var iPixelSelectionTolerance = 5;

define(['dojo/_base/declare',
        'jimu/BaseWidget',
        'jimu/LayerInfos/LayerInfos',
        'dijit/registry',
        'dojo/dom',
        'dojo/dom-style',
        'dijit/dijit',
        'dojox/charting/Chart',
        'dojox/charting/themes/Claro',
        'dojox/charting/themes/Julie',
        'dojox/charting/SimpleTheme',
        'dojox/charting/plot2d/Scatter',
        'dojox/charting/plot2d/Markers',
        'dojox/charting/plot2d/Columns',
        'dojox/charting/widget/Legend',
        'dojox/charting/action2d/Tooltip',
        'dojox/layout/TableContainer',
        'dojox/layout/ScrollPane',
        'dijit/layout/ContentPane',
        'jimu/PanelManager',
        'dijit/form/TextBox',
        'dijit/form/ToggleButton',
        'jimu/LayerInfos/LayerInfos',
        'esri/tasks/query',
        'esri/tasks/QueryTask',
        'esri/layers/FeatureLayer',
        'esri/dijit/FeatureTable',
        'esri/symbols/SimpleFillSymbol',
        'esri/symbols/SimpleLineSymbol',
        'esri/symbols/SimpleMarkerSymbol',
        'esri/symbols/TextSymbol',
        'esri/symbols/Font',
        'esri/layers/LabelClass',
        'esri/InfoTemplate',
        'esri/Color',
        'esri/map',
        'esri/renderers/UniqueValueRenderer',
        'esri/geometry/Extent',
        'dojo/store/Memory',
        'dojox/charting/StoreSeries',
        'dijit/Dialog',
        'dijit/form/Button',
        'dijit/form/RadioButton',
        'dijit/form/MultiSelect',
        'dojox/form/CheckedMultiSelect',
        'dijit/form/Select',
        'dijit/form/ComboBox',
        'dijit/form/CheckBox',
        'dojo/store/Observable',
        'dojox/charting/axis2d/Default',
        'dojo/domReady!'],
function(declare, BaseWidget, LayerInfos, registry, dom, domStyle, dijit, Chart, Claro, Julie, SimpleTheme, Scatter, Markers, Columns, Legend, Tooltip, TableContainer, ScrollPane, ContentPane, PanelManager, TextBox, ToggleButton, LayerInfos, Query, QueryTask, FeatureLayer, FeatureTable, SimpleFillSymbol, SimpleLineSymbol, SimpleMarkerSymbol, TextSymbol, Font, LabelClass, InfoTemplate, Color, Map, UniqueValueRenderer, Extent, Memory, StoreSeries, Dialog, Button, RadioButton, MutliSelect, CheckedMultiSelect, Select, ComboBox, CheckBox, Observable) {
    //To create a widget, you need to derive from BaseWidget.
    
    return declare([BaseWidget], {
        // DemoWidget code goes here

        //please note that this property is be set by the framework when widget is loaded.
        //templateString: template,

        baseClass: 'jimu-widget-demo',
        
        postCreate: function() {
            this.inherited(arguments);
            console.log('postCreate');
        },

        startup: function() {
            console.log('startup');
            
            this.inherited(arguments);
            this.map.setInfoWindowOnClick(false); // turn off info window (popup) when clicking a feature
            
            //Widen the widget panel to provide more space for charts
            //var panel = this.getPanel();
            //var pos = panel.position;
            //pos.width = 500;
            //panel.setPosition(pos);
            //panel.panelManager.normalizePanel(panel);
            
            var parent = this;

            //when zoom finishes run changeZoom to update label display
            this.map.on("zoom-end", function (){    
                parent.changeZoom();    
            });    


            for (_display in dDisplayOptions) {
                for (_mode in dModeOptions) {
                    for (_category in dCategoryOptions) {
                        _name = dDisplayOptions[_display]['value'] + "_" + dModeOptions[_mode]['value'] + '_' + dCategoryOptions[_category]['value'];
                        sDispLayers.push(_name);
                    }
                }
            }

            //setup json data for chart for only
            for (_chartx in dChartX) {
                for (_mode in dModeOptions) {
                    for (_category in dCategoryOptions) {
                        _name = "YEAR_" + dChartX[_chartx] + "_" + dModeOptions[_mode]['value'] + '_' + dCategoryOptions[_category]['value'];
                        //Populate chartdata array of objects
                        dojo.xhrGet({
                            url: "widgets/ATOSidebar/data/" + _name + ".json",
                            jname        : _name,
                            jyear        : dChartX[_chartx],
                            jmode        : dModeOptions[_mode]['value'],
                            jcategory: dCategoryOptions[_category]['value'],
                            handleAs: "json",
                            load: function(obj,getdetails) {
                                    /* here, obj will already be a JS object deserialized from the JSON response */
                                    //chartkey.push([{ jname: getdetails.args['jname'], jyear: getdetails.args['jyear'], jmode: getdetails.args['jmode'], category: getdetails.args['jcategory']}]);
                                    chartkey.push(getdetails.args['jname']);
                                    chartdata.push(obj);
                            },
                            error: function(err) {
                                    /* this will execute if the response couldn't be converted to a JS object,
                                            or if the request was unsuccessful altogether. */
                            }
                        });
                    }
                }
            }
            
            
            //Initialize Selection Layer, FromLayer, and ToLayer and define selection colors
            var layerInfosObject = LayerInfos.getInstanceSync();
            for (var j=0, jl=layerInfosObject._layerInfos.length; j<jl; j++) {
                var currentLayerInfo = layerInfosObject._layerInfos[j];        
                if (currentLayerInfo.title == sAreasLayer) { //must mach layer title
                    lyrAreas = layerInfosObject._layerInfos[j].layerObject;
                } else if (currentLayerInfo.title == sTAZLayer) {
                    lyrTAZ = layerInfosObject._layerInfos[j].layerObject;
                }
            }

            //populate arrays of layers for display
            for (s in sDispLayers) {
                var layerInfosObject = LayerInfos.getInstanceSync();
                for (var j=0, jl=layerInfosObject._layerInfos.length; j<jl; j++) {
                    var currentLayerInfo = layerInfosObject._layerInfos[j];        
                    if (currentLayerInfo.title == sDispLayersP + (sDispLayers[s]).replace(/_/g, ' ')) { //must mach layer title
                        //push layer into array
                        lyrDispLayers.push(layerInfosObject._layerInfos[j].layerObject);
                    }
                }
            }

            //Populate BinData Object
            dojo.xhrGet({
                url: "widgets/ATOSidebar/data/bindata.json",
                handleAs: "json",
                load: function(obj) {
                        /* here, obj will already be a JS object deserialized from the JSON response */
                        console.log('bindata.json');
                        bindata = obj;
                        _CurDisplayItem = dDisplayOptions.filter( function(dDisplayOptions){return (dDisplayOptions['value']==curDisplay);} );
                        parent.setLegendBar(_CurDisplayItem[0]['label']);
                        parent.updateDisplayLayer();
                },
                error: function(err) {
                        /* this will execute if the response couldn't be converted to a JS object,
                                or if the request was unsuccessful altogether. */
                }
            });

            //Populate AverageValues Object
            dojo.xhrGet({
                url: "widgets/ATOSidebar/data/averagevalues.json",
                handleAs: "json",
                load: function(obj) {
                        /* here, obj will already be a JS object deserialized from the JSON response */
                        console.log('averagevalues.json');
                        averagevalues = obj;
                },
                error: function(err) {
                        /* this will execute if the response couldn't be converted to a JS object,
                                or if the request was unsuccessful altogether. */
                }
            });


            cmbMode = new Select({
                id: "selectMode",
                name: "selectModeName",
                options: dModeOptions,
                onChange: function(){
                    curMode = this.value;
                    parent.updateDisplayLayer();
                    parent.setLegendBar();
                    parent.updateChart();
                    parent.updateShed();
                    //parent.loadJsonData();
                }
                }, "cmbMode");
            curMode = "AUTO";
            cmbMode.startup();




            // create a text symbol to define the style of labels
            var volumeLabel = new TextSymbol();
            volumeLabel.font.setSize("8pt");
            volumeLabel.font.setFamily("arial");
            volumeLabel.font.setWeight(Font.WEIGHT_BOLD);
            volumeLabel.setHaloColor(sCWhite);
            volumeLabel.setHaloSize(dHaloSize);

            //Setup empty volume label class for when toggle is off
            labelClassOff = ({
                minScale: minScaleForLabels,
                labelExpressionInfo: {expression: ""}
            })
            labelClassOff.symbol = volumeLabel;
        
            //Create a JSON object which contains the labeling properties. At the very least, specify which field to label using the labelExpressionInfo property. Other properties can also be specified such as whether to work with coded value domains, fieldinfos (if working with dates or number formatted fields, and even symbology if not specified as above)
            labelClassOn = {
                minScale: minScaleForLabels,
                labelExpressionInfo: {expression: "$feature.LABEL"}
            };
            labelClassOn.symbol = volumeLabel;
            
            //Check box change events
            dom.byId("chkLabels").onchange = function(isChecked) {
                parent.checkVolLabel();
            };
            

            // Create the chart within it's "holding" node
            // Global so users can hit it from the console
            chartATO = new Chart("chartATO", {
                title: "Accessible Jobs/Households",
                subtitle: "for Selected Zone",
                titlePos: "top",
                titleFont: "normal normal bold 10pt Verdana",
                titleGap: 5,
                fill: sCDefaultGrey
            });
    
    
            var myTheme = new SimpleTheme({
                markers: {
                    CIRCLE: "m-3,0 c0,-4 6,-4 6,0, m-6,0 c0,4 6,4 6,0",
                    SQUARE: "m-3,-3 6,0 0,6 -6,0z",
                    CIRCLE: "m-3,0 c0,-4 6,-4 6,0, m-6,0 c0,4 6,4 6,0",
                    SQUARE: "m-3,-3 6,0 0,6 -6,0z"
                }
            });
            
            // Set the theme
            chartATO.setTheme(myTheme);
    
            // Add the only/default plot 
            chartATO.addPlot("default", {type: "Markers"})
                .addAxis("x",
                    { 
                        minorTickStep: 10,
                        majorTickStep: 10,
                        font: "normal normal normal 8pt Verdana",
                        labels: [
                            {value: 2012, text: "2012"},
                            {value: 2013, text: "2013"},
                            {value: 2014, text: "2014"},
                            {value: 2015, text: "2015"},
                            {value: 2016, text: "2016"},
                            {value: 2017, text: "2017"},
                            {value: 2018, text: "2018"},
                            {value: 2019, text: "2019"},
                            {value: 2020, text: "2020"},
                            {value: 2021, text: "2021"},
                            {value: 2022, text: "2022"},
                            {value: 2023, text: "2023"},
                            {value: 2024, text: "2024"},
                            {value: 2025, text: "2025"},
                            {value: 2026, text: "2026"},
                            {value: 2027, text: "2027"},
                            {value: 2028, text: "2028"},
                            {value: 2029, text: "2029"},
                            {value: 2030, text: "2030"},
                            {value: 2031, text: "2031"},
                            {value: 2032, text: "2032"},
                            {value: 2033, text: "2033"},
                            {value: 2034, text: "2034"},
                            {value: 2035, text: "2035"},
                            {value: 2036, text: "2036"},
                            {value: 2037, text: "2037"},
                            {value: 2038, text: "2038"},
                            {value: 2039, text: "2039"},
                            {value: 2040, text: "2040"},
                            {value: 2041, text: "2041"},
                            {value: 2042, text: "2042"},
                            {value: 2043, text: "2043"},
                            {value: 2044, text: "2044"},
                            {value: 2045, text: "2045"},
                            {value: 2046, text: "2046"},
                            {value: 2047, text: "2047"},
                            {value: 2048, text: "2048"},
                            {value: 2049, text: "2049"},
                            {value: 2050, text: "2050"},
                            {value: 2051, text: "2051"},
                            {value: 2052, text: "2052"}
                            ],
                        //labels: [
                        //                {value:2000, text:"2000"},
                        //                {value:2010, text:"2010"},
                        //                {value:2020, text:"2020"},
                        //                {value:2030, text:"2030"},
                        //                {value:2040, text:"2040"},
                        //                {value:2050, text:"2050"},
                        //            ],
                        /*title: "Year",*/
                        titleOrientation: "away",
                        titleFont: "normal normal normal 10pt Verdana",
                        titleGap: 10,
                        min: 2015,
                        max: 2052
                    }
                )
                .addAxis("y",
                    {
                        vertical: true,
                        min: 0/*,
                        title : "AADT"*/
                    }
                )

            dChartLineTypes_TAZ = [
                {stroke: {color: new Color([230,     0, 169, 0.9]), width: 1}, fill: new Color([230,     0, 169, 0.9])},
                {stroke: {color: new Color([230,     0, 169, 0.9]), width: 1}, fill: new Color([230,     0, 169, 0.9])}
            ];
            
            dChartLineTypes_Area = [
                {stroke: {color: new Color([100, 100, 100, 0.9]), width: 1}, fill: new Color([100, 100, 100, 0.9])},
                {stroke: {color: new Color([100, 100, 100, 0.9]), width: 1}, fill: new Color([100, 100, 100, 0.9])}
            ];

            var anim_a = new Tooltip(chartATO, "default");

            // Create the legend
            legendATO = new Legend({ chart: chartATO, horizontal: false }, "legendATO");


            //initial functions to run
            this.updateDisplayLayer();
            this.changeZoom();

            new ToggleButton({
                showLabel: true,
                checked: false,
                onChange: function(val) {
                    if (val) {
                        this.set('label',"ON");
                    } else {
                        this.set('label',"OFF");
                    }
                    parent.checkShed(val);
                },
                label: "OFF"
            }, "traveltoggle");

        },

        updateChart: function() {
            //get chart data for current area
            
            var _seriesnames = [];
            //var _xychartdatabyseries = [];

            //Remove existing series
            while( chartATO.series.length > 0 ) {
                chartATO.removeSeries(chartATO.series[0].name);
            }
            
            if (curTAZ!=0) {

                //get chart data for selected TAZ
                for (_series in dChartSeries) { //series is category

                    if (dChartSeries[_series]['category'] == curCategory) {//only show for current category
                        
                        //var _catlabeltaz    = "Accessible "                 + dChartSeries[_series]['label'] + " for TAZ " + curTAZ.toString();
                        var _catlabeltaz    = "TAZ " + curTAZ.toString().substr(-4);
                        var _category = dChartSeries[_series]['category'];
                        //_seriesnames.push(_catlabel);
                        var _xyseriesdatataz    = [];
                        for (_x in dChartX) {
                            _year         = dChartX[_x];
                            //construct name of data
                            var _nametaz    = 'YEAR_' + _year.toString() + '_' + curMode + '_' + _category;

                            //check key location for given name
                            var _chartkeyloc = chartkey.indexOf(_nametaz);

                            //get taz values
                            if (_chartkeyloc >= 0) {
                                var _chartdatafiltered = chartdata[_chartkeyloc]
                                var _chartdatarecord = _chartdatafiltered.filter( function(_chartdatafiltered){return (_chartdatafiltered['Z']==curTAZ);} );
                                //should only be one value
                                _taz_value = _chartdatarecord[0]['V'];
                                _xyseriesdatataz.push({x:_year,y:_taz_value});
                                
                                if (_year == 2019) {
                                    _taz_2019value = _taz_value;
                                } else if (_year == 2050) {
                                    _taz_2050value = _taz_value;
                                    _taz_netgvalue = _taz_2050value - _taz_2019value;
                                }
                            }

                        }
                        //_xychartdatabyseries.push(xyseriesdata);
                        chartATO.addSeries(_catlabeltaz , _xyseriesdatataz , dChartLineTypes_TAZ [_series]);
                    }
                }

                //get chart data for selected area
                for (_series in dChartSeries) { //series is category

                    if (dChartSeries[_series]['category'] == curCategory) { //only show for current category 

                        var _modedata    = dModeOptions.filter( function(dModeOptions){return (dModeOptions['value']==curMode);} );

                        var _charttitle = "Accessible " + dChartSeries[_series]['label'] + " by " + _modedata[0]['name'];

                        var _max_yscale = _modedata[0]['max_yscale'];
                        var _ymajor         = _modedata[0]['ymajor'        ];

                        //var _catlabelarea = "Average Accessible " + dChartSeries[_series]['label'] + " for " + this.getcurSpecGenName();
                        var _catlabelarea = "Average for " + this.getcurSpecGenName();
                        var _category = dChartSeries[_series]['category'];
                        //_seriesnames.push(_catlabel);
                        var _xyseriesdataarea = [];
                        for (_x in dChartX) {
                            _year         = dChartX[_x];
                            //construct name of data
                            var _namearea = 'YEAR_' + _year.toString() + '_' + curMode + '_' + _category + '_' + curSpecGen;

                            //query area object
                            var _averagevaluesrecord = averagevalues.filter( function(averagevalues){return (averagevalues['Name']==_namearea);} );
                            
                            //should only be one value
                            if (_averagevaluesrecord.length > 0) {
                                _areavalue = _averagevaluesrecord[0]['Average'];
                                _xyseriesdataarea.push({x:_year,y:_areavalue});
                                
                                if (_year == 2019) {
                                    _area2019value = _areavalue;
                                } else if (_year == 2050) {
                                    _area2050value = _areavalue;
                                    _areanetgvalue = _area2050value - _area2019value;

                                    _pavg2019value = _taz_2019value / _area2019value;
                                    _pavg2050value = _taz_2050value / _area2050value;
                                    _pavgnetgvalue = _taz_netgvalue / _areanetgvalue;
                                    
                                }
                            }
                        }
                        //_xychartdatabyseries.push(xyseriesdata);
                        chartATO.addSeries(_catlabelarea, _xyseriesdataarea, dChartLineTypes_Area[_series]);
                    }

                    var _modename = dModeOptions.filter( function(dModeOptions){return (dModeOptions['value']==curMode);} );
                    
                    chartATO.addAxis("y",
                    {
                        vertical: true,
                        //fixLower: "major",
                        //fixUpper: "major",
                        //minorTickStep: 10,
                        majorTickStep: _ymajor,
                        min: 0,
                        max: _max_yscale/*,
                        title : "AADT"*/
                    });

                }
                
                ////Update Table

                dom.byId("taz_name").innerHTML = _catlabeltaz;
                dom.byId("areaname").innerHTML = _catlabelarea;
                dom.byId("pavgname").innerHTML = "% of<br/>Average";
                
                dom.byId("rowname2019").innerHTML = "<p class = \"thicker\">2019</p>";
                dom.byId("rowname2050").innerHTML = "<p class = \"thicker\">Future (2050)</p>";
                dom.byId("rownamenetg").innerHTML = "<p class = \"thicker\">Net Gain</p>";

                dom.byId("taz_2019value").innerHTML = this.numberWithCommas(Math.round(_taz_2019value/100)*100);
                dom.byId("taz_2050value").innerHTML = this.numberWithCommas(Math.round(_taz_2050value/100)*100);
                dom.byId("taz_netgvalue").innerHTML = this.numberWithCommas(Math.round(_taz_netgvalue/100)*100);
                dom.byId("area2019value").innerHTML = this.numberWithCommas(Math.round(_area2019value/100)*100);
                dom.byId("area2050value").innerHTML = this.numberWithCommas(Math.round(_area2050value/100)*100);
                dom.byId("areanetgvalue").innerHTML = this.numberWithCommas(Math.round(_areanetgvalue/100)*100);
                dom.byId("pavg2019value").innerHTML = (100*_pavg2019value).toFixed(0) + "%";
                dom.byId("pavg2050value").innerHTML = (100*_pavg2050value).toFixed(0) + "%";
                dom.byId("pavgnetgvalue").innerHTML = (100*_pavgnetgvalue).toFixed(0) + "%";

                //
                //for (var i=0; i<tSSFor.data.length; i++) {
                //    dom.byId("vol" + tSSFor.data[i].x + "value").innerHTML= this._NumberWithCommas(tSSFor.data[i].y);
                //}
                
                if (dom.byId("traveltoggle").checked==false) {
                    dom.byId("chartAreaATO").style.display = '';
                    dom.byId("tableATO").style.display = '';
                }
                chartATO.title = _charttitle
                chartATO.resize(330, 280);
                chartATO.render();
                
                legendATO.refresh();

            } else {

                dom.byId("chartAreaATO").style.display = 'none';
                dom.byId("tableATO").style.display = 'none';

            }

            //if (curTAZ == 492092) {
            //this.checkShed(true);
            //} else {
            //    this.checkShed(false);
            //}

        },

        numberWithCommas: function(x) {
            return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        },

        updateRenderer: function() {
            console.log('updateRenderer');

            if (typeof bindata !== 'undefined') {

                curLayer = this.getCurDispLayerLoc();
                curBin = sFNATOBinP + curSpecGen

                //create renderer for display layers
                var defaultLine =    new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, Color.fromHex(sCDefaultGrey), 1) 
                
                //initialize renderer with field name for current bin based on current area
                var _Rndr = new UniqueValueRenderer(null, curBin);
                            
                for (var i=0; i<bindata.length; i++) {
                    _Rndr.addValue({value: i,     symbol: new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, defaultLine, Color.fromHex(bindata[i].Color)), label: bindata[i].Description});
                }
                if (curLayer >= 0) {
                    lyrDispLayers[curLayer].setRenderer(_Rndr);
                    lyrDispLayers[curLayer].setOpacity(0.65);
                    lyrDispLayers[curLayer].refresh();
                }
            }

        },

        getcurSpecGenName: function() {
            var _curSpecGenName = dAreaOptions.filter( function(dAreaOptions){return (dAreaOptions['value']==curSpecGen);} );
            return _curSpecGenName[0]['name'];
        },

        getCurShed: function() {
            var _curShed = dDisplayOptions.filter( function(dDisplayOptions){return (dDisplayOptions['value']==curDisplay);} );
            return _curShed[0]['shed'];
        },
        getCurDispLayerLoc: function() {
            _curLayerName = sDispLayersP + (curDisplay + "_" + curMode + "_" + curCategory).replace(/_/g, ' ');
            for (l in lyrDispLayers) {
                if (lyrDispLayers[l].arcgisProps.title == _curLayerName)
                    return l;
            }
            return -1;
        },

        hideAllDispLayers: function() {
            for (l in lyrDispLayers) {
                lyrDispLayers[l].hide();
            }
        },

        updateDisplayLayer: function() {
            console.log('updateDisplayLayer');
            this.hideAllDispLayers();
            if (curDisplay != '' && curMode != '' && curCategory != '') {
                this.updateRenderer();
                var _loc = this.getCurDispLayerLoc()
                if (_loc >= 0) {
                    lyrDispLayers[_loc].show();
                    this.checkVolLabel();
                }
            }
        },

        loadJsonData: function() {
            console.log('loadJsonData');
            parent = this;
            //Populate ATO datastore
            lyrTAZ.hide();
            dojo.xhrGet({
                url: "widgets/ATOSidebar/data/" + curDisplay + "_" + curMode + "_" + curCategory + "_" + curSpecGen + ".json",
                handleAs: "json",
                load: function(obj) {
                        /* here, obj will already be a JS object deserialized from the JSON response */
                        console.log('forecasts.json');
                        ato = obj;
                        parent.updateATOLayer();
                        //Populate dowFactors DataStore
                        //storeATO = Observable(new Memory({
                        //    data: {
                        //        identifier: "Z",
                        //        label: "V",
                        //        items: ato
                        //    }
                        //}));
                        //parent.UpdateCCSs(curSiteGroup);
                        //parent.UpdateChart();
                },
                error: function(err) {
                        /* this will execute if the response couldn't be converted to a JS object,
                                or if the request was unsuccessful altogether. */
                }
            });

        },        
                
        setLegendBar: function() {
            console.log('setLegendBar');

            _curdisplayitem = dDisplayOptions.filter( function(dDisplayOptions){return (dDisplayOptions['value']==curDisplay);} );
            _curcategoryitem = dCategoryOptions.filter( function(dCategoryOptions){return (dCategoryOptions['value']==curCategory);} );
            _curmodeitem = dModeOptions.filter( function(dModeOptions){return (dModeOptions['value']==curMode);} );

            var _sLegend = _curmodeitem[0]['name'] + " " + _curcategoryitem[0]['name'] + " Compared to Average for " + this.getcurSpecGenName() +    " - " + _curdisplayitem[0]['label'] 

            dom.byId("LegendName").innerHTML = _sLegend;

            if (typeof bindata !== 'undefined') {
                for (var i=0;i<bindata.length;i++)
                    dom.byId("divColor" + (i + 1).toString()).style.backgroundColor = bindata[i].Color;                        
            }
        },

        showLegend: function(){
            console.log('showLegend');
            var pm = PanelManager.getInstance();
            var bOpen = false;
            
            //Close Legend Widget if open
            for (var p=0; p < pm.panels.length; p++) {
                if (pm.panels[p].label == "Legend") {
                    if (pm.panels[p].state != "closed") {
                        bOpen=true;
                        pm.closePanel(pm.panels[p]);
                    }
                }
            }
        
            if (!bOpen) {
                //pm.showPanel(this.appConfig.widgetOnScreen.widgets[WIDGETPOOLID_LEGEND]);
            }
        },

        zoomToSpecGen: function() {
            console.log('zoomToArea');
            if (dom.byId("chkAutoZoom").checked == true) {
                
                var refID = this.label;
                
                queryTask = new esri.tasks.QueryTask(lyrAreas.url);
                
                query = new esri.tasks.Query();
                query.returnGeometry = true;
                query.outFields = ["*"];
                query.where = "SpecGen = '" + curSpecGen + "'";
                
                queryTask.execute(query, showResults);
                
                parent = this;
                
                function showResults(featureSet) {
                    
                    var feature, featureId;
                    
                    //QueryTask returns a featureSet.    Loop through features in the featureSet and add them to the map.
                    
                    if (featureSet.features[0].geometry.type == "polyline" || featureSet.features[0].geometry.type == "polygon") { 
                        //clearing any graphics if present. 
                        parent.map.graphics.clear(); 
                        newExtent = new Extent(featureSet.features[0].geometry.getExtent()) 
                            for (i = 0; i < featureSet.features.length; i++) { 
                                var graphic = featureSet.features[i]; 
                                var thisExtent = graphic.geometry.getExtent(); 

                                // making a union of extent or previous feature and current feature. 
                                newExtent = newExtent.union(thisExtent); 
                                //graphic.setSymbol(sfs); 
                                //graphic.setInfoTemplate(popupTemplate); 
                                parent.map.graphics.add(graphic); 
                            } 
                        parent.map.setExtent(newExtent.expand(1.35)); 
                    }
                }
            }
        },

        changeZoom: function(){
            console.log('changeZoom');
            dScale = this.map.getScale();
            if (dScale < minScaleForLabels) {
                //enable the checkbox
                dom.byId("ATO_Labels").style.display = "inline";
            } else {
                //diable the checkbox
                dom.byId("ATO_Labels").style.display = 'none';
            }
        },

        checkVolLabel: function() {
            console.log('checkVolLabel');
            if (dom.byId("chkLabels").checked == true) {
                lyrDispLayers[this.getCurDispLayerLoc()].setLabelingInfo([ labelClassOn    ] );
            } else {
                lyrDispLayers[this.getCurDispLayerLoc()].setLabelingInfo([ labelClassOff ]);
            }
            
        },

        onOpen: function(){
            console.log('onOpen');
        },

        onClose: function(){
            //this.ClickClearButton();
            console.log('onClose');
        },

        onMinimize: function(){
            console.log('onMinimize');
        },

        onMaximize: function(){
            console.log('onMaximize');
        },

        onSignIn: function(credential){
            /* jshint unused:false*/
            console.log('onSignIn');
        },

        onSignOut: function(){
            console.log('onSignOut');
        },

        //added from Demo widget Setting.js
        setConfig: function(config){
            //this.textNode.value = config.districtfrom;
        var test = "";
        },

        getConfigFrom: function(){
            //WAB will get config object through this method
            return {
                //districtfrom: this.textNode.value
            };
        }

    });
});