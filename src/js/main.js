/**
 * MPA Analysis web-application by UNEP GRID-ARENDAL
 * Application development powered by FAO FIGIS team, and funded by BlueBridge EC project
 *
 * @author Emmanuel Blondel GIS Expert, Marine web-information systems Developer <emmanuel.blondel@fao.org> (alternate email <emmanuel.blondel1@gmail.com>)
 * @author Levi Westerveld Project Assistant <levi.westerveld@grida.no
 *
 */

var myApp = myApp || {};

(function ($) {
	$(document).ready(function(){

		
		//constants
		//===========================================================================================
		myApp.constants = {
			PUBLIC_TOKEN: "4c1eb64a-45dc-46df-89b6-811ed0f9ff21-843339462",
			GEO_DATA: "data/geodata.json",
			OVERLAY_GROUP_NAMES: [{name: "Geomorphic features"},{name: "Base overlays"}],
            ZOOM: 3,
            OGC_WMS_NS: "W_mpa",
            OGC_WMS_SUFFIX: "geo_fea_",
			OGC_WMS_BASEURL: "https://geoserver.d4science.org/geoserver/wms",
			OGC_WFS_BASEURL: "https://geoserver.d4science.org/geoserver/wfs",
			OGC_WFS_FORMAT: new ol.format.GeoJSON(),
			//OGC_WFS_BBOX: [-180, -90, 180, 90],
            OGC_WPS_BASEURL: "https://dataminer-cluster1.d4science.org/wps/WebProcessingService?request=Execute&service=WPS&Version=1.0.0&lang=en-US",
			OGC_WPS_IDENTIFIER: "org.gcube.dataanalysis.wps.statisticalmanager.synchserver.mappedclasses.transducerers.MPA_INTERSECT_V2",
			OGC_WPS_OUTPUTDATA_HTTPS: true,
            OGC_CSW_BASEURL: "https://geonetwork1-d-d4s.d4science.org/geonetwork/srv/eng/csw",
			SURFACE_UNIT: {id: 'sqkm', label: 'km²'},
			SURFACE_ROUND_DECIMALS: 2,
            DEBUG_REPORTING: false
		}
		
		//Utils
		//===========================================================================================
		
		/**
		 * GetAllUrlParams util function to get URL param valus
		 * Here the primary use is to be able to grab a security token that would be
		 * passed from within a i-Marine VRE portlet
		 * @param url
		 * @returns an object with all parameter values
		 */
		myApp.getAllUrlParams = function(url) {
		  var queryString = url ? url.split('?')[1] : window.location.search.slice(1);

		  var obj = {};
		  if (queryString) {
			queryString = queryString.split('#')[0];
			var arr = queryString.split('&');
			for (var i=0; i<arr.length; i++) {
			  var a = arr[i].split('=');
			  var paramNum = undefined;
			  var paramName = a[0].replace(/\[\d*\]/, function(v) {
				paramNum = v.slice(1,-1);
				return '';
			  });
			  var paramValue = typeof(a[1])==='undefined' ? true : a[1];

			  if (obj[paramName]) {
				if (typeof obj[paramName] === 'string') {
				  obj[paramName] = [obj[paramName]];
				}
				if (typeof paramNum === 'undefined') {
				  obj[paramName].push(paramValue);
				}else {
				  obj[paramName][paramNum] = paramValue;
				}
			  }else {
				obj[paramName] = paramValue;
			  }
			}
		  }
		  return obj;
		}		
		
		/**
		 * Utility to render a statistical value after conversion and rounding
		 * @param value to render
         * @param format value "surface" or "percentage". The percentage corresponds to the % of geomorphic feature
         *             (only in the given EEZ) covered by the MPA (or all MPAs)
         * @param meta an metadata object as defined in DataTable API (see https://datatables.net/reference/option/columns.render)
         *             used to inherit column information (required to apply percentage format)
		 * @returns the rendered value
		 */
		myApp.renderStatValue = function(value, format, meta){
        
            var roundFactor = Math.pow(10,this.constants.SURFACE_ROUND_DECIMALS);
        
            if(format == "percentage"){
                refRow = this.processData[0]
                refValue = refRow[Object.keys(refRow)[meta.col]]
                outValue = value / refValue * 100;
                outValue = Math.round(outValue * roundFactor) / roundFactor;
                if(refValue == 0 || outValue == 0) outValue = "–";
            }else if(format == "surface"){
                var factor = 1;
                switch(this.constants.SURFACE_UNIT.id){
                    case "sqkm": factor = 1e-6;break;
                    case "ha": factor = 1e-4;break;
                    default: factor = 1; break;
                }
                outValue = Math.round(value * factor * roundFactor) / roundFactor;
                if(outValue == 0) outValue = "–";
            }
			return outValue;
            
		},
        
        /**
         * Utility to reload the stats (table & graph). Called on switching the format (% or surface) with the formatSwitcher
         */
        myApp.renderStatistics = function(){
		//render stat table
	   	this.table.rows().invalidate('data').draw(false);

		//render barchart
		this.initResultsChart();
		
        }
	
		// Security Token 
		//===========================================================================================
		
		/**
		 * Fetch Security token
		 */
		myApp.fetchSecurityToken = function(){
			var securityToken = this.getAllUrlParams().securityToken;
			if(typeof securityToken != "undefined"){
				console.log("Passing security token from VRE to web-app = "+securityToken);
				this.securityToken = securityToken;
			}else{
				console.log("Using public security token");
				this.securityToken = this.constants.PUBLIC_TOKEN;
			}
			return this.securityToken;
		}
	
		//Geomorphic Features
		//==========================================================================================
		myApp.sanitizeMetadataElement = function(str){
            str = str.replace(/\s{2,}/g, ' ');
            str = str.replace(/(\r\n|\n|\r)/gm, "");
            return str;
        }
        
        myApp.fetchGeomorphicFeatureMetadata = function(metadataId){
            var this_ = this;
            var deferred = $.Deferred();
            var request =  this.constants.OGC_CSW_BASEURL + "?service=CSW&request=GetRecordById&Version=2.0.2";
            request += "&outputSchema=http%3A//www.isotc211.org/2005/gmd";
            request += "&elementSetName=full";
            request += "&id=" + metadataId;
            console.log("Performing CSW GetRecord metadata request");
            console.log(request);
            $.ajax({ 
                type: 'GET',
                url: request,
                contentType: 'application/json',
                success: function(xml){
                
                    //get abstract information
                    var mdAbstract = "";
                    var xml_abstract = $(xml).find("abstract");
                    if(xml_abstract.length > 0){
                       mdAbstract = this_.sanitizeMetadataElement(xml_abstract[0].textContent);
                    }else{
                        mdAbstract = "No abstract available";
                    }
                    
                    //get citation information
                    var mdCitation = "";
                    var xml_citation = $(xml).find("credit");
                    if(xml_citation.length > 0){
                        mdCitation = this_.sanitizeMetadataElement(xml_citation[0].textContent);
                    }else{
                        mdCitation = "No reference available";
                    }
                    
                    for(var i=0;i<this_.geomorphicFeatures.length;i++){
                        var id = metadataId.split("geo_fea_")[1];
                        if(this_.geomorphicFeatures[i].id === id){
                            this_.geomorphicFeatures[i]["description"] = mdAbstract;
                            this_.geomorphicFeatures[i]["reference"] = mdCitation;
                            break;
                        }
                    }
                    
                    deferred.resolve();
                }
            });
            return deferred.promise();
        }
        
        myApp.fetchGeomorphicFeatures = function(){
        
            var deferred = $.Deferred();
        
			var this_ = this;
			$.getJSON(this.constants.GEO_DATA, function(data){
				this_.geomorphicFeatures = data;
                var promises = new Array();
                for(var i=0;i<data.length;i++){
                    var metadataId = this_.constants.OGC_WMS_SUFFIX + data[i].id;
                    promises.push(this_.fetchGeomorphicFeatureMetadata(metadataId));
                }
                $.when(promises).done(function(){
                    deferred.resolve(this_.geomorphicFeatures);
                });
			});
            
            return deferred.promise();
		}
		
		//Area type selector
		//==========================================================================================
		myApp.initAreaTypeSelector = function(){
			var this_ = this;
			this.$areaTypeSelector = $("#areaTypeSelector").select2({
				placeholder: "Select an area type"
			});
			this.$areaTypeSelector.val('');
			this.$areaTypeSelector.trigger('change');
			$("#areaTypeSelector").on("select2:select", function (e) {
				var areaType = $("#areaTypeSelector").select2("val");
				this_.configureMapSelector(areaType);
			});
		}
		
	
		// map UI
		//===========================================================================================
		
		/**
		 * Inits the map
		 */
		myApp.initMap = function(id, main, extent){
        
            var map;
            
			//baselayers
			var baseLayers = [
				new ol.layer.Group({
					'title': "Basemaps",
					layers: [
						new ol.layer.Tile({
							title : "ESRI WLGB",
							type: 'base',
							source : new ol.source.XYZ({
							
								attributions: [
									new ol.Attribution({
										html: 'Tiles © <a href="http://services.arcgisonline.com/ArcGIS/' +
											'rest/services/World_Topo_Map/MapServer">ArcGIS</a>'
									})
								],
								//url : 'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean_Basemap/MapServer/tile/{z}/{y}/{x}'
                                url : '//server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'
                            })
						})
					]
				})
			];

            
			//overlay groups
			var geomorphicLayers = new ol.layer.Group({
				'title': this.constants.OVERLAY_GROUP_NAMES[0].name,
				layers: [ ],
			});

			var baseOverlays = new ol.layer.Group({
				'title': this.constants.OVERLAY_GROUP_NAMES[1].name,
				layers: [ ],
			});
			var overlays = [geomorphicLayers, baseOverlays];
		
			var defaultMapExtent = ((this.constants.OGC_WFS_BBOX)? this.constants.OGC_WFS_BBOX : [-180, -90, 180, 90]);
			var defaultMapZoom = ((this.constants.OGC_WFS_BBOX)? 5 : 2);
            
            if(main){
                this.baseLayers = baseLayers;
                this.geomorphicLayers = geomorphicLayers;
                this.baseOverlays = baseOverlays;
                this.overlays = overlays;
                this.defaultMapExtent = defaultMapExtent,
                this.defaultMapZoom = defaultMapZoom;
            }     
        
			//map
            var mapId = id? id : 'map';
			$("#"+mapId).empty();
			var map = new ol.Map(
				{
					id: mapId,
                    target : mapId,
					layers : baseLayers.concat(overlays),
					view : new ol.View({
						projection : 'EPSG:4326',
						center : ol.extent.getCenter(defaultMapExtent),
						extent: defaultMapExtent,
						zoom : defaultMapZoom
					}),
					controls: [],
					logo: false
				}
			);
			map.addControl( new ol.control.LoadingPanel() );
			map.addControl( new ol.control.Zoom() );
			map.addControl( new ol.control.ZoomToMaxExtent({
				extent	: extent? extent : defaultMapExtent,
				zoom	: defaultMapZoom
			} ));
            
            if(main){
                map.addControl( new ol.control.LayerSwitcher({
                    target: "layerswitcher",
                    displayLegend: true,
                    collapsableGroups : true,
                    overlayGroups : this.constants.OVERLAY_GROUP_NAMES
                }));
            }       
                        
            if(extent){
                map.getView().fit(extent, map.getSize());
            }
            
            if(main && this.constants.ZOOM){
                map.getView().setZoom(this.constants.ZOOM);
            }
            
            return map;
		}
		
		/**
		 * Set legend graphic
		 * @param a ol.layer.Layer object
		 */	 
		myApp.setLegendGraphic = function(lyr) {
			
			var source = lyr.getSource();
			if( !(source instanceof ol.source.TileWMS) ) return false;
			
			var params = source.getParams();

			var request = '';
			request += source.getUrls()[0] + '?';
			request += 'VERSION=1.0.0';
			request += '&REQUEST=GetLegendGraphic';
			request += '&LAYER=' + params.LAYERS;
			request += '&STYLE=' + ( (params.STYLES)? params.STYLES : '');
			request += '&LEGEND_OPTIONS=forcelabels:on;forcerule:True;fontSize:12'; //maybe to let as options
			request += '&SCALE=139770286.4465912'; //to investigate
			request += '&FORMAT=image/png';
			request += '&TRANSPARENT=true';
			
			lyr.legendGraphic = request;
		}
		
        /**
		 * Adds  layer
		 * @param id
         * @param title
         * @param layer
         * @param cql_filter
		 */
		myApp.addLayer = function(main, id, title, layer, cql_filter){
			var layer = new ol.layer.Tile({
				id : id,
				title : title,
				source : new ol.source.TileWMS({
					url : this.constants.OGC_WMS_BASEURL,
					params : {
							'LAYERS' : layer,
							'VERSION': '1.1.1',
							'FORMAT' : 'image/png',
							'TILED'	 : true,
							'TILESORIGIN' : [-180,-90].join(','),
                            'CQL_FILTER': cql_filter
					},
					wrapX: true,
					serverType : 'geoserver'
				}),
				opacity : 0.8,
				visible : true
			});
			this.setLegendGraphic(layer);
			layer.showLegendGraphic = true;
            layer.overlayGroup = this.constants.OVERLAY_GROUP_NAMES[0];
			
            if(main){
                this.overlays[0].getLayers().push(layer);
            }else{
                this.featureMap.getLayers().push(layer);
            }
		}
        
		/**
		 * Adds Geomorphic Feature layer
		 * @param gfeature object
		 */
		myApp.addGeomorphicFeatureLayer = function(gfeature, main){
			var layer = new ol.layer.Tile({
				id : gfeature.id,
				title : gfeature.title,
				source : new ol.source.TileWMS({
					url : this.constants.OGC_WMS_BASEURL,
					params : {
							'LAYERS' : this.constants.OGC_WMS_NS + ":" + this.constants.OGC_WMS_SUFFIX + gfeature.id,
							'VERSION': '1.1.1',
							'FORMAT' : 'image/png',
							'TILED'	 : true,
							'TILESORIGIN' : [-180,-90].join(',')
					},
					wrapX: true,
					serverType : 'geoserver'
				}),
				opacity : 0.8,
				visible : (main? gfeature.visible : true)
			});
			myApp.setLegendGraphic(layer);
			layer.showLegendGraphic = true;
			layer.overlayGroup = this.constants.OVERLAY_GROUP_NAMES[0];
            
            if(main){
                this.overlays[0].getLayers().push(layer);
            }else{
                this.featureMap.getLayers().push(layer);
            }
            
		}
		
		/**
		 * Adds Geomorphic Feature layer
		 * @param gfeature object
		 */
		myApp.addGeomorphicFeatureLayers = function(gfeature){
			this.geomorphicFeatures.reverse();
			for(var i=0;i<this.geomorphicFeatures.length;i++){
				var gfeature = this.geomorphicFeatures[i];
				this.addGeomorphicFeatureLayer(gfeature, true);
			}
			this.geomorphicFeatures.reverse();
			
			//try to collapse by default the geomorphic features in layerswitcher (doesn't work)
			//console.log($($($(".layer-switcher-layergroup")[1]).find("label")[0]));
			//$($($(".layer-switcher-layergroup")[1]).find("label")[0]).click();
		}
		
		/**
		 * Util method to get layer by property
		 * @param layerProperty the property value
		 * @param by the property 
		 */
		myApp.getLayerByProperty = function(layerProperty, by){
			if(!by) byTitle = false;
			var target = undefined;
			for(var i=0;i<this.map.getLayerGroup().getLayersArray().length;i++){
				var layer = this.map.getLayerGroup().getLayersArray()[i];
				var condition  = by? (layer.get(by) === layerProperty) : (layer.getSource().getParams()["LAYERS"] === layerProperty);
				if(condition){
					target = this.map.getLayerGroup().getLayersArray()[i];
					break;
				}
			}
			return target;
		}
		
		/**
		 * Configures the map layer dynamic selector based on WFS
		 * @param areaType the area type 'EEZ' or 'ECOREGION'
		 */
		myApp.configureMapSelector = function(areaType){
			
			var this_ = this;
			
			this_.$areaTypeSelector.val(areaType);
			this_.$areaTypeSelector.trigger('change');
			
			$("#areaSelector").empty();
           // $("#areaSelector").select2('data', null);
			
			$("#areaSelectorWrapper").hide();
			$("#areaSelectorLoader").show();
			
			//prepare the WFS request
			this_.areaFeatureType = null;
			this_.intersectFeatureType = null;
			this_.areaIdProperty = null;
			this_.areaLabelProperty = null;
			switch(areaType){
			case "EEZ":
				this_.areaFeatureType = "W_mpa:eez";
				this_.intersectFeatureType = "W_mpa:intersect_mpa_eez_v1";
				this_.areaIdProperty = "mrgid";
				this_.areaLabelProperty = "geoname";
				break;
			case "ECOREGION":
				this_.areaFeatureType = "W_mpa:meow_ppow";
				this_.intersectFeatureType = "W_mpa:intersect_mpa_ecoregions_v1",
				this_.areaIdProperty = "ecoregion";
				this_.areaLabelProperty = "ecoregion";
				break;
			}
			var wfsRequest = this.constants.OGC_WFS_BASEURL + "?version=1.0.0&request=GetFeature&typeName=" + this_.areaFeatureType;
			if(this.constants.OGC_WFS_BBOX) {
				wfsRequest += "&bbox="+ this.constants.OGC_WFS_BBOX.join(',');
			}
			wfsRequest += "&outputFormat=json";
			
			console.log("Performing WFS request on selected area type");
			console.log(wfsRequest);
			this.sourceFeatures = new ol.source.Vector({
				format: this_.constants.OGC_WFS_FORMAT,
				loader: function(extent, resolution, projection) {
				
					$.ajax({
						url: wfsRequest,
						success: function(response) {
							//add source feature layer
							var features = this_.constants.OGC_WFS_FORMAT.readFeatures(response);
							
							//fill drop-down list
							$("#areaSelectorWrapper").show();
							this_.$areaSelector = $("#areaSelector").select2({
								placeholder: "Select an area",
								allowClear: true,
								sorter: function(data) {
									data.sort(function(a,b){
										 a = a.text.toLowerCase();
										 b = b.text.toLowerCase();
										 if(a > b) {
											 return 1;
										 } else if (a < b) {
											 return -1;
										 }
										 return 0;
									 });
									return data;
								}
							});
							var modifiedFeatures = [];
							for (var i = 0; i < features.length; i++) {
								var feature = features[i];
								var props = feature.getProperties();
								feature.setId(props[this_.areaIdProperty]);
								modifiedFeatures.push(feature);
								var option = new Option(props[this_.areaLabelProperty], props[this_.areaIdProperty]);
								this_.$areaSelector.append(option);
							}
							this_.sourceFeatures.addFeatures(modifiedFeatures);
							this_.$areaSelector.val('');
							this_.$areaSelector.trigger("change");
							
							//select events
							this_.$areaSelector.on("select2:select", function (e) {
								var targetFeature = this_.sourceFeatures.getFeatureById(e.params.data.id);
								this_.selectInteraction.getFeatures().clear();
								this_.selectInteraction.getFeatures().push(targetFeature);
								this_.map.getView().fit(targetFeature.getGeometry().getExtent(), this_.map.getSize());
								$("#analyzer").show();
							});
							this_.$areaSelector.on("select2:unselect", function (e) {
								this_.selectInteraction.getFeatures().clear();
								this_.map.getView().fit(this_.map.getView().getProjection().getExtent(), this_.map.getSize());
								this_.map.getView().setZoom(2);
								$("#analyzer").hide();
							});
							
							//hide loader
							$("#areaSelectorLoader").hide();

						},
						error: function(){
							console.log("failed to query WFS");
							this_.map = this_.initMap('map', true, false);
							this_.addGeomorphicFeatureLayers();
							this_.$areaTypeSelector.val('');
							this_.$areaTypeSelector.trigger('change');
							$("#areaSelectorLoader").hide();
						}
					});
				}
				
			});
			
			//try to search for existing vector source
			var vectorLayer = myApp.getLayerByProperty("geoselector", "id");
			
			if(typeof vectorLayer == "undefined"){
				//if no layer we create it
				var vectorLayer = new ol.layer.Vector({
					id: "geoselector",
					title : "Geo selector ("+areaType+")",
					source : this_.sourceFeatures
				});
				this_.overlays[1].getLayers().push(vectorLayer);
				
				//select interactions
				//-------------------
				this_.selectInteraction = new ol.interaction.Select({
					condition: ol.events.condition.click,
					layers: [vectorLayer],
					style: new ol.style.Style({
						fill: new ol.style.Fill({
								color: "rgba(238,153,0,0.4)" 
							}),
						stroke: new ol.style.Stroke({
							color: '#ee9900',
							width: 1
						})
					})
				});
				this_.hoverInteraction = new ol.interaction.Select({
					condition: ol.events.condition.pointerMove,
					layers: [vectorLayer],
					style: new ol.style.Style({
						fill: new ol.style.Fill({
								color: "rgba(255,255,255,0.3)" 
							}),
						stroke: new ol.style.Stroke({
							color: '#0099ff',
							width: 2
						})
					})
				});
				this_.map.addInteraction(this_.selectInteraction);
				this_.map.addInteraction(this_.hoverInteraction);
				
				//selection handling
				this_.selectInteraction.on('select', function(e) {
					if(e.selected.length > 0){
						this_.$areaSelector.val(e.selected[0].getId());
						this_.$areaSelector.trigger("change");
						$("#analyzer").show();
					}else{
						this_.$areaSelector.val('');
						this_.$areaSelector.trigger("change");
						$("#analyzer").hide();
					}
				});
				this_.selectInteraction.on('unselect', function(e) {
					this_.$areaSelector.val('');
					this_.$areaSelector.trigger("change");
					$("#analyzer").hide();
				});
				
				//tooltip
				//-------
				var areaTooltip = new ol.Overlay.Popup({id: "geoselector-tooltip", isTooltip: true});
				this_.map.addOverlay(areaTooltip);
				var areaTooltipHandler = function(feature){
					return feature.getProperties()[this_.areaLabelProperty];
				}
				this_.map.on('pointermove', function(evt) {
				  var feature = this_.map.forEachFeatureAtPixel(evt.pixel,
					function(feature, layer) {
						var features = feature.get('features');
						if( !!features ) {
							var size = features.length;
							if( size > 1 ) {
								return;
							} else {
								feature = features[0];
							}
						}
						return feature;
					}
				  );
				  if (feature) {
						areaTooltip.show(evt.coordinate, areaTooltipHandler(feature));
				  } else {
						areaTooltip.hide();
				  }	  
				});
			
				
			}else{
				vectorLayer.setSource(this_.sourceFeatures);
			}
			
			this.map.getControls().getArray().filter(function(control){if(control instanceof ol.control.LayerSwitcher) return control})[0].renderPanel();
		}		
		
		// WPS analysis methods
		//===========================================================================================
		
		
		/**
		 * Execute
		 * @param areaType the area type 'EEZ' or 'ECOREGION'
		 * @param areaId the id of the selected area
		 */		
		myApp.executeWPSRequest = function(areaType, areaId){
			
			var this_ = this;
			
			var t1 = new Date();
			
			console.log("Executing WPS request with the following params");
			console.log("Security Token = "+this.securityToken);
			console.log("Area type = "+areaType);
			console.log("Area Id = "+areaId);
			
			$("#areaTypeSelector").prop("disabled", true);
			$("#areaSelector").prop("disabled", true);
			$("#analyzer").attr("disabled",true);
			
			$('#mpaTabs').show();
			$('#mpaTabs').tabs();
			$('#mpaTabs').tabs( "option", "active", 0 ); //go to table
		
			$("#mpaResultsWrapper").show();
            $("#mpaResultsCharts").show();
			$("#mpaResultsWrapper").empty();
            $("#mpaResultsCharts").empty();
			$("#mpaResultsLoader").show();
					
			//building WPS GET request
			var wpsRequest = this.constants.OGC_WPS_BASEURL;
			wpsRequest += "&Identifier="+this.constants.OGC_WPS_IDENTIFIER,
			wpsRequest += "&gcube-token="+this.securityToken;
			wpsRequest += "&DataInputs=areaType="+areaType+";areaId="+areaId;
			
			this_.storeWPSOutputMetadata(areaType, areaId, this_.sourceFeatures.getFeatureById(areaId).getGeometry().getExtent(), t1, undefined);
			
			//execute WPS Get request
			$.ajax({
				type: "GET",
				url: wpsRequest,
				cache: false,
				dataType: "xml",
				success: function(xml) {
					var t2 = new Date();
					this_.processMetadata.end = t2;
					
					//process output data
                    			//Recent DataMiner nows handle logs as 1st Result, result is stored as 2d Result (!)
					var dataUrl = $($(xml).find('d4science\\:Data, Data')[1]).text();
					this_.getWPSOutputData(dataUrl);	
				},
				error : function (xhr, ajaxOptions, thrownError){
					console.log("Error while executing WPS request");
					$("#mpaResultsWrapper").append("<p><b>The MPA analysis returned an error...</b></p>");
					$("#mpaResultsWrapper").append("<p style='color:red;'>GET Request '"+wpsRequest+"' failed!</p>");
					$("#mpaResultsLoader").hide();
                    			$("#areaTypeSelector").prop("disabled", false);
                    			$("#areaSelector").prop("disabled", false);
                    			$("#analyzer").attr("disabled",false);
                    			$("#mpaResultsLoader").hide();
				}
			});
		}
		
		/**
		 * Get WPS output JSON data
		 * @param url
		 */		
		myApp.getWPSOutputData = function(url){
			
			var this_ = this;
			
			if(this_.constants.OGC_WPS_OUTPUTDATA_HTTPS){
				url = url.replace(/^http:\/\//i, 'https://');
			}
			
			console.log("Fetching WPS output data '"+url+"'");
			
			$.ajax({
				url: url,
				success: function(response){
            
                //results
                //-------
				var results = JSON.parse(response);
				this_.processData = new Array();
                    
                //explicit order by non-MPA (EEZ or ECOREGION), then All MPAs, then each MPA
				this_.processData = this_.processData.concat(results.filter(function(row){if(row.type != "MPA") return row}));
				this_.processData = this_.processData.concat(results.filter(function(row){if(row.name == "All MPAs") return row}));
                var mpas = results.filter(function(row){if(row.type == "MPA" & row.name != "All MPAs") return row});
                mpas.sort(function(a,b) {return (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0);} ); 
				this_.processData = this_.processData.concat(mpas);		
					
                //remove empty columns
				var keys = Object.keys(this_.processData[0]);
				for(key in keys){
					var keyname = keys[key];
					if(keyname != "id" & this_.processData[0][keyname] == 0){
						for (var i = 0, len = this_.processData.length; i < len; i++) {
							delete this_.processData[i][keyname];
				    	}
					}
				}
                    
				//prepare dtColumns
				var columns = Object.keys(this_.processData[0]);
				this_.columnNames = ["id", "Name", "Type", "Area"];
				if(typeof this_.geomorphicFeatures != "undefined"){
                        		for(var i=0;i<this_.geomorphicFeatures.length;i++){
                            			var gtype = this_.geomorphicFeatures[i];
                            			if(columns.indexOf(gtype.id) != - 1){
                                			this_.columnNames.push(gtype.title);
                            			}
                       			}
				}
                    

				//html markup
                //-----------
				var tableHeaders = '';
				$.each(this_.columnNames, function(i, val){
					tableHeaders += "<th>" + val + "</th>";
				});
                
                // Initialize Highcharts
                this_.initResultsChart();
					
                //timer
				var timer = (this_.processMetadata.end - this_.processMetadata.start) / 1000;
				var timerHtml = '<p class="mpa-timer">MPA analysis performed in '+timer+' seconds!</p>';
				$("#mpaResultsWrapper").append(timerHtml);
                    
			   	//value format (absolute value or %)
				var formatSwitcherHtml = '<table class="mpa-formatswitcher"><tr>';
                formatSwitcherHtml += '<td><input type="radio" name="formatSwitcher" value="surface" checked onclick="myApp.renderStatistics()">Surface (km²)</td>';
				formatSwitcherHtml += '<td><input type="radio" name="formatSwitcher" value="percentage" onclick="myApp.renderStatistics()">% of geomorphic feature</td>';
				formatSwitcherHtml += '</tr></table>';
				$("#mpaResultsWrapper").append(formatSwitcherHtml);
					
                //results table
				var resultsTable = '<table id="mpaResultsTable" class="stripe row-border order-column" cellspacing="0" style="width:100%;"><thead><tr>' + tableHeaders + '</tr></thead></table>';
				$("#mpaResultsWrapper").append(resultsTable);

				$("#areaTypeSelector").prop("disabled", false);
				$("#areaSelector").prop("disabled", false);
				$("#analyzer").attr("disabled",false);
				$("#mpaResultsLoader").hide();

				//prepare dtColumns
				var dtColumns = new Array();
				for( var i=0;i<columns.length;i++){
					var dtColumn = {data: columns[i]};
					dtColumns.push(dtColumn);
				}

				this_.table = $("#mpaResultsTable").removeAttr('width').DataTable({
					data: this_.processData,
					columns: dtColumns,
					paging: false,
					scrollCollapse: true,
					scrollY: 230,
					scrollX: true, //scroll on the full table (header + body)
					columnDefs: [
						{
							targets: 0,
							visible: false
						},
						{
							targets: 1,
							width: 220,
							render : function ( mData, type,row, meta ) {
								return '<a href="#" onclick="myApp.accessReports('+row.id+')" title="Access report" class="mpa-table-name">' + mData+'</a>';                             
							}
						},
						{
							targets: Array.apply(null, Array(Object.keys(this_.processData[0]).length)).map(function (_, i) {return i;}).slice(3), //all surfacic fields
							render: function( mData, type, row, meta ){
								return '<span class="mpa-table-stat">'+this_.renderStatValue(mData, $('input[name=formatSwitcher]:checked').val(), meta)+'</span>';
							}
						}
					],
					order: [], //prevent default sorting and keep order of processed result
					colReorder: {
						fixedColumnsLeft: 4
					}
				});
                
                $("#mpaResultsTable_info").remove();
					
				new $.fn.dataTable.FixedColumns( this_.table, {leftColumns: 4} );
                
                //$(".sorting:contains('Name')").trigger("click");
                //$(".sorting:contains('Area')").trigger("click");
                
				},
				error : function (xhr, ajaxOptions, thrownError){
					console.log("Error while fetching WPS output data");
					$("#mpaResultsWrapper").append("<p>The MPA analysis returned an error...</p>");
					$("#mpaResultsWrapper").append("<p style='color:red;'>GET Request '"+url+"' failed!</p>");
					$("#mpaResultsLoader").hide();
                    $("#areaTypeSelector").prop("disabled", false);
                    $("#areaSelector").prop("disabled", false);
                    $("#analyzer").attr("disabled",false);
				}
			});
		}
		
		/**
		 * Stores local WPS output metadata
		 */
		myApp.storeWPSOutputMetadata = function(areaType, areaId, areaExtent, start, end){
			this.processMetadata = {
				areaType : areaType,
				areaId: areaId,
				areaExtent: areaExtent,
				areaFeatureType: this.areaFeatureType,
				areaIdProperty: this.areaIdProperty,
				intersectFeatureType: this.intersectFeatureType,
				start: start,
				end: end
			}
		}
		
		// Reporting
		//===========================================================================================

		/**
		 * Function to get a WMS Get Map request to load in a feature report
         * @Deprecated now handled with a dynamic Map
		 * @param areaId the area numeric id (MPA id or EEZ id, or '0' for All MPAs)
		 * @param featureLayer
		 * @returns an url
		 */
		myApp.getFeatureReportMap = function(areaId, featureLayer){
			
			var layerDefs = [
				{layer: featureLayer, filter: "INCLUDE"},
				{layer: this.processMetadata.intersectFeatureType, filter: ("wdpaid="+areaId)},
				{layer: this.processMetadata.areaFeatureType, filter: (this.processMetadata.areaIdProperty +"='"+this.processMetadata.areaId+"'")}
			]
			
			var bbox = this.processMetadata.areaExtent;
			var bbox_xy_ratio = (bbox[2] - bbox[0]) / (bbox[3] - bbox[1]);
			var imgMaxSize = 200;
			var imgHeight = imgMaxSize;
			var imgWidth = Math.round(imgHeight * bbox_xy_ratio)
			
			var wmsRequest = this.constants.OGC_WMS_BASEURL + "?service=WMS&version=1.1.1&request=GetMap";
			wmsRequest += "&layers=" + layerDefs.map(function(def){return def.layer}).join(",");
			wmsRequest += "&cql_filter=" + layerDefs.map(function(def){return def.filter}).join(";");
			wmsRequest += "&bbox=" + bbox.join(',');
			wmsRequest += "&styles=";
			wmsRequest += "&width="+imgWidth+"&height="+imgHeight;
			wmsRequest += "&srs=EPSG:4326";
			wmsRequest += "&format=image/png";
			
			return wmsRequest;
		}
        
        
		/**
		 * Function to access MPA Report 
		 * @param id the id of the area
		 */
		myApp.accessReports = function(id){
            var this_ = this;
            
            //go to report tab
            $("nav li[data-where='#pageReports']").trigger("click");
            $("#mpaReportMainWrapper").empty();
            $("#mpaReportFeatureWrapper").empty();
            $("#mpaReportLoader").show(); //show loader (until WFS request is fetched)
            
            //report object preparation
            var data = this.processData.filter(function(row){if(row.id === String(id)) return row})[0];
            this.report = {
                id : data.id,
                name: data.name,
                type: data.type,
                isMPA: data.type == "MPA",
		isSingleMPA: data.name != "All MPAs" && data.type == "MPA",
                surface: this.renderStatValue(data.surface, "surface"),
                surfaceUnit: this.constants.SURFACE_UNIT.label,
                target: this.processData.filter(function(row){if(row.type == "EEZ") return row})[0],
                features: []
            }
            for(var i=0;i<this.geomorphicFeatures.length;i++){
                var surface = data[this.geomorphicFeatures[i].id];
                if(surface > 0){
                    var targetSurface = this.report.target[this.geomorphicFeatures[i].id];
                    var featureReport = {
                        metadata: this.geomorphicFeatures[i],
                        data: {
                            surface: this.renderStatValue(surface, "surface"),
                            surfaceUnit: this.constants.SURFACE_UNIT.label,
                            indicator1: Math.round(surface / targetSurface * 100 * 100) / 100,
                            map: this.getFeatureReportMap(this.report.id, this.geomorphicFeatures[i].layer)
                        }
                    }
                    this.report.features.push(featureReport);
                }
            }
            
            //query intersect by filter (if any mpa) to get bbox
            var targetFilter = this.areaIdProperty + " = " + this.report.target.id;
            if(this.report.type == "MPA" & this.report.name != "All MPAs"){
                targetFilter += " AND wdpaid = " + id;
            }
            var intersectRequest = this.constants.OGC_WFS_BASEURL + "?version=1.0.0&request=GetFeature";
            var targetLayer = (this.report.type != "MPA")? this.areaFeatureType : this_.intersectFeatureType;
            intersectRequest += "&typeName=" + targetLayer;
	    intersectRequest += "&outputFormat=json";
            intersectRequest += "&cql_filter=" + targetFilter;
            intersectRequest = encodeURI(intersectRequest);
            
            console.log("Performing WFS request to get Report map bbox");
            console.log(intersectRequest);
            $.ajax({
                url: intersectRequest,
                success: function(response) {
                    //add source feature layer
                    var features = this_.constants.OGC_WFS_FORMAT.readFeatures(response);
                    var intersectFeatures = new ol.source.Vector();
                    intersectFeatures.addFeatures(features);
                    this_.report.featureType = targetLayer;
                    this_.report.filter = targetFilter;
                    this_.report.bbox = intersectFeatures.getExtent();
		
		    //additional fields
		    if(this_.report.isMPA){
			var mpa = intersectFeatures.getFeatures()[0];
		    	this_.report.extraInfo = {
			    wdpa_pid : mpa.get('wdpa_pid'),
			    desig : mpa.get('desig'),
			    desig_type : mpa.get('desig_type'),
			    iucn_cat: mpa.get('iucn_cat'),
			    status: mpa.get('status'),
			    status_yr: mpa.get('status_yr'),
			    gov_type: mpa.get('gov_type'),
			    mang_auth: mpa.get('mang_auth')
		    	}
		    }

                    //hide report loader
                    $("#mpaReportLoader").hide(); 
                    
                    //build the templates
                    this_._template1 = document.getElementById('mpa-report-template1').innerHTML;
                    Mustache.parse(this_._template2);
                    this_._template2 = document.getElementById('mpa-report-template2').innerHTML;
                    Mustache.parse(this_._template2);
                
                    //Render the main template
                    var rendered = Mustache.render(this_._template1, this_.report);
                    document.getElementById('mpaReportMainWrapper').innerHTML = rendered;
                    $('.mpa-report-featurelist').css("height", "90%");
                    
                    //select first feature by default
                    var buttonIdFirst = "#"+this_.report.features[0].metadata.id + "-button";
                    $(buttonIdFirst).trigger("click");
                                    
                },
                error: function(){
                    console.log("failed to query WFS");
                    $("#mpaReportMainWrapper").append("<p>The MPA analysis returned an error...</p>");
					$("#mpaReportMainWrapper").append("<p style='color:red;'>GET Request '"+intersectRequest+"' failed!</p>");
                    $("#mpaReportLoader").hide(); 
                }
            });		
		}
        
        /**
		 * Function to access MPA Feature Report 
		 * @param gtype the geomorphic feature identifier
		 */
        myApp.displayReport = function(gtype){
            var features = new Array();
            var trgGtype = undefined;
            for(var i=0;i<this.report.features.length;i++){
                var buttonId = "#"+this.report.features[i].metadata.id + "-button";
                if(this.report.features[i].metadata.id == gtype){
                    trgGtype = this.report.features[i].metadata;
                    features.push(this.report.features[i]);
                    $(buttonId).addClass("selected");
                }else{
                    $(buttonId).removeClass("selected");
                }
            }
            var featureReport = jQuery.extend({}, this.report)
            featureReport.features = features;
            var rendered = Mustache.render(this._template2, featureReport);
            document.getElementById('mpaReportFeatureWrapper').innerHTML = rendered;
            
            var mapId = trgGtype.id + "-map";
            this.featureMap = this.initMap(mapId, false, this.report.bbox);
            this.addGeomorphicFeatureLayer(trgGtype, false);
	    this.addLayer(false, this.report.id, this.processMetadata.areaType, this.processMetadata.areaFeatureType, (this.processMetadata.areaIdProperty + ' = ' + this.processMetadata.areaId));
            this.addLayer(false, this.report.id, "MPA", this.report.featureType, this.report.filter)
        }
        
        /**
         * myApp.configureViewer()
         */
        myApp.configureViewer = function(){
            var this_ = this;
            this_.map = this_.initMap('map', true, false);
            
            //default selector
            this_.configureMapSelector("EEZ");
            
            //do business once geomorphic feature data is loaded
            this_.fetchGeomorphicFeatures()
            .done(function(data){
                    
                //add geomorphic Feature layers
                this_.addGeomorphicFeatureLayers();
                
                //analyzer button (trigger WPS)
                $("#analyzer").on("click", function(e){
                    var areaType = this_.$areaTypeSelector.select2("data")[0].id;
                    var areaId = this_.$areaSelector.select2("data")[0].id;
                    console.log("MPA analysis for "+areaType+" id ='"+areaId+"'");
                    this_.executeWPSRequest(areaType, areaId);
                });
                
                // for testing table/reporting only
                if(this_.constants.DEBUG_REPORTING){
                   
                    //go to report tab
                    $('#mpaTabs').show();
                    $('#mpaTabs').tabs();
                    $('#mpaTabs').tabs( "option", "active", 0 ); //go to table
                    $("#mpaResultsWrapper").show();
                    $("#mpaResultsCharts").show();
                    $("#mpaResultsWrapper").empty();
                    $("#mpaResultsCharts").empty();
                    $("#mpaResultsLoader").show();
                    
                    //simulate execution
                    var url = "https://data.d4science.org/VDVyTjVmVkFkUzRjK1llZ25sSXY0cVJqUk41TmZVa0VHbWJQNStIS0N6Yz0-VLT";
                    this_.storeWPSOutputMetadata("EEZ", 8404, [-81.21527777999995, 20.36826343900003, -70.63139390299995, 30.355082680000066], 0, 0);
                    this_.getWPSOutputData(url);
                }
            })
            .fail(function() {
                alert("geodata.json is not valid JSON data");
            });
            
       }
		
		//===========================================================================================
		//application init
		//===========================================================================================
		
		//fetch token
		myApp.fetchSecurityToken();
		
		//area type selector
		myApp.initAreaTypeSelector();
        
        //init map
        myApp.configureViewer();

	});
	
}( jQuery ));
