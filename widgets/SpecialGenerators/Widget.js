// javascript for controlling Special Generator WebMap
// written by Bill Hereth February 2022

var dChartX = [2019, 2030, 2040, 2050];

var dMapDisplayZones = [
    { label: "TAZ"            , value: "CO_TAZID", minScaleForLabels:   80000 },
    { label: "Medium District", value: "DISTMED" , minScaleForLabels: 1280000 },
    { label: "Large District" , value: "DISTLRG" , minScaleForLabels: 1920000 }
];

var dVolumeOrPercent = [
    { label: "Trips Ends", value: "V"},
    { label: "Percent"   , value: "P" }
];

var dTableValues = [
    { label: "Factors"   , value: "F"},
    { label: "Trips Ends", value: "V"}
];

var sDayType = "1"; // 1:Weekdays
var sDayPart = "0"; // 1:All Day
var sDataPer = "1"; // 1:All Year
var sSpecGen = "UOFU_MAIN";
var sMapDisp = "DISTMED";
var sVol_Per = "P";
var sTablVal = "V";


var wSG;

var dChartLineTypes_TAZ    = [];
var dChartLineTypes_Area = [];

// ATO Variables
var curSpecGen = sSpecGen;
var curMapDisp = sMapDisp;
var curDayType = sDayType;
var curDataPer = sDataPer;
var curDayPart = sDayPart;
var curVol_Per = sVol_Per;
var curTablVal = sTablVal;
var lyrTAZ;
var lyrDispLayers = []          ;
var sDispLayers   = []          ; // layer name for all display layers (filled programatically)
var sTAZLayer     = "TAZ"       ; // layer name for TAZs
var sCDefaultGrey = "#CCCCCC"   ; // color of default line
var sFNSGTAZID    = "SA_TAZID"  ; // field name for TAZID
var chartkey      = []          ;
var chartdata     = []          ;

var minScaleForLabels = 87804;
var labelClassOn;
var labelClassOff;
var sCWhite = "#FFFFFF";
var dHaloSize = 2.0;

var bindata;

var iPixelSelectionTolerance = 5;

var WIDGETPOOLID_LEGEND = 0;

define(['dojo/_base/declare',
        'jimu/BaseWidget',
        'jimu/LayerInfos/LayerInfos',
        'dijit/registry',
        'dojo/dom',
        'dojo/dom-style',
        'dijit/dijit',
        'dojox/charting/Chart',
        'dojox/charting/themes/Claro',
        'dojox/charting/SimpleTheme',
        'dojox/charting/plot2d/Markers',
        'dojox/charting/plot2d/Columns',
        'dojox/charting/widget/Legend',
        'dojox/charting/action2d/Tooltip',
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
        'esri/renderers/ClassBreaksRenderer',
        'esri/geometry/Extent',
        'esri/geometry/Point',
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
        'dojox/grid/DataGrid',
        'dojo/data/ObjectStore',
        'dojo/domReady!'],
function(declare, BaseWidget, LayerInfos, registry, dom, domStyle, dijit, Chart, Claro, SimpleTheme,  Markers, Columns, Legend, Tooltip, PanelManager, TextBox, ToggleButton, LayerInfos, Query, QueryTask, FeatureLayer, FeatureTable, SimpleFillSymbol, SimpleLineSymbol, SimpleMarkerSymbol, TextSymbol, Font, LabelClass, InfoTemplate, Color, Map, ClassBreaksRenderer, Extent, Point, Memory, StoreSeries, Dialog, Button, RadioButton, MutliSelect, CheckedMultiSelect, Select, ComboBox, CheckBox, Observable, DataGrid, ObjectStore) {
    // To create a widget, you need to derive from BaseWidget.
    
    return declare([BaseWidget], {
        // DemoWidget code goes here

        // please note that this property is be set by the framework when widget is loaded.
        // templateString: template,

        baseClass: 'jimu-widget-demo',
        
        postCreate: function() {
            this.inherited(arguments);
            console.log('postCreate');
        },

        startup: function() {
            console.log('startup');
            
            this.inherited(arguments);
            // this.map.setInfoWindowOnClick(false); // turn off info window (popup) when clicking a feature
            
            // Widen the widget panel to provide more space for charts
            // var panel = this.getPanel();
            // var pos = panel.position;
            // pos.width = 500;
            // panel.setPosition(pos);
            // panel.panelManager.normalizePanel(panel);
            
            wSG = this;

            // when zoom finishes run changeZoom to update label display
            this.map.on("zoom-end", function (){    
                wSG._changeZoom();    
            });    


            // Get Special Generators
            dojo.xhrGet({
                url: "widgets/SpecialGenerators/data/specgen.json",
                handleAs: "json",
                load: function(obj) {
                    /* here, obj will already be a JS object deserialized from the JSON response */
                    console.log('specgen.json');
                    specgen = obj;
                    cmbSpecGen = new Select({
                        id: "selectSpecGen",
                        name: "selectSpecGenName",
                        options: specgen,
                        onChange: function(){
                            curSpecGen = this.value;
                            wSG._panToSpecGen();
                            wSG._updateDisplayLayer();
                            wSG._setLegendBar();
                            wSG._updateTableSeason();
                            wSG._updateTableTimeOfDay();
                        }
                    }, "cmbSpecGen");
                    cmbSpecGen.startup();
                    cmbSpecGen.set("value",sSpecGen);
                    wSG._initializeDisplayLayers();
                },
                error: function(err) {
                        /* this will execute if the response couldn't be converted to a JS object,
                                or if the request was unsuccessful altogether. */
                }
            });

            // Map display zones
            var _cmbMapDisplayZone = new Select({
                id: "selectMapDisplayZone",
                name: "selectMapDisplayZoneName",
                options: dMapDisplayZones,
                onChange: function(){
                    curMapDisp = this.value;
                    wSG._updateDisplayLayer();
                    wSG._setLegendBar();
                }
            }, "cmbMapDisplayZone");
            _cmbMapDisplayZone.startup();
            _cmbMapDisplayZone.set("value",sMapDisp);

            // Table value type
            var _cmbTableValues = new Select({
                id: "selectValue",
                name: "selectValueName",
                options: dTableValues,
                onChange: function(){
                    curTablVal = this.value;
                    wSG._updateTableSeason();
                    wSG._updateTableTimeOfDay();
                }
            }, "cmbTableValues");
            _cmbTableValues.startup();
            _cmbTableValues.set("value",sTablVal);

            // create radio buttons for both display of labels and symbology
            wSG._createRadioButtons(dVolumeOrPercent,"divVolumeOrPercentSection"     ,"vol_per"      , sVol_Per      );

            // Get DayType
            dojo.xhrGet({
                url: "widgets/SpecialGenerators/data/codes_daytype.json",
                handleAs: "json",
                load: function(obj) {
                    /* here, obj will already be a JS object deserialized from the JSON response */
                    console.log('codes_daytype.json');
                    daytype = obj;
                    wSG._createRadioButtons(daytype,"divDayTypeSection","daytype",sDayType);
                    wSG._updateTableSeason();
                    wSG._updateTableTimeOfDay();
                },
                error: function(err) {
                        /* this will execute if the response couldn't be converted to a JS object,
                                or if the request was unsuccessful altogether. */
                }
            });
            // Get DataPer
            dojo.xhrGet({
                url: "widgets/SpecialGenerators/data/codes_dataper.json",
                handleAs: "json",
                load: function(obj) {
                    /* here, obj will already be a JS object deserialized from the JSON response */
                    console.log('codes_dataper.json');
                    dataper = obj;
                    wSG._createRadioButtons(dataper,"divDataPerSection","dataper",sDataPer);
                    wSG._updateTableSeason();
                    wSG._updateTableTimeOfDay();
                },
                error: function(err) {
                        /* this will execute if the response couldn't be converted to a JS object,
                                or if the request was unsuccessful altogether. */
                }
            });
            // Get DayParts
            dojo.xhrGet({
                url: "widgets/SpecialGenerators/data/codes_daypart.json",
                handleAs: "json",
                load: function(obj) {
                    /* here, obj will already be a JS object deserialized from the JSON response */
                    console.log('codes_daypart.json');
                    daypart = obj;
                    wSG._createRadioButtons(daypart,"divDayPartSection","daypart",sDayPart);
                    wSG._updateTableSeason();
                    wSG._updateTableTimeOfDay();
                },
                error: function(err) {
                        /* this will execute if the response couldn't be converted to a JS object,
                                or if the request was unsuccessful altogether. */
                }
            });

            // Populate BinData Object
            dojo.xhrGet({
                url: "widgets/SpecialGenerators/data/bindata.json",
                handleAs: "json",
                load: function(obj) {
                    /* here, obj will already be a JS object deserialized from the JSON response */
                    console.log('bindata.json');
                    bindata = obj;
                    // _CurDisplayItem = dDisplayOptions.filter( function(dDisplayOptions){return (dDisplayOptions['value']==curDisplay);} );
                    wSG._setLegendBar();
                    wSG._updateDisplayLayer();
                },
                error: function(err) {
                    /* this will execute if the response couldn't be converted to a JS object,
                        or if the request was unsuccessful altogether. */
                }
            });

          
            // Check box change events
            dom.byId("chkLabels").onchange = function(isChecked) {
                wSG._checkLabel();
            };
            
/*
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
                        // labels: [
                        //                {value:2000, text:"2000"},
                        //                {value:2010, text:"2010"},
                        //                {value:2020, text:"2020"},
                        //                {value:2030, text:"2030"},
                        //                {value:2040, text:"2040"},
                        //                {value:2050, text:"2050"},
                        //            ],
                        // title: "Year",
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
                        min: 0// ,
                        // title : "AADT"
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
            */

            //get dat for table
            dojo.xhrGet({
                url: "widgets/SpecialGenerators/data/SpecGenTAZ_SLDailyTotals.json",
                handleAs: "json",
                load: function(obj) {
                    /* here, obj will already be a JS object deserialized from the JSON response */
                    console.log('SpecGenTAZ_SLDailyTotals.json');
                    dlytot = obj;

                    //Populate dowFactors DataStore
                    storedlytot = Observable(new Memory({
                    data: {
                        identifier: "SpecGen",
                        items: dlytot
                    }
                    }));


                                    
                    //grid = new DataGrid({
                    //    store: storedlytot,
                    //    items: dlytot,
                    //    //query: { id: "*" },
                    //    //queryOptions: {},
                    //    structure: [
                    //        { name: "Period"  , field: "data_period", width: "25%" },
                    //        { name: "Day Type", field: "day_type"   , width: "25%" },
                    //        { name: "Day Part", field: "day_part"   , width: "25%" },
                    //        { name: "Volume"  , field: "Volume"     , width: "25%" }
                    //    ]
                    //}, "grid");
                    //grid.startup();

                    wSG._updateTableSeason();
                    wSG._updateTableTimeOfDay();
                },
                error: function(err) {
                    /* this will execute if the response couldn't be converted to a JS object,
                        or if the request was unsuccessful altogether. */
                }
            }); 
            wSG._changeZoom();
           

            //get dat for table - time of day
            dojo.xhrGet({
                url: "widgets/SpecialGenerators/data/SpecGenTAZ_SLTimeOfDayVolumes.json",
                handleAs: "json",
                load: function(obj) {
                    /* here, obj will already be a JS object deserialized from the JSON response */
                    console.log('SpecGenTAZ_SLTimeOfDayVolumes.json');
                    todtot = obj;

                    //Populate dowFactors DataStore
                    storetodtot = Observable(new Memory({
                    data: {
                        identifier: "SpecGen",
                        items: todtot
                    }
                    }));


                                    
                    //grid = new DataGrid({
                    //    store: storedlytot,
                    //    items: dlytot,
                    //    //query: { id: "*" },
                    //    //queryOptions: {},
                    //    structure: [
                    //        { name: "Period"  , field: "data_period", width: "25%" },
                    //        { name: "Day Type", field: "day_type"   , width: "25%" },
                    //        { name: "Day Part", field: "day_part"   , width: "25%" },
                    //        { name: "Volume"  , field: "Volume"     , width: "25%" }
                    //    ]
                    //}, "grid");
                    //grid.startup();

                    wSG._updateTableSeason();
                    wSG._updateTableTimeOfDay();
                },
                error: function(err) {
                    /* this will execute if the response couldn't be converted to a JS object,
                        or if the request was unsuccessful altogether. */
                }
            }); 
            wSG._changeZoom();
        },


        _updateTableSeason: function(){
            
            var _arrayDayTypeSeries = [];
            var _arrayDayTypeXDataPerVolumes = [];

            var _normalizevolume;

            //TPR CODE type, part, period
            //get data for entire day, daypart_code = 0

            if (typeof specgen !== 'undefined' && typeof daytype !== 'undefined' && typeof dataper !== 'undefined' && typeof daypart !== 'undefined' && typeof dlytot !== 'undefined') {
                _normalizevolume = 1;
                daytype.forEach((T) => {
                    //_ssVolume = new StoreSeries(storedlytot, { query: { SpecGen: curSpecGen, daytype_code: T.daytype_code, daypart_code: 0}}, "Volume");
                    //_arrayDayTypeSeries.push(_ssVolume)

                    _arrayTPRVolume = [];
                    dataper.forEach((R) => {
                        var _volumerecord = dlytot.filter( function(dlytot){return (dlytot.SpecGen==curSpecGen && dlytot.daytype_code==T.daytype_code && dlytot.dataper_code==R.dataper_code);} );
                        // should only be one value
                        if (_volumerecord.length>0) {
                            _tpr_volume = _volumerecord[0]['Volume'];
                            if (T.daytype_code==0 && R.dataper_code==1) {
                                _normalizevolume = _tpr_volume
                            }
                            _arrayTPRVolume.push(_tpr_volume);
                            if (curTablVal=="V") {
                                dom.byId("divTPR" + T.daytype_code.toString() + "0" + R.dataper_code.toString()).innerHTML = this._numberWithCommas(Math.round(_tpr_volume/100)*100);
                            } else if (curTablVal=="F") {
                                dom.byId("divTPR" + T.daytype_code.toString() + "0" + R.dataper_code.toString()).innerHTML = (_tpr_volume / _normalizevolume).toFixed(2);
                            }
                        }
                    });
                    _arrayDayTypeXDataPerVolumes.push(_arrayTPRVolume);
                });
            }

        },

        _updateTableTimeOfDay: function(){

            //TPR CODE type, part, period
            //get data for time of day by each season

            if (typeof specgen !== 'undefined' && typeof daytype !== 'undefined' && typeof dataper !== 'undefined' && typeof daypart !== 'undefined' && typeof todtot !== 'undefined' && typeof dlytot !== 'undefined') {
                daytype.forEach((T) => {
                    //_ssVolume = new StoreSeries(storedlytot, { query: { SpecGen: curSpecGen, daytype_code: T.daytype_code, daypart_code: 0}}, "Volume");
                    //_arrayDayTypeSeries.push(_ssVolume)
                    daypart.forEach((P) => {
                        dataper.forEach((R) => {
                            var _volumerecord = todtot.filter( function(todtot){return (todtot.SpecGen==curSpecGen && todtot.daytype_code==T.daytype_code && todtot.daypart_code==P.daypart_code && todtot.dataper_code==R.dataper_code);} );
                            // should only be one value
                            if (_volumerecord.length>0) {
                                _tpr_volume = _volumerecord[0]['Volume'];
                                if (curTablVal=="V") {
                                    dom.byId("divTPR" + T.daytype_code.toString() + P.daypart_code.toString()  + R.dataper_code.toString()).innerHTML = this._numberWithCommas(Math.round(_tpr_volume/100)*100);
                                } else if (curTablVal=="F") {
                                    var _volumerecord_day = dlytot.filter( function(dlytot){return (dlytot.SpecGen==curSpecGen && dlytot.daytype_code==T.daytype_code && dlytot.dataper_code==R.dataper_code);} );
                                    _tpr_volume_day = _volumerecord_day[0]['Volume'];
                                    dom.byId("divTPR" + T.daytype_code.toString() + P.daypart_code.toString() + R.dataper_code.toString()).innerHTML = (100*_tpr_volume/_tpr_volume_day).toFixed(0) + "%";   
                                }
                            }
                        });
                    });
                });
            }

        },

        _initializeDisplayLayers: function(){
            console.log('_initializeDisplayLayers');

            for (_specgen in specgen) {
                for (_mapdisp in dMapDisplayZones) {
                    _name = specgen[_specgen]['value'] + "_gdb - "  + (specgen[_specgen]['value'] + " " + dMapDisplayZones[_mapdisp]['value']).replace(/_/g, ' ');
                    sDispLayers.push(_name);
                }
            }

            // Initialize Selection Layer, FromLayer, and ToLayer and define selection colors
            var layerInfosObject = LayerInfos.getInstanceSync();
            for (var j=0, jl=layerInfosObject._layerInfos.length; j<jl; j++) {
                var currentLayerInfo = layerInfosObject._layerInfos[j];        
                if (currentLayerInfo.title == sTAZLayer) {
                    lyrTAZ = layerInfosObject._layerInfos[j].layerObject;
                }
            }
            // populate arrays of layers for display
            for (s in sDispLayers) {
                var layerInfosObject = LayerInfos.getInstanceSync();
                for (var j=0, jl=layerInfosObject._layerInfos.length; j<jl; j++) {
                    var currentLayerInfo = layerInfosObject._layerInfos[j];        
                    if (currentLayerInfo.title == (sDispLayers[s])) { // must mach layer title
                        // push layer into array
                        lyrDispLayers.push(layerInfosObject._layerInfos[j].layerObject);
                    }
                }
            }
            wSG._updateDisplayLayer();

/*
            // setup json data for chart for only
            for (_chartx in dChartX) {
                for (_mode in dModeOptions) {
                    for (_category in dCategoryOptions) {
                        _name = "YEAR_" + dChartX[_chartx] + "_" + dModeOptions[_mode]['value'] + '_' + dCategoryOptions[_category]['value'];
                        // Populate chartdata array of objects
                        dojo.xhrGet({
                            url: "widgets/ATOSidebar/data/" + _name + ".json",
                            jname        : _name,
                            jyear        : dChartX[_chartx],
                            jmode        : dModeOptions[_mode]['value'],
                            jcategory: dCategoryOptions[_category]['value'],
                            handleAs: "json",
                            load: function(obj,getdetails) {
                                    // here, obj will already be a JS object deserialized from the JSON response
                                    // chartkey.push([{ jname: getdetails.args['jname'], jyear: getdetails.args['jyear'], jmode: getdetails.args['jmode'], category: getdetails.args['jcategory']}]);
                                    chartkey.push(getdetails.args['jname']);
                                    chartdata.push(obj);
                            },
                            error: function(err) {
                                    // this will execute if the response couldn't be converted to a JS object,
                                    //       or if the request was unsuccessful altogether.
                            }
                        });
                    }
                }
            }
*/            

        },

        _createRadioButtons: function(dData,sDiv,sName,sCheckedValue) {
            console.log('_createRadioButtons');
            
            var _divRBDiv = dom.byId(sDiv);
                  
            for (d in dData) {
        
                // define if this is the radio button that should be selected
                if (dData[d].value == sCheckedValue) {
                    bChecked = true;
                } else {
                    bChecked = false;
                }
                
                // radio button id
                _rbID = "rb_" + sName + dData[d].value

                // radio button object
                var _rbRB = new RadioButton({ name:sName, label:dData[d].label, id:_rbID, value: dData[d].value, checked: bChecked});
                _rbRB.startup();
                _rbRB.placeAt(_divRBDiv);

                // radio button label
                var _lblRB = dojo.create('label', {
                    innerHTML: dData[d].label,
                    for: _rbID
                }, _divRBDiv);
                
                // place radio button
                dojo.place("<br/>", _divRBDiv);
        
                // Radio Buttons Change Event
                dom.byId(_rbID).onchange = function(isChecked) {
                    console.log("radio button onchange");
                    if(isChecked) {
                        _strValue = this.id.charAt(this.id.length - 1);
                        // check which group radio button is in and assign cur value accordingly
                        switch(this.name) {
                            case 'daytype'      : curDayType       = _strValue; wSG._updateRenderer(); break;
                            case 'dataper'      : curDataPer       = _strValue; wSG._updateRenderer(); break;
                            case 'daypart'      : curDayPart       = _strValue; wSG._updateRenderer(); break;
                            case 'vol_per'      : curVol_Per       = _strValue; wSG._updateRenderer(); break;
                        }
                        wSG._setLegendBar();
                    }
                }
            }
        },

        updateChart: function() {
            // get chart data for current area
            
            var _seriesnames = [];
            // var _xychartdatabyseries = [];

            // Remove existing series
            while( chartATO.series.length > 0 ) {
                chartATO.removeSeries(chartATO.series[0].name);
            }
            
            if (curTAZ!=0) {

                // get chart data for selected TAZ
                for (_series in dChartSeries) { // series is category

                    if (dChartSeries[_series]['category'] == curCategory) {// only show for current category
                        
                        // var _catlabeltaz    = "Accessible "                 + dChartSeries[_series]['label'] + " for TAZ " + curTAZ.toString();
                        var _catlabeltaz    = "TAZ " + curTAZ.toString().substr(-4);
                        var _category = dChartSeries[_series]['category'];
                        // _seriesnames.push(_catlabel);
                        var _xyseriesdatataz    = [];
                        for (_x in dChartX) {
                            _year         = dChartX[_x];
                            // construct name of data
                            var _nametaz    = 'YEAR_' + _year.toString() + '_' + curMode + '_' + _category;

                            // check key location for given name
                            var _chartkeyloc = chartkey.indexOf(_nametaz);

                            // get taz values
                            if (_chartkeyloc >= 0) {
                                var _chartdatafiltered = chartdata[_chartkeyloc]
                                var _chartdatarecord = _chartdatafiltered.filter( function(_chartdatafiltered){return (_chartdatafiltered['Z']==curTAZ);} );
                                // should only be one value
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
                        // _xychartdatabyseries.push(xyseriesdata);
                        chartATO.addSeries(_catlabeltaz , _xyseriesdatataz , dChartLineTypes_TAZ [_series]);
                    }
                }

                // get chart data for selected area
                for (_series in dChartSeries) { // series is category

                    if (dChartSeries[_series]['category'] == curCategory) { // only show for current category 

                        var _modedata    = dModeOptions.filter( function(dModeOptions){return (dModeOptions['value']==curMode);} );

                        var _charttitle = "Accessible " + dChartSeries[_series]['label'] + " by " + _modedata[0]['name'];

                        var _max_yscale = _modedata[0]['max_yscale'];
                        var _ymajor         = _modedata[0]['ymajor'        ];

                        // var _catlabelarea = "Average Accessible " + dChartSeries[_series]['label'] + " for " + this.getcurSpecGenName();
                        var _catlabelarea = "Average for " + this.getcurSpecGenName();
                        var _category = dChartSeries[_series]['category'];
                        // _seriesnames.push(_catlabel);
                        var _xyseriesdataarea = [];
                        for (_x in dChartX) {
                            _year         = dChartX[_x];
                            // construct name of data
                            var _namearea = 'YEAR_' + _year.toString() + '_' + curMode + '_' + _category + '_' + curSpecGen;

                            // query area object
                            var _averagevaluesrecord = averagevalues.filter( function(averagevalues){return (averagevalues['Name']==_namearea);} );
                            
                            // should only be one value
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
                        // _xychartdatabyseries.push(xyseriesdata);
                        chartATO.addSeries(_catlabelarea, _xyseriesdataarea, dChartLineTypes_Area[_series]);
                    }

                    var _modename = dModeOptions.filter( function(dModeOptions){return (dModeOptions['value']==curMode);} );
                    
                    chartATO.addAxis("y",
                    {
                        vertical: true,
                        // fixLower: "major",
                        // fixUpper: "major",
                        // minorTickStep: 10,
                        majorTickStep: _ymajor,
                        min: 0,
                        max: _max_yscale/*,
                        title : "AADT"*/
                    });

                }
                
                // // Update Table

                dom.byId("taz_name").innerHTML = _catlabeltaz;
                dom.byId("areaname").innerHTML = _catlabelarea;
                dom.byId("pavgname").innerHTML = "% of<br/>Average";
                
                dom.byId("rowname2019").innerHTML = "<p class = \"thicker\">2019</p>";
                dom.byId("rowname2050").innerHTML = "<p class = \"thicker\">Future (2050)</p>";
                dom.byId("rownamenetg").innerHTML = "<p class = \"thicker\">Net Gain</p>";

                dom.byId("taz_2019value").innerHTML = this._numberWithCommas(Math.round(_taz_2019value/100)*100);
                dom.byId("taz_2050value").innerHTML = this._numberWithCommas(Math.round(_taz_2050value/100)*100);
                dom.byId("taz_netgvalue").innerHTML = this._numberWithCommas(Math.round(_taz_netgvalue/100)*100);
                dom.byId("area2019value").innerHTML = this._numberWithCommas(Math.round(_area2019value/100)*100);
                dom.byId("area2050value").innerHTML = this._numberWithCommas(Math.round(_area2050value/100)*100);
                dom.byId("areanetgvalue").innerHTML = this._numberWithCommas(Math.round(_areanetgvalue/100)*100);
                dom.byId("pavg2019value").innerHTML = (100*_pavg2019value).toFixed(0) + "%";
                dom.byId("pavg2050value").innerHTML = (100*_pavg2050value).toFixed(0) + "%";
                dom.byId("pavgnetgvalue").innerHTML = (100*_pavgnetgvalue).toFixed(0) + "%";

                // 
                // for (var i=0; i<tSSFor.data.length; i++) {
                //    dom.byId("vol" + tSSFor.data[i].x + "value").innerHTML= this.__numberWithCommas(tSSFor.data[i].y);
                // }
                
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

            // if (curTAZ == 492092) {
            // this.checkShed(true);
            // } else {
            //    this.checkShed(false);
            // }

        },

        _numberWithCommas: function(x) {
            return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        },

        _updateRenderer: function() {
            console.log('_updateRenderer');

            if (typeof bindata !== 'undefined') {

                curLayer = this._getCurDispLayerLoc();

                var _defaultLine;
                // create renderer for display layers
                switch(curMapDisp) {
                    case 'CO_TAZID': defaultLine =    new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, Color.fromHex(sCDefaultGrey), 0.5) ; break;
                    case 'DISTMED' : defaultLine =    new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, Color.fromHex(sCDefaultGrey), 3.0) ; break;
                    case 'DISTLRG' : defaultLine =    new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, Color.fromHex(sCDefaultGrey), 3.0) ; break;
                }
                
                
                // construct field name
                _fieldname =  wSG._getDisplayFieldName();

                // initialize renderer with field name for current bin based on current area
                var _Rndr = new ClassBreaksRenderer(null, _fieldname);
                
                for (var i=1; i<=9; i++) {
                    _id = curMapDisp + '_' + curVol_Per + '_' + i.toString();
                    _Rndr.addBreak({minValue: bindata[_id].minValue, maxValue: bindata[_id].maxValue,     symbol: new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, defaultLine, Color.fromHex(bindata[_id].Color)), label: bindata[_id].Description});
                }

                if (curLayer >= 0) {
                    lyrDispLayers[curLayer].setRenderer(_Rndr);
                    lyrDispLayers[curLayer].setOpacity(0.65);
                    lyrDispLayers[curLayer].refresh();
                }

                wSG._changeZoom();
                wSG._checkLabel();
            }

        },

        _getDisplayFieldName: function() {
            return curVol_Per.toLowerCase() + '_' + curDayType + curDayPart + curDataPer;
        },

        _getCurDispLayerLoc: function() {
            _curLayerName = curSpecGen + "_gdb - "  + (curSpecGen + " " + curMapDisp).replace(/_/g, ' ');
            for (l in lyrDispLayers) {
                if (lyrDispLayers[l].arcgisProps.title == _curLayerName)
                    return l;
            }
            return -1;
        },

        _hideAllDispLayers: function() {
            for (l in lyrDispLayers) {
                lyrDispLayers[l].hide();
            }
        },

        _updateDisplayLayer: function() {
            console.log('_updateDisplayLayer');
            wSG._hideAllDispLayers();
            if (curSpecGen != '' && curMapDisp != '' && curDayType != '' && curDataPer != '' && curDayPart != '') {
                wSG._updateRenderer();
                var _loc = wSG._getCurDispLayerLoc()
                if (_loc >= 0) {
                    lyrDispLayers[_loc].show();
                }
            }
        },

        loadJsonData: function() {
            console.log('loadJsonData');
            parent = this;
            // Populate ATO datastore
            lyrTAZ.hide();
            dojo.xhrGet({
                url: "widgets/ATOSidebar/data/" + curDisplay + "_" + curMode + "_" + curCategory + "_" + curSpecGen + ".json",
                handleAs: "json",
                load: function(obj) {
                        /* here, obj will already be a JS object deserialized from the JSON response */
                        console.log('forecasts.json');
                        ato = obj;
                        parent.updateATOLayer();
                        // Populate dowFactors DataStore
                        // storeATO = Observable(new Memory({
                        //    data: {
                        //        identifier: "Z",
                        //        label: "V",
                        //        items: ato
                        //    }
                        // }));
                        // parent.UpdateCCSs(curSiteGroup);
                        // parent.UpdateChart();
                },
                error: function(err) {
                        /* this will execute if the response couldn't be converted to a JS object,
                                or if the request was unsuccessful altogether. */
                }
            });

        },        
                
        _setLegendBar: function() {
            console.log('setLegendBar');

            var _curSpecGen = "";
            var _curDayType = "";
            var _curDataPer = "";
            var _curDayPart = "";

            if (typeof specgen !== 'undefined' && typeof daytype !== 'undefined' && typeof dataper !== 'undefined' && typeof daypart !== 'undefined') {
                _curSpecGen = specgen.filter( function(specgen){return (specgen['value']==curSpecGen);} );
                _curDayType = daytype.filter( function(daytype){return (daytype['value']==curDayType);} );
                _curDataPer = dataper.filter( function(dataper){return (dataper['value']==curDataPer);} );
                _curDayPart = daypart.filter( function(daypart){return (daypart['value']==curDayPart);} );

                var _displaytext = '';
                if (curVol_Per=="P") {
                    _displaytext = "Percent of Total Trips to/from "
                } else if (curVol_Per=="V") {
                    _displaytext = "Number of Trip Ends to/from "
                }
    
                var _sLegend = '<strong>' + _displaytext + _curSpecGen[0]['label'] + "<br/>" + _curDataPer[0]['label'] + " - " +  _curDayType[0]['label'] + " - " + _curDayPart[0]['label'] + '</strong>';
    
                dom.byId("LegendName").innerHTML = _sLegend;
    
                if (typeof bindata !== 'undefined') {
                    for (var i=1; i<=9; i++) {
                        _id = curMapDisp + '_' + curVol_Per + '_' + i.toString();
                        dom.byId("divColor" + (i).toString()).style.backgroundColor = bindata[_id].Color;
                    }
                }
                dom.byId("divDetailsTitle").innerHTML = '<br/><strong>' + _curSpecGen[0]['label'] + " StreetLight Summary Tables" + '</strong><br/><br/>';
            } else {
                dom.byId("divDetailsTitle").innerHTML = '&nbsp;';
            }
        },

        _showLegend: function(){
            console.log('_showLegend');
            var pm = PanelManager.getInstance();
            var bOpen = false;
        
            // Close Legend Widget if open
            for (var p=0; p < pm.panels.length; p++) {
                if (pm.panels[p].label == "Legend") {
                    if (pm.panels[p].state != "closed") {
                        bOpen=true;
                        pm.closePanel(pm.panels[p]);
                    }
                }
            }
        
            // Open Legend Widget if not open
            if (!bOpen) {
                pm.showPanel(wSG.appConfig.widgetPool.widgets[WIDGETPOOLID_LEGEND]);
            }
        },

        _panToSpecGen: function() {
            console.log('_panToSpecGen');

            
            queryTask = new esri.tasks.QueryTask(lyrTAZ.url);
            
            query = new esri.tasks.Query();
            query.returnGeometry = true;
            query.outFields = ["*"];
            query.where = sFNSGTAZID + "='" + wSG._getCurSpecGenTAZID() + "' AND SUBAREAID=1"; // ONLY SETUP FOR WASATCH FRONT AREA
            
            queryTask.execute(query, showResults);
            
            function showResults(featureSet) {
                
                var feature, featureId;
                
                // QueryTask returns a featureSet.    Loop through features in the featureSet and add them to the map.
                
                if (featureSet.features[0].geometry.type == "polyline" || featureSet.features[0].geometry.type == "polygon") { 
                    // clearing any graphics if present. 
                    wSG.map.graphics.clear(); 
                    newExtent = new Extent(featureSet.features[0].geometry.getExtent()) 
                    for (i = 0; i < featureSet.features.length; i++) { 
                        var graphic = featureSet.features[i]; 
                        var thisExtent = graphic.geometry.getExtent(); 

                        // making a union of extent or previous feature and current feature. 
                        newExtent = newExtent.union(thisExtent); 
                        var _sfs = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
                            new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
                            new Color([255,255,0]), 5),new Color([255,255,0,0.25])
                        );
                        graphic.setSymbol(_sfs); 
                        //graphic.setInfoTemplate(popupTemplate); 
                        wSG.map.graphics.add(graphic); 
                    } 

                    if (dom.byId("chkAutoPan").checked == true) {
                        // zoom to new extent
                        //wSG.map.setExtent(newExtent.expand(1.5));
                        // pan to center of TAZ
                        wSG.map.centerAt(newExtent.getCenter()); //recenters the map based on a map coordinate.
                    }
                }
            }
        },

        _getCurSpecGenTAZID: function() {
            _curSGData = specgen.filter( function(specgen){return (specgen['value']==curSpecGen);} );
            return _curSGData[0][sFNSGTAZID]; 
        },

        _changeZoom: function(){
            console.log('_changeZoom');
            dScale = wSG.map.getScale();
            if (dScale < wSG._getMinScaleForLabels()) {
                // enable the checkbox
                dom.byId("SG_Labels").style.display = "inline";
            } else {
                // diable the checkbox
                dom.byId("SG_Labels").style.display = 'none';
            }
        },

        _getMinScaleForLabels: function() {
            _curMapDisplayZone = dMapDisplayZones.filter( function(dMapDisplayZones){return (dMapDisplayZones['value']==curMapDisp);} );
            return _curMapDisplayZone[0]['minScaleForLabels']; 
        },

        _checkLabel: function() {
            console.log('_checkLabel');

            // create a text symbol to define the style of labels
            var volumeLabel = new TextSymbol();
            volumeLabel.font.setSize("8pt");
            volumeLabel.font.setFamily("arial");
            volumeLabel.font.setWeight(Font.WEIGHT_BOLD);
            volumeLabel.setHaloColor(sCWhite);
            volumeLabel.setHaloSize(dHaloSize);

            // Setup empty volume label class for when toggle is off
            labelClassOff = ({
                minScale: wSG._getMinScaleForLabels(),
                labelExpressionInfo: {expression: ""}
            })
            labelClassOff.symbol = volumeLabel;
        
            _exp = "";

            if (curVol_Per == 'P') {
                _exp = "Text($feature[\"" + wSG._getDisplayFieldName() + "\"],'#.00%')";
            } else if (curVol_Per == 'V') {
                _exp = "Text($feature[\"" + wSG._getDisplayFieldName() + "\"],'#,##0')";
            }

            // Create a JSON object which contains the labeling properties. At the very least, specify which field to label using the labelExpressionInfo property. Other properties can also be specified such as whether to work with coded value domains, fieldinfos (if working with dates or number formatted fields, and even symbology if not specified as above)
            labelClassOn = {
                minScale: wSG._getMinScaleForLabels(),
                labelExpression: "[" + wSG._getDisplayFieldName() + "]",
                labelExpressionInfo: {expression: _exp}
            };
            labelClassOn.symbol = volumeLabel;
           
            if (dom.byId("chkLabels").checked == true) {
                lyrDispLayers[wSG._getCurDispLayerLoc()].setLabelingInfo([ labelClassOn ]);
            } else {
                lyrDispLayers[wSG._getCurDispLayerLoc()].setLabelingInfo([ labelClassOff]);
            }
            
        },

        onOpen: function(){
            console.log('onOpen');
        },

        onClose: function(){
            // this.ClickClearButton();
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

        // added from Demo widget Setting.js
        setConfig: function(config){
            // this.textNode.value = config.districtfrom;
        var test = "";
        },

        getConfigFrom: function(){
            // WAB will get config object through this method
            return {
                // districtfrom: this.textNode.value
            };
        }

    });
});