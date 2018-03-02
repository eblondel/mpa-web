/**
 * MPA Analysis web-application by UN FAO & UNEP GRID-ARENDAL
 * Application development powered by FAO FIGIS team, and funded by BlueBridge EC project
 *
 * Last change: 2018-02-22T15:27:45.183Z
 *
 * @author Emmanuel Blondel GIS Expert, Marine web-information systems Developer, UN-FAO <emmanuel.blondel@fao.org> (alternate email <emmanuel.blondel1@gmail.com>)
 * @author Levi Westerveld Project Assistant, GRID-ARENDAL <levi.westerveld@grida.no>
 * @author Debhasish Bhakta Project Assistant, GRID-ARENDAL <debhasish.bhakta@grida.no>
 */

var myApp = myApp || {};
myApp.VERSION = "Version 1.0-beta2";
myApp.PAIM = true;

(function ($) {
	$(document).ready(function(){
		$("#paim-webapp-version").html(myApp.VERSION);
		
		//constants
		//===========================================================================================
		myApp.constants = {
			PUBLIC_TOKEN: "some application token",
			GEO_DATA: "data/geodata.json",
			AOI: "MPA",
			OVERLAY_GROUP_NAMES: [{name: "External layers"},{name: "Target datasets"},{name: "Marine Protected Areas"},{name: "Base overlays"}],
           	MAP_ZOOM: 3,
			MAP_PROJECTION: 'EPSG:4326',
			MAP_SELECTOR_DEFAULT: 'geoselector-default',
			MAP_SELECTOR_CUSTOM: 'geoselector-custom',
            OGC_WMS_NS: "W_mpa",
            OGC_WMS_SUFFIX: "geo_fea_",
			OGC_WMS_BASEURL: "https://paim.d4science.org/geoserver/wms",
			OGC_WFS_BASEURL: "https://paim.d4science.org/geoserver/wfs",
			OGC_WFS_FORMAT: new ol.format.GeoJSON(),
			OGC_WFS_BBOX: null,
			OGC_WFS_CACHE: "paim_cache_db",
            DATAMINER_BASEURL: "https://dataminer.garr.d4science.org",
			DATAMINER_IDENTIFIER: "org.gcube.dataanalysis.wps.statisticalmanager.synchserver.mappedclasses.transducerers.MPA_INTERSECT_V4_1",
			DATAMINER_OUTPUTDATA_HTTPS: true,
            OGC_CSW_BASEURL: "https://geonetwork.d4science.org/geonetwork/srv/eng/csw",
			D4S_SOCIALNETWORKING_BASEURL: "https://socialnetworking1.d4science.org/social-networking-library-ws/rest/2",
			D4S_HOMELIBRARY_BASEURL: "https://workspace-repository.d4science.org/home-library-webapp/rest",
			WORKSPACE_USER_FOLDER: "PAIM-reports",
			WORKSPACE_TEMP_FOLDER: "temp",
			SURFACE_UNIT: {id: 'sqkm', label: 'km²'},
			SURFACE_ROUND_DECIMALS: 2,
            DEBUG_REPORTING: false
		}
		
		if(!myApp.PAIM){
			myApp.constants.DATAMINER_BASEURL = "https://dataminer-prototypes.d4science.org";
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
		 * Simple json2csv util
		 * @param objArray
		 * @returns a string representive the CSV
		 */
		myApp.json2csv = function(objArray) {
			var array = typeof objArray != 'object' ? JSON.parse(objArray) : objArray;
			var str = '';
			var line = '';

			//add colnames
			var head = array[0];
				for (var index in array[0]) {
					line += index + ',';
				}
			line = line.slice(0, -1);
			str += line + '\r\n';
			
			//add data
			for (var i = 0; i < array.length; i++) {
				var line = '';
					for (var index in array[i]) {
				val = array[i][index];
				if(typeof val == 'string') val = '"' + val + '"';
						line += val + ',';
					}
				line = line.slice(0, -1);
				str += line + '\r\n';
			}
			return str;
		}

		/**
		 * Download CSV
		 * @param content csv string
		 * @param fileName
		 * @param mimeType
		 */
		myApp.downloadCSV = function(content, fileName, mimeType) {
  			var a = document.createElement('a');
  			mimeType = mimeType || 'application/octet-stream';

  			if (navigator.msSaveBlob) { // IE10
    				navigator.msSaveBlob(new Blob([content], {
    				  type: mimeType
    				}), fileName);
  			} else if (URL && 'download' in a) { //html5 A[download]
    				a.href = URL.createObjectURL(new Blob([content], {
      					type: mimeType
    				}));
    				a.setAttribute('download', fileName);
    				document.body.appendChild(a);
    				a.click();
    				document.body.removeChild(a);
  			} else {
    				location.href = 'data:application/octet-stream,' + encodeURIComponent(content); // only this mime type is supported
  			}
		}
		
		/**
		 * DataURItoBlob
		 * @param dataURI
		 * @param mimeType
		 */
		myApp.dataURItoBlob = function(dataURI, mimeType){
			var binary = atob(dataURI.split(',')[1]);
			var array = [];
			for(var i=0; i < binary.length; i++){
				array.push(binary.charCodeAt(i));
			}
			return new Blob( [new Uint8Array(array)], {type: mimeType});
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
		
		/**
		 * myApp.getFolderDateTimeString
		 * @param date
		 */
		myApp.getFolderDateTimeString = function(date){
			var str = date.toISOString();
			return (str.split("T")[0] + "" + str.split("T")[1].split(".")[0]).replace(/-/g,"").replace(/:/g,"");
		}
	
		// gCubeSecurity Token 
		//===========================================================================================
		
		/**
		 * Fetch Security token required for authorization in all gCube services
		 * @returns the security token
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

		// gCube services interaction methods
		//===========================================================================================

		/**
 		 * Fetch User profile
		 * This method queries the gCube social-networking service in order to fetch the user profile
		 * (including username, fullname etc)
		 */
		myApp.fetchUserProfile = function(){
			var this_ = this;
            var request =  this.constants.D4S_SOCIALNETWORKING_BASEURL + "/people/profile?gcube-token=" + this.securityToken;
			console.log("Fetching user profile");
            $.ajax({ 
				url: request,
                contentType: 'application/json',
    			type: 'GET',
    			success: function (response) {
        			this_.userProfile = response.result;
					this_.userWorkspace = "/Home/" + this_.userProfile.username  + "/Workspace";
				}     
			});
        }

		/**
		 * myApp.createWorkspaceFolder
		 * Creates a folder in the i-marine user workspace, if not yet created
		 * @param parentPath parent folder path
		 * @param folderName workspace folder name
		 * @param folderDescription workspace folder description
		 * @param uploadStateMsg
		 * @return a Jquery promise with the folder path
		 */
		myApp.createWorkspaceFolder = function(parentPath, folderName, folderDescription, uploadStateMsg){
			var msg = "";
			var this_ = this;
			var deferredFolder = $.Deferred();
			var folderPath = parentPath + "/" + folderName;
			$.ajax({ 
				type: 'GET',
				url: this.constants.D4S_HOMELIBRARY_BASEURL + "/List?absPath=" + folderPath + "&gcube-token=" + this_.securityToken,
				success: function(listResponse){
				
					//check if exist
					var folderExists = listResponse.indexOf("ItemNotFoundException") == -1;
					if(!folderExists){
						//create folder
						msg = "Creating workspace folder '" + folderPath + "'...";
						if(uploadStateMsg) $("#upload-state").text(msg);
						console.log(msg);
					
						var createFolderRequest = this_.constants.D4S_HOMELIBRARY_BASEURL + "/CreateFolder?";
						createFolderRequest += "name=" + folderName;
						createFolderRequest += "&description=" + folderDescription;
						createFolderRequest += "&parentPath=" + parentPath;
						createFolderRequest += "&gcube-token=" + this_.securityToken;
						$.ajax({ 
							type: 'GET',
							url: createFolderRequest,
							success: function(data){
								msg = "Successful workspace '" + folderName + "' folder creation!";
								if(uploadStateMsg) $("#upload-state").text(msg);
								console.log(msg);
								deferredFolder.resolve(folderPath);
							}
						});
					}else{
						console.log("Workspace folder '"+ folderPath + "' already exists");
						deferredFolder.resolve(folderPath);	
					}
				}
			});
			return deferredFolder.promise();
		}

		/**
		 * myApp.createPAIMParentFolder
		 * Creates a parent folder in the i-marine user workspace, if not yet created
		 * The folder will be used for storing analysis and reports.
		 * @param uploadStateMsg
		 * @return a Jquery promise
		 */
		myApp.createPAIMParentFolder = function(uploadStateMsg){		
			var folderDescription = "This folder contains the PAIM analysis outputs exported from the PAIM Data Explorer";
			return this.createWorkspaceFolder(this.userWorkspace, this.constants.WORKSPACE_USER_FOLDER, folderDescription, uploadStateMsg);
		}

		/**
		 * myApp.createPAIMProcessFolder
		 * Creates a process folder in the i-marine user PAIM parent folder, if not yet created
		 * The folder will be used for storing an analysis and its reports.
		 * @param uploadStateMsg
		 * @return a Jquery promise
		 */
		myApp.createPAIMProcessFolder = function(uploadStateMsg){		
			var parentPath = this.userWorkspace + "/" + this.constants.WORKSPACE_USER_FOLDER;
			var processFolderName =  (this.custom? "CUSTOM" : (this.processMetadata.areaType + "-" + this.processMetadata.areaId)) + "-" + this.processMetadata.dateTime;
			return this.createWorkspaceFolder(parentPath, processFolderName, "", uploadStateMsg);
		}

		/**
		 * myApp.createPAIMTemporaryFolder
		 * Creates a temporary folder in the i-marine user PAIM parent folder, if not yet created
		 * The folder will be used for storing eventual user zipped shapefiles for custom analyses
		 * @param uploadStateMsg
		 * @return a Jquery promise
		 */
		myApp.createPAIMTemporaryFolder = function(uploadStateMsg){		
			var parentPath = this.userWorkspace + "/" + this.constants.WORKSPACE_USER_FOLDER;
			return this.createWorkspaceFolder(parentPath, this.constants.WORKSPACE_TEMP_FOLDER, "", uploadStateMsg);
		}

		/**
		 * myApp.uploadFile
		 * Uploads a file to workspace
		 * @param parentPath parent folder path
		 * @param fileName workspace file name
		 * @param contentHandler the data to upload, or an handler function to trigger only if file doesn't exist
		 * @param contentType
		 * @param uploadStateMsg
		 * @return a Jquery promise with the public link
		 */
		myApp.uploadFile = function(parentPath, fileName, contentHandler, contentType, uploadStateMsg){
			var this_ = this;
			var deferredUpload = $.Deferred();

			var publicLinkRequest = this_.constants.D4S_HOMELIBRARY_BASEURL + "/GetPublicLink?";
			publicLinkRequest += "absPath=" + parentPath + "/"+ fileName;
			publicLinkRequest += "&shortUrl=false&gcube-token=" + this_.securityToken;
			
			$.ajax({
			  type: 'GET',
			  url: publicLinkRequest,
			  success: function(fileLink){
				var fileExists = fileLink.indexOf("ItemNotFoundException") == -1;
				if(!fileExists){
					msg = "Uploading data file '"+fileName+"' ['"+contentType+"']..."
					if(uploadStateMsg) $("#upload-state").text(msg);
					console.log(msg);

					var uploadRequest = this_.constants.D4S_HOMELIBRARY_BASEURL + "/Upload?";
					uploadRequest += "name=" + fileName;
					uploadRequest += "&description=" + fileName;
					uploadRequest += "&parentPath=" + parentPath;
					uploadRequest += "&gcube-token=" + this_.securityToken;
					
					//trigger content handler in case content is a function
					if(typeof contentHandler == "function"){
						contentHandler = contentHandler()
					}
					$.ajax({
						type: 'POST',
						url: uploadRequest,
						contentType: contentType,
						dataType: 'text',
						data: contentHandler,
						processData: false,
						success: function(data){
							msg = "Successful data file upload: '"+fileName+"' ['"+contentType+"']"
							if(uploadStateMsg) $("#upload-state").text(msg);
							console.log(msg);

							$.ajax({
								type: 'GET',
								url: publicLinkRequest,
								success: function(fileLink){
									if(uploadStateMsg) $("#upload-state").text("");
									var xml = $.parseXML(fileLink);
									var link = xml.getElementsByTagName("string")[0].childNodes[0].data;
									
									console.log("Patching file retrieval from workspace, forcing to HTTPS");
									link = link.replace(/^http:\/\//i, 'https://'); //patch 20180220

									deferredUpload.resolve({
										path: parentPath,
										name: fileName.split(".")[0],
										filename: fileName,
										mimetype: contentType,
										url: link
									});
								}
							});	
						},
						error: function(error){
							console.log("Error during file upload");
							deferredUpload.reject(error);
						}
					});
				}else{
					if(uploadStateMsg) $("#upload-state").text("");
					var xml = $.parseXML(fileLink);
					var link = xml.getElementsByTagName("string")[0].childNodes[0].data;
					
					console.log("Patching file retrieval from workspace, forcing to HTTPS");
					link = link.replace(/^http:\/\//i, 'https://'); //patch 20180220

					deferredUpload.resolve({
						path: parentPath,
						name: fileName.split(".")[0],
						filename: fileName,
						mimetype: contentType,
						url: link
					});
				}
			  }
			});
			
			return deferredUpload.promise();	
								
		}

		/**
		 * myApp.downloadFile
		 * @param entity as returned by myApp.uploadFile
		 */
		myApp.downloadFile = function(entity){
			console.log(entity.url);
			window.open(entity.url, "_self");
		}
			
		/**
		 * myApp.onUserAreaFileSelection
		 * Handler function to trigger on user area file change
		 */
		myApp.onUserAreaFileSelection = function(files){
			var this_ = this;
			$("#userAreaError").empty();
			$("#fieldSelector").empty();
			$("#fieldSelectorWrapper").hide();
			if(files.length>0){
				console.log(files[0]);
				var maxFileSize = 5000000;
				if(files[0].size <= maxFileSize){
					this_.userAreaFile = files[0];
					if(this_.$areaSelector){
						this_.$areaSelector.val('');
						this_.$areaSelector.trigger('change');
						this_.$areaSelector.trigger("select2:unselect");
					}
				
					//temporary shapefile handling with OL3
					this_.configureCustomMapSelector();

					$("#analyzer").show();	
				}else{
					this_.userAreaFile = undefined;
					$("#userAreaError").html("Error: Maximum file size (" +(maxFileSize/1e6)+ "Mb) exceeded!");
				}			
			}else{
				this_.userAreaFile = undefined;
			}
		}		
			
		/**
		 * Saves custom zipped shapefile to temporary workspace
		 */
		myApp.uploadUserAreaFile = function(){
			
			if(!this.userAreaFile) return false;
			
			var this_ = this;
			var deferred = $.Deferred();

			//we create a PAIM parent folder if it doesn't exist
			this_.createPAIMParentFolder(false).then(function(parentFolderPath){
				
				//We create a PAIM temporary folder if it doesn't exist
				this_.createPAIMTemporaryFolder(false).then(function(tempFolderPath){
					
					//temporary upload, and defer public link
					var fileName = this_.getFolderDateTimeString(new Date()) + "_" + this_.userAreaFile.name;
					this_.userAreaFileName = fileName;
					this_.uploadFile(tempFolderPath, fileName, this_.userAreaFile, 'application/x-zip-compressed', false).then(function(uploadedEntity){
						console.log(uploadedEntity);
						deferred.resolve(uploadedEntity);
					});
				});						

			});

			return deferred.promise();	
		}	
		
			
		/**
		 * Saves output data as CSV
		 * This method perform several operations, including:
		 * - the conversion of the analysis output to CSV
		 * - its upload to the target user workspace in the i-Marine infrastructure. The target workspace folder 'PAIM-reports' is created
		 *   if missing. Data is then stored into a subfolder given the process completing date/time. Upload is operated as it guarantees
		 *   to have the outputs available as web-resources for embedding in the PDF report. Upload is done once.
		 * - its download to user machine
		 * @param download true/false
		 */
		myApp.saveData = function(download){
			$("#upload-loader").show();
			var msg = "";
			var this_ = this;
			var deferred = $.Deferred();
			
			//we create a PAIM parent folder if it doesn't exist
			this_.createPAIMParentFolder(true).then(function(parentFolderPath){

				//We create a PAIM temporary folder if it doesn't exist
				this_.createPAIMProcessFolder(true).then(function(processFolderPath){
					
					//here we can produce the CSV output (method is not consuming like PDF)
					var dataForCSV = new Array();
					for(var i=0;i<this_.processData.length;i++){
						var dataRow = this_.processData[i];
						if(!this_.custom){
							if([this_.constants.AOI, "AOI"].indexOf(dataRow.type) >= 0) dataRow.type = this_.constants.AOI;
							if(["All "+this_.constants.AOI+"s","All AOIs"].indexOf(dataRow.name) >= 0) dataRow.name = dataRow.name.replace("AOI", this_.constants.AOI);
						}
						dataForCSV.push(dataRow);
					}
					var csv = this_.json2csv(dataForCSV);
					
					//upload CSV data
					var fileName = "PAIM-report_" + (this_.custom? this_.userAreaFileName.split(".zip")[0] : this_.processData.filter(function(row){if(row.type != "AOI") return row})[0].name) + ".csv";
					this_.uploadFile(processFolderPath, fileName, csv, 'text/csv;encoding:utf-8', true).then(function(uploadedEntity){
						if(download){
							msg = "Downloading CSV file..."
							$("#upload-state").text(msg);
							console.log(msg);
							this_.downloadFile(uploadedEntity);
							$("#upload-state").text("");
							$("#upload-loader").hide();
						}
						deferred.resolve(uploadedEntity);	
					});
				});						
			});
			
			return deferred.promise();	
		}


		/**
		 * Save & download results as PDF. The function will first save data before generating the PDF.
		 * In this way PDF report will include a link to data in CSV format.
		 * @param download true/false
		 */ 
		myApp.saveResults = function(download){
			$("#upload-loader").show();
			var msg = "";
			var this_ = this;
			var deferred = $.Deferred();
			this_.saveData(false).then(function(data){
	
				msg = "Generating PDF results report...";
				$("#upload-state").text(msg);
				console.log(msg);

				var fileName = data.name + ".pdf";
				
				//here we don't produce the PDF output but delegate to an handler
				//that will produce the PDF only if it is to generate (first time)
				var pdfHandler = function(){
					var pdf = this_.produceResultsPDF(data);
					var outpdf = pdf.output('blob');
					return outpdf;
				}
				
				//upload PDF
				this_.uploadFile(data.path, fileName, pdfHandler, 'application/pdf', true).then(function(uploadedEntity){
					if(download){
						msg = "Downloading PDF file..."
						$("#upload-state").text(msg);
						console.log(msg);
						this_.downloadFile(uploadedEntity);
						$("#upload-state").text("");
						$("#upload-loader").hide();
					}
					deferred.resolve(uploadedEntity);	
				});
				
			});
			
			return deferred.promise();	
		}  
	
		//Target datasets
		//==========================================================================================
		myApp.sanitizeMetadataElement = function(str){
            str = str.replace(/\s{2,}/g, ' ');
            str = str.replace(/(\r\n|\n|\r)/gm, "");
            return str;
        }
        
        myApp.fetchTargetDatasetMetadata = function(metadataId){
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
                        var xml_abstract = $(xml).find("gmd\\:abstract, abstract");
                        if(xml_abstract.length > 0){
                            mdAbstract = this_.sanitizeMetadataElement(xml_abstract[0].textContent);
                        }else{
                            mdAbstract = "No abstract available";
                        }
                
                        //get citation information
                        var mdCitation = "";
                        var xml_citation = $(xml).find("gmd\\:credit, credit");
                        if(xml_citation.length > 0){
                            mdCitation = this_.sanitizeMetadataElement(xml_citation[0].textContent);
                        }else{
                            mdCitation = "No reference available";
                     }
                
                        for(var i=0;i<this_.targetDatasets.length;i++){
                            var id = metadataId.split("geo_fea_")[1];
                            if(this_.targetDatasets[i].id === id){
                               this_.targetDatasets[i]["description"] = mdAbstract;
                               this_.targetDatasets[i]["reference"] = mdCitation;
                               break;
                          }
                        }
                
                        deferred.resolve();
                    }
                });
                return deferred.promise();
        }
        
        myApp.fetchTargetDatasets = function(){
          var deferred = $.Deferred();
		  var this_ = this;
		  console.log("Fetching local application geodata.json file...")
		  $.getJSON(this_.constants.GEO_DATA, function(data){
			console.log(data);
			this_.targetDatasets = data.datasets;
			this_.targetDatasetGroups = data.groups;
	
			//build query interface
			var groupIds = Object.keys(this_.targetDatasetGroups);
			for(var k=0;k<groupIds.length;k++){
				var trgGroupId = groupIds[k];
				var trgGroupData = this_.targetDatasets.filter(function(obj){if(obj.group == trgGroupId){return obj}});
				var ulHtml = "";
				//adhoc rule for 'geomorphic' group
				if(trgGroupId == "geomorphic"){
					ulHtml += '<ul><li><input id="all_geomorphicfeatures" type="checkbox" onclick="myApp.toggleTargetDatasetLayers(\''+trgGroupId+'\')"><em>All geomorphic features</em></input></li></ul>';
				}
				ulHtml += '<ul>';
				for(var i=0;i<trgGroupData.length;i++){
					var item = trgGroupData[i];
					if(item.process){
						var liHtml = '<li><input id="'+item.id+'" type="checkbox" onchange="myApp.toggleTargetDatasetLayer(\''+item.id+'\')"/>'+item.title+'</li>';
						ulHtml += liHtml;
					}
				}
				var divId = trgGroupId +"-checkboxes";
				var divHtml = '<div id="'+divId+'" class="target-checkboxes">';
				divHtml += "<b>"+this_.targetDatasetGroups[trgGroupId]+"</b><br>";
				divHtml += ulHtml;
				
				$("#targetlayers").append(divHtml);
				$("#targetlayers").append("<br>");
			}
		
			//fetch target dataset metadata
			var promises = new Array();
			for(var i=0;i<this_.targetDatasets.length;i++){
				var metadataId = this_.constants.OGC_WMS_SUFFIX + this_.targetDatasets[i].id;
				promises.push(this_.fetchTargetDatasetMetadata(metadataId));
			}
			$.when(promises).done(function(){
				deferred.resolve(this_.targetDatasets);
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
			$("#fieldSelectorWrapper").hide();
			$("#areaTypeSelector").on("select2:select", function (e) {
				var areaType = $("#areaTypeSelector").select2("val");
				this_.configureDefaultMapSelector(areaType);
				$("#fieldSelectorWrapper").hide();
			});
		}
		
	
		// map UI
		//===========================================================================================
		
		/**
		 * Inits the map
		 */
		myApp.initMap = function(id, main, extent){
        
            		var map;
			var this_ = this;
            
			//baselayers
			var esri1Template = 'https://server.arcgisonline.com/ArcGIS/rest/services/ESRI_Imagery_World_2D/MapServer/tile/{z}/{y}/{x}';
			var esri2Template = 'https://server.arcgisonline.com/ArcGIS/rest/services/ESRI_StreetMap_World_2D/MapServer/tile/{z}/{y}/{x}';
			var baseLayers = [
				new ol.layer.Group({
					'title': "Basemaps",
					layers: [
						new ol.layer.Tile({
							title : "ESRI - Countries",
							type: 'base',
							source : new ol.source.XYZ({							
								attributions: [
									new ol.Attribution({
										html: 'Tiles Â© <a href="http://services.arcgisonline.com/ArcGIS/rest/services/ESRI_StreetMap_World_2D/MapServer">ArcGIS</a>'
									})
								],
								projection: ol.proj.get(this_.constants.MAP_PROJECTION),
								tileSize: 512,
                                				tileUrlFunction: function(tileCoord) {
                							return esri2Template.replace('{z}', (tileCoord[0] - 1).toString())
                                  						.replace('{x}', tileCoord[1].toString())
                                  						.replace('{y}', (-tileCoord[2] - 1).toString());
              							},
								crossOrigin: 'anonymous',
								wrapX: true
                            				})
						}),
						new ol.layer.Tile({
							title : "ESRI World Imagery",
							type: 'base',
							source : new ol.source.XYZ({
								attributions: [
									new ol.Attribution({
										html: 'Tiles Â© <a href="http://services.arcgisonline.com/ArcGIS/rest/services/ESRI_Imagery_World_2D/MapServer">ArcGIS</a>'
									})
								],
								projection: ol.proj.get(this_.constants.MAP_PROJECTION),
								tileSize: 512,
								tileUrlFunction: function(tileCoord) {
                							return esri1Template.replace('{z}', (tileCoord[0] - 1).toString())
                                  						.replace('{x}', tileCoord[1].toString())
                                  						.replace('{y}', (-tileCoord[2] - 1).toString());
              							},
								crossOrigin: 'anonymous',
								wrapX: true
                            				})
						})

					]
				})
			];

            
			//overlay groups
			var otherLayers = new ol.layer.Group({
				'title': this.constants.OVERLAY_GROUP_NAMES[0].name,
				layers: [ ],
			});
			var targetDatasetLayers = new ol.layer.Group({
				'title': this.constants.OVERLAY_GROUP_NAMES[1].name,
				layers: [ ],
			});
			var mpaOverlays = new ol.layer.Group({
				'title': this.constants.OVERLAY_GROUP_NAMES[2].name,
				layers: [ ],
			});
			var baseOverlays = new ol.layer.Group({
				'title': this.constants.OVERLAY_GROUP_NAMES[3].name,
				layers: [ ],
			});
			var overlays = [otherLayers, targetDatasetLayers, mpaOverlays, baseOverlays];
		
			var defaultMapExtent = ((this.constants.OGC_WFS_BBOX)? this.constants.OGC_WFS_BBOX : [-180, -90, 180, 90]);
			var defaultMapZoom = ((this.constants.OGC_WFS_BBOX)? 5 : this.constants.MAP_ZOOM);
            
            		if(main){
                		this.baseLayers = baseLayers;
                		this.targetDatasetLayers = targetDatasetLayers;
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
						projection: this.constants.MAP_PROJECTION,
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
	
			if(main && this.constants.MAP_ZOOM){
				map.getView().setZoom(this.constants.MAP_ZOOM);
			}
	
			return map;
		}

		/**
		 * Set legend graphic
		 * @param a ol.layer.Layer object
		 */	 
		myApp.setLegendGraphic = function(lyr) {
			
			var source = lyr.getSource();
			if( !(source instanceof ol.source.TileWMS) & !(source instanceof ol.source.ImageWMS) ) return false;
			var url = null;
			if(source instanceof ol.source.TileWMS) url = source.getUrls()[0];
			if(source instanceof ol.source.ImageWMS){
				console.log(url);
				url = source.getUrl();
			}
			var params = source.getParams();

			var request = '';
			request += url + '?';
			request += 'VERSION=1.0.0';
			request += '&REQUEST=GetLegendGraphic';
			request += '&LAYER=' + params.LAYERS;
			request += '&STYLE=' + ( (params.STYLES)? params.STYLES : '');
			request += '&LEGEND_OPTIONS=forcelabels:on;forcerule:True;fontSize:12'; //maybe to let as options
			request += '&SCALE=139770286.4465912'; //to investigate
			request += '&FORMAT=image/png';
			request += '&TRANSPARENT=true';
            request += '&WIDTH=30';
			
			lyr.legendGraphic = request;
		}
		
        	/**
		 * Adds  layer
		 * @param main (true/false)
		 * @param mainOverlayGroup
		 * @param id
         * @param title
         * @param layer
		 * @param tiled
		 * @param visible
       	 * @param cql_filter
		 * @param alternateUrl
		 * @param alternateServerType
		 */
		myApp.addLayer = function(main, mainOverlayGroup, id, title, layer, tiled, visible, cql_filter, alternateUrl, alternateServerType){
			var source = null;
			var olLayerClass = null
			if(tiled){
				olLayerClass = ol.layer.Tile;
				source = new ol.source.TileWMS({
					url : (alternateUrl? alternateUrl : this.constants.OGC_WMS_BASEURL),
					params : {
							'LAYERS' : layer,
							'VERSION': '1.1.1',
							'FORMAT' : 'image/png',
							'TILED'	 : true,
							'TILESORIGIN' : [-180,-90].join(','),
                            'CQL_FILTER': cql_filter
					},
					wrapX: true,
					serverType : (alternateServerType? alternateServerType : 'geoserver'),
					crossOrigin: 'anonymous'
				});
			}else{
				olLayerClass = ol.layer.Image;
				source = new ol.source.ImageWMS({
					url: (alternateUrl? alternateUrl : this.constants.OGC_WMS_BASEURL),
					params: {'LAYERS': layer},
					ratio: 1,
					serverType: (alternateServerType? alternateServerType : 'geoserver')
				});
			}
			
			var layer = new olLayerClass({
				id : id,
				title : title,
				source : source,
				opacity : 0.8,
				visible : visible
			});
			this.setLegendGraphic(layer);
            layer.id = id;
			layer.showLegendGraphic = true;
            
			
            if(main){
				if(mainOverlayGroup > this.overlays.length-1){
					alert("Overlay group with index " + mainOverlayGroup + " doesn't exist");
				}
				layer.overlayGroup = this.constants.OVERLAY_GROUP_NAMES[mainOverlayGroup];
				this.overlays[mainOverlayGroup].getLayers().push(layer);
            }else{
				layer.overlayGroup = this.constants.OVERLAY_GROUP_NAMES[0];
               	this.featureMap.getLayers().push(layer);
            }
		}
		
        /**
		 * Util method to remove a layer by property
		 * @param layerProperty the property value
		 * @param by the property 
		 */
		myApp.removeLayerByProperty = function(layerProperty, by){
            var removed = false;
			if(!by) byTitle = false;
			var target = undefined;
            var layerGroups = this.map.getLayers().getArray();
			for(var i=0;i<layerGroups.length;i++){
				var layerGroup = layerGroups[i];
                var layers = layerGroup.getLayers().getArray();
                for(var j=0;j<layers.length;j++){
                    var layer = layers[j];
                    var condition  = by? (layer.get(by) === layerProperty) : (layer.getSource().getParams()["LAYERS"] === layerProperty);
                    if(condition){
                        this.overlays[i-1].getLayers().remove(layer);
                        removed = true;
                        break;
                    }
                }
			}
			return removed;
        }
        
		/**
		 * Adds Target dataset layer
		 * @param def object
		 */
		myApp.addTargetDatasetLayer = function(def, main){
			var layer = new ol.layer.Tile({
				id : def.id,
				title : def.title,
				source : new ol.source.TileWMS({
					url : this.constants.OGC_WMS_BASEURL,
					params : {
							'LAYERS' : this.constants.OGC_WMS_NS + ":" + this.constants.OGC_WMS_SUFFIX + def.id,
							'VERSION': '1.1.1',
							'FORMAT' : 'image/png',
							'TILED'	 : true,
							'TILESORIGIN' : [-180,-90].join(',')
					},
					wrapX: true,
					serverType : 'geoserver',
					crossOrigin: 'anonymous'
				}),
				opacity : 0.8,
				visible : (main? def.visible : true)
			});
			myApp.setLegendGraphic(layer);
            layer.id = def.id;
			layer.showLegendGraphic = true;
			layer.overlayGroup = this.constants.OVERLAY_GROUP_NAMES[0];
            
            if(main){
                this.overlays[1].getLayers().push(layer);
            }else{
                this.featureMap.getLayers().push(layer);
            }
            
            //visibility event
            layer.on("change:visible",function(e){
                $("#" + e.target.id).prop("checked", !e.oldValue);
            });
            
		}
		
		/**
		 * Adds target dataset layer
		 */
		myApp.addTargetDatasetLayers = function(){
			this.targetDatasets.reverse();
			for(var i=0;i<this.targetDatasets.length;i++){
				var def = this.targetDatasets[i];
				this.addTargetDatasetLayer(def, true);
			}
			this.targetDatasets.reverse();
			
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
         * Toggles target dataset layer
         * @param id the target dataset id
         */
        myApp.toggleTargetDatasetLayer = function(id){
            var layer = this.getLayerByProperty(id, "id");
            if(layer.getVisible()){
                layer.setVisible(false);
            }else{
                layer.setVisible(true);
            }
        }
		
		myApp.toggleTargetDatasetLayers = function(group){
			var checked = $("#all_geomorphicfeatures").prop("checked");
			var data = this.targetDatasets.filter(function(obj){if(obj.group == group){return obj}});
			for(var i=0;i<data.length;i++){
				if((checked && !$("#"+data[i].id).prop("checked")) || (!checked && $("#"+data[i].id).prop("checked"))){
					$("#"+data[i].id).trigger('click');
				}
			}
		}
        
        /**
         * Get feature selection
         */
        myApp.getSelectedTargetDatasets = function(){
            var selection = new Array();
            var inputs = $(".target-checkboxes").find("input");
            for(var i=0;i<inputs.length;i++){
                if(inputs[i].checked & inputs[i].id != "all_geomorphicfeatures") selection.push(inputs[i].id);
            }
			console.log("Setting selected target datasets");
			selection = selection.sort();
			console.log(selection);
            return(selection);
        }
		
		/**
		 * Configures the map layer dynamic selector based on WFS
		 * @param areaType the area type 'EEZ' or 'ECOREGION'
		 * @param map_selector_id
		 * @param enableSelectInteraction
		 * @param enableHoverInteraction
		 * @param enableTooltip
		 */
		myApp._configureMapSelector = function(areaType, map_selector_id, enableSelectInteraction, enableHoverInteraction, enableTooltip){
			
			var this_ = this;
			var wfsRequest = "";
			if(areaType){

				this_.$areaTypeSelector.val(areaType);
				this_.$areaTypeSelector.trigger('change');
				
				$("#areaSelector").empty();
				// $("#areaSelector").select2('data', null);
				
				$("#areaSelectorWrapper").hide();
				$("#areaSelectorLoader").show();
				
				$("#areaTypeSelector").prop("disabled", true);

				//prepare the WFS request
				this_.areaFeatureType = null;
				this_.intersectFeatureType = null;
				this_.areaIdProperty = null;
				this_.areaLabelProperty = null;
				switch(areaType){
				case "EEZ":
					this_.areaFeatureType = "W_mpa:eez";
					this_.intersectFeatureType = "W_mpa:eez_mpa_intersect_v4";
					this_.areaIdProperty = "mrgid_eez";
					this_.areaLabelProperty = "geoname";
					break;
				case "ECOREGION":
					this_.areaFeatureType = "W_mpa:marine_ecoregions";
					this_.intersectFeatureType = "W_mpa:ecoregions_mpa_intersect_v4",
					this_.areaIdProperty = "ecoid";
					this_.areaLabelProperty = "ecoregion";
					break;
				}
				wfsRequest = this_.constants.OGC_WFS_BASEURL + "?version=1.0.0&request=GetFeature&typeName=" + this_.areaFeatureType;
				if(this_.constants.OGC_WFS_BBOX) {
					wfsRequest += "&bbox="+ this_.constants.OGC_WFS_BBOX.join(',');
				}
				wfsRequest += "&srsName=" + this_.constants.MAP_PROJECTION;
				wfsRequest += "&outputFormat=json";
			}
			
			console.log("Configuring map selector...");
			this[map_selector_id] = new ol.source.Vector({
				format: this_.constants.OGC_WFS_FORMAT,
				loader: function(extent, resolution, projection) {
	
					if(areaType){
						//DEFAULT VECTOR LAYER (EEZ or ECOREGION)
						console.log("Default '"+areaType+"' map selector");
						console.log(wfsRequest);
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
								this_[map_selector_id].addFeatures(modifiedFeatures);
								this_.$areaSelector.val('');
								this_.$areaSelector.trigger("change");
								
								//select events
								this_.$areaSelector.on("select2:select", function (e) {
									var targetFeature = this_[map_selector_id].getFeatureById(e.params.data.id);
									this_.getLayerByProperty("geoselector-default", "id").setVisible(true);
									
									//clear custom input in case
									var customSelector = this_.getLayerByProperty("geoselector-custom", "id");
									if(customSelector){
										document.getElementById("userArea").value = "";
										this_.userAreaFile = undefined;
										this_.userAreaFileName = undefined;
										$("#fieldSelectorWrapper").hide();
										this_.removeLayerByProperty("geoselector-custom", "id");
										this_.map.changed();
									}
									
									this_.selectInteraction.getFeatures().clear();
									this_.selectInteraction.getFeatures().push(targetFeature);
									this_.areaExtent = targetFeature.getGeometry().getExtent();
									this_.map.getView().fit(this_.areaExtent, this_.map.getSize());
									$("#analyzer").show();
								});
								this_.$areaSelector.on("select2:unselect", function (e) {
									this_.selectInteraction.getFeatures().clear();
									this_.areaExtent = null;
									this_.map.getView().fit(this_.map.getView().getProjection().getExtent(), this_.map.getSize());
									this_.map.getView().setZoom(this_.constants.MAP_ZOOM);
									if(this_.userAreaFile) $("#analyzer").hide();
									
									$($("li[data-where='#pageResults']")[0]).hide();
									$($("li[data-where='#pageReports']")[0]).hide();

								});
								
								//hide loader
								$("#areaSelectorLoader").hide();

								$("#areaTypeSelector").prop("disabled", false);


							},
							error: function(){
								console.log("failed to query WFS");
								this_.map = this_.initMap('map', true, false);
								this_.addTargetDatasetLayers();
								this_.$areaTypeSelector.val('');
								this_.$areaTypeSelector.trigger('change');
								$("#areaSelectorLoader").hide();

								$("#areaTypeSelector").prop("disabled", false);

							}
						});
					}else{
						//CUSTOM VECTOR LAYER (ZIPPED SHAPEFILE - USER INPUT)
						this_[map_selector_id].clear();
						loadshp({
							url: this_.userAreaFile,
							encoding: 'utf-8'
						}, function(data) {
							var pass = true;
							var features = this_.constants.OGC_WFS_FORMAT.readFeatures(data);
							console.log(features);
							

							//validation rule on geometry
							if(pass){
								pass = (features[0].getGeometry() instanceof ol.geom.Polygon) | (features[0].getGeometry() instanceof ol.geom.MultiPolygon);
								if(!pass) $("#userAreaError").html("Error: Polygon geometries expected!");
							}
							if(pass){
								this_[map_selector_id].addFeatures(features);
								this_.areaExtent = this_[map_selector_id].getExtent();
								this_.map.getView().fit(this_.areaExtent, this_.map.getSize());
							}else{
								this_.areaUserFile = undefined;
							}

							//fieldname selector
							if(pass){
								var fieldnames = Object.keys(features[0].getProperties()).filter(function(key){if(key != "geometry"){return key}});
								$("#fieldSelectorWrapper").show();
								this_.$fieldSelector = $("#fieldSelector").select2({
									placeholder: "Select a field",
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
								for(var i=0;i<fieldnames.length;i++){
									var fieldname = fieldnames[i];
									var option = new Option(fieldname,fieldname);
									this_.$fieldSelector.append(option);
								}
								this_.$fieldSelector.val('');
								this_.$fieldSelector.trigger('change');
							}
						});
					}
					
				}
				
			});
			
			//try to search for existing vector source
			var vectorLayer = myApp.getLayerByProperty(map_selector_id, "id");
			var title = areaType? ("Geo selector ("+areaType+")") : "My shapefile";
			if(typeof vectorLayer == "undefined"){
				//if no layer we create it
				
				//default style
				var vectorStyle = new ol.style.Style({
					fill: new ol.style.Fill({
						color: "rgba(255,255,255,0.4)" 
					}),
					stroke: new ol.style.Stroke({
						color: '#3399CC',
						width: 1.25
					})
				});
				if(!areaType){
					vectorStyle = new ol.style.Style({
					fill: new ol.style.Fill({
						color: "rgba(255,0,0,0.4)" 
					}),
					stroke: new ol.style.Stroke({
						color: '#FF0000',
						width: 1.25
					})
				});	
				}
				
				var vectorLayer = new ol.layer.Vector({
					id: map_selector_id,
					title : title,
					source : this_[map_selector_id],
					style: vectorStyle
				});
				this_.overlays[3].getLayers().push(vectorLayer);
				
				//select interactions
				//-------------------
				if(enableSelectInteraction){
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
					this_.map.addInteraction(this_.selectInteraction);
					
					//selection handling
					this_.selectInteraction.on('select', function(e) {
						if(e.selected.length > 0){
							this_.$areaSelector.val(e.selected[0].getId());
							var targetFeature = this_[map_selector_id].getFeatureById(e.selected[0].getId());
							this_.areaExtent = targetFeature.getGeometry().getExtent();
							this_.$areaSelector.trigger("change");
							$("#analyzer").show();
						}else{
							this_.$areaSelector.val('');
							this_.areaExtent = null;
							this_.$areaSelector.trigger("change");
							$("#analyzer").hide();
						}
					});
					this_.selectInteraction.on('unselect', function(e) {
						this_.$areaSelector.val('');
						this_.$areaSelector.trigger("change");
						$("#analyzer").hide();
					});
				}
				
				if(enableHoverInteraction){
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
					
					this_.map.addInteraction(this_.hoverInteraction);
				}
				
				//tooltip
				//-------
				if(enableTooltip){
					var areaTooltip = new ol.Overlay.Popup({id: (map_selector_id+"-tooltip"), isTooltip: true});
					this_.map.addOverlay(areaTooltip);
					
					var areaTooltipHandler = function(feature){
						var propertyName = areaType? this_.areaLabelProperty : "name";
						return feature.getProperties()[propertyName];
					}
					this_.map.on('pointermove', function(evt) {
					  var feature = this_.map.forEachFeatureAtPixel(evt.pixel,
						function(feature, layer) {
							if (layer) if(layer.getProperties().id != map_selector_id) return;
							var features = feature.get('features');
							if( !!features) {
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
				}
			}else{
				vectorLayer.setSource(this_[map_selector_id]);
				vectorLayer.setProperties({title: title});
			}
		}

		/**
		 * Configures a map layer default selector
		 * @param areaType the area type 'EEZ' or 'ECOREGION'
		 */
		myApp.configureDefaultMapSelector = function(areaType){
			var customSelector = this.getLayerByProperty("geoselector-custom", "id");
			if(customSelector){
				this.getLayerByProperty("geoselector-default", "id").setVisible(true);
				this.removeLayerByProperty("geoselector-custom", "id");
				this.map.changed();
			}
			this._configureMapSelector(areaType, this.constants.MAP_SELECTOR_DEFAULT, true, true, true);
		}
		
		/**
		 * Configures a map layer custom selector
		 */
		myApp.configureCustomMapSelector = function(){
			this.getLayerByProperty("geoselector-default", "id").setVisible(false);
			this._configureMapSelector(null, this.constants.MAP_SELECTOR_CUSTOM, false, false, true);
		}		
		
		//Analysis methods
		//===========================================================================================
		
		/**
		 * Check if there is result cached for this algorithm query
		 * @param areaType
		 * @param areaId
		 */
		myApp.hasAlgorithmCachedResult = function(areaType, areaId){
			var this_ = this;
			var deferred = $.Deferred();
			var cache_key = areaType + "-" + areaId + "-" + this_.getSelectedTargetDatasets().sort().join("-");
			var cache_filter = "key = '" + cache_key + "'";
			var cache_request =  this_.constants.OGC_WFS_BASEURL + "?version=1.0.0&request=GetFeature";
			cache_request += "&typeName=" + this_.constants.OGC_WFS_CACHE;
			cache_request += "&cql_filter=" + cache_filter;
			
			var out = {cached: false, link : null};
			if(!this_.custom){
				console.log("Check availability of cached result for key '"+cache_key+"'...");
				$.ajax({
					type: "GET",
					url: cache_request,
					cache: false,
					success: function(xml) {
						var responseXML = $(xml);
						console.log(responseXML);
						var features = responseXML.find(this_.constants.OGC_WMS_NS+'\\:link, link');
						if(features.length > 0){
							var cache_link = $(features[0]).text();
							out.cached = true;
							out.link = cache_link;
						}
						console.log(out);
						deferred.resolve(out);
					},
					error : function (xhr, ajaxOptions, thrownError){
						deferred.reject(thrownError);
					}
				});
			}else{
				deferred.resolve(out);
			}
			return deferred.promise();
		}
		
		       
		/**
         * Init Dataminer WS
         */
		myApp.initDataminerWS = function(){
			var this_ = this;
			this_.wps = new WpsService({
				url: (this_.constants.DATAMINER_BASEURL + "/wps/WebProcessingService?gcube-token=" + this_.securityToken + "&"),
				version: "1.0.0"
			});
		}
		
		/**
		 * Execute or retrieves from cache
		 * @param areaType the area type 'EEZ' or 'ECOREGION'
		 * @param areaId the id of the selected area
		 * @param areaFileEntity an entity returned by myApp.uploadFile (for custom upload)
		 */		
		myApp.executeAlgorithmRequest = function(areaType, areaId, areaFileEntity){
			
			var this_ = this;
			var t1 = new Date();
			
			//is it with custom area input?
			this_.custom = areaFileEntity? true : false;
			
			//set feature extent
			this_.map.getView().fit(this_.areaExtent, this_.map.getSize());
			
			//if default analysis we look into cache firs otherwise for custom analysis we continue
			var actionNext = this_.hasAlgorithmCachedResult(areaType, areaId);
			actionNext.then(function(cacheResult){
				
				if(!cacheResult.cached){
					console.log("Executing algorithm request with the following params");
					console.log("Security Token = "+this_.securityToken);
					var selectedFeatures = this_.getSelectedTargetDatasets();
					var selected_data_feature = (selectedFeatures.length == 0)? "NA" : selectedFeatures.join(',');
					
					//output metadata
					this_.storeAlgorithmOutputMetadata(areaType, areaId, this_.areaExtent, t1, undefined);

					//dataminer ws execute callback
					var wpsExecuteCallback = function(response){
						var hasSuccess = !response.errorThrown;
						if(hasSuccess){
							console.log("Successful algorithm execution!"); 
							var xml = response.responseDocument;
							var t2 = new Date();
							this_.processMetadata.end = t2;
							this_.processMetadata.dateTime = this_.getFolderDateTimeString(t2);
							
							$($("li[data-where='#pageResults']")[0]).show();
							if(!this_.custom) $($("li[data-where='#pageReports']")[0]).show();

							//process output data
							//Recent DataMiner nows handle logs as 1st Result, result is stored as 2d Result (!)
							var dataUrl = $($(xml).find('d4science\\:Data, Data')[1]).text();
							this_.getAlgorithmOutputData(dataUrl, false);
						}else{
							console.log("Error while executing algorithm request: " + response.errorThrown);
							console.log(response.textStatus);
							$("#mpaResultsWrapper").append("<p><h3 style='display:inline;'>Sorry! </h3>Your computation could not be performed!</br></br>Errors can happen when the target region of analysis is very large (such as the Canadian EEZ) or when there are geometry errors in the underlying data that is analyzed. We are working hard towards fixing these errors in the coming weeks, and increasing the efficiency of the analysis.</br>Meanwhile, you could try analyzing another area or select less features to analyze. The error could also be a timeout issue in which case you could try running your analysis using the Data Miner interface in this VRE. Finally, you can also download the R script of the algorithm <a href='https://github.com/grid-arendal/mpa_algo2' target='_blank'><nobr>here</nobr></a> and run it on your own computer on in the VRE instance of R Studio.</br></br><b>Here is the log of your computation:</p>");
							$("#mpaResultsWrapper").append("<p style='color:black;'>Analysis failed!</p>");
							$("#mpaResultsLoader").hide();
							$("#areaTypeSelector").prop("disabled", false);
							$("#areaSelector").prop("disabled", false);
							$("#analyzer").attr("disabled",false);
							$("#mpaResultsLoader").hide();
							$($("li[data-where='#pageResults']")[0]).show();
							if(!this_.custom) $($("li[data-where='#pageReports']")[0]).show();
						}
					}
					
					//wps inputs
					var inputGen = new InputGenerator();
					var wpsInputs = new Array();
					wpsInputs.push(inputGen.createLiteralDataInput_wps_1_0_and_2_0('Report_Format', 'xs:string', 'undefined', 'json'));
					wpsInputs.push(inputGen.createLiteralDataInput_wps_1_0_and_2_0('MPA_Shapefile_Url', 'xs:string', 'undefined', (areaFileEntity? areaFileEntity.url : "https://absences.zip")));
					wpsInputs.push(inputGen.createLiteralDataInput_wps_1_0_and_2_0('Field_name', 'xs:string', 'undefined', (areaFileEntity? this_.$fieldSelector.val() : 'name')));
					wpsInputs.push(inputGen.createLiteralDataInput_wps_1_0_and_2_0('Marine_Boundary', 'xs:string', 'undefined', (areaType? areaType : "EEZ")));
					wpsInputs.push(inputGen.createLiteralDataInput_wps_1_0_and_2_0('Region_Id','xs:string','undefined',(areaId? areaId : "NA")));
					wpsInputs.push(inputGen.createLiteralDataInput_wps_1_0_and_2_0('Selected_Data_Feature','xs:string','undefined',selected_data_feature));
					console.log("-- Algorithm Inputs --");
					console.log(wpsInputs);
					
					//wps outputs
					var outputGen = new OutputGenerator();
					var wpsOutputs = new Array();
					wpsOutputs.push(outputGen.createComplexOutput_WPS_1_0('non_deterministic_output'));
					console.log("-- Algorithm Outputs --");
					console.log(wpsOutputs);
					
					//execute request
					console.log("Executing algorithm request...");
					this_.wps.execute(wpsExecuteCallback, this_.constants.DATAMINER_IDENTIFIER, 'document', 'sync', true, wpsInputs, wpsOutputs);
					
				}else{
					console.log("Retrieving algorithm output from PAIM cache");
					var t2 = new Date()
					$($("li[data-where='#pageResults']")[0]).show();
					this_.storeAlgorithmOutputMetadata(areaType, areaId, this_.areaExtent, t1, t2);
					this_.processMetadata.dateTime = this_.getFolderDateTimeString(t2);
					this_.getAlgorithmOutputData(cacheResult.link, true);
				}
				
			});
		}
		
		/**
		 * Get algorithm output JSON data
		 * @param url
		 * @param cached
		 */		
		myApp.getAlgorithmOutputData = function(url, cached){
			
			var this_ = this;
			
			if(this_.constants.DATAMINER_OUTPUTDATA_HTTPS){
				url = url.replace(/^http:\/\//i, 'https://');
			}
			
			console.log("Fetching algorithm output data '"+url+"'");
			
			$.ajax({
				url: url,
				success: function(results){
					
					if(!cached) results = JSON.parse(results);
					
					this_.processData = new Array();
						
					//explicit order by non-AOI (non-MPA in default analysis) (EEZ or ECOREGION)
					//then All AOIs (MPAs in default analysis) then each AOI (MPA in default analysis)
					this_.processData = this_.processData.concat(results.filter(function(row){if(["AOI", this_.constants.AOI].indexOf(row.type) == -1) return row}));
					this_.processData = this_.processData.concat(results.filter(function(row){if(["All AOIs", ("All "+this_.constants.AOI+"s")].indexOf(row.name) >= 0) return row}));
					var mpas = results.filter(function(row){
						if(["AOI", this_.constants.AOI].indexOf(row.type) >= 0
						&& ["All AOIs", ("All "+this_.constants.AOI+"s")].indexOf(row.name) == -1){
							return row
						}
					});
					mpas.sort(function(a,b) {return (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0);} ); 
					this_.processData = this_.processData.concat(mpas);		
						
					//remove empty columns
					var keys = Object.keys(this_.processData[0]);
					for(key in keys){
						var keyname = keys[key];
						if(keyname != "id" & this_.processData.filter(function(i){return i[keyname] == 0}).length == this_.processData.length){
							for (var i = 0, len = this_.processData.length; i < len; i++) {
								delete this_.processData[i][keyname];
							}
						}
					}
						
					//prepare dtColumns
					var columns = Object.keys(this_.processData[0]);
					this_.columnNames = ["id", "Name", "Type", "Area"];
					for(var i=0;i<columns.length;i++){
						var column = columns[i];
						for(var j=0;j<this_.targetDatasets.length;j++){
							var gtype = this_.targetDatasets[j];
							if(gtype.id === column){
								this_.columnNames.push(gtype.title);
								break;
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
					var timerHtml = '<p class="mpa-timer">Result returned in '+timer+' seconds!</p>';
					$("#mpaResultsWrapper").append(timerHtml);
						
					//value format (absolute value or %)
					
					var formatSwitcherHtml = '<table class="mpa-formatswitcher"><tr>';
					if(!this_.custom){
						formatSwitcherHtml += '<td><input id="surfaceSwitcher" type="radio" name="formatSwitcher" value="surface" checked onclick="myApp.renderStatistics()">Surface (km²)</td>';
						formatSwitcherHtml += '<td><input id = "percentSwitcher" type="radio" name="formatSwitcher" value="percentage" onclick="myApp.renderStatistics()">% of geomorphic feature</td>';
					}else{
						formatSwitcherHtml += '<td>Surface (km²)</td>';
					}
					formatSwitcherHtml += '</tr></table>';
					$("#mpaResultsWrapper").append(formatSwitcherHtml);

					var csvUploadButton = '<button type="button" class="mpaResultsTable-csv-upload" title="Save & Download Results data (CSV)" onclick="myApp.saveData(true)"></button>';
					$("#mpaResultsWrapper").append(csvUploadButton);

					var pdfExportButton = '<button type="button" class="mpaResultsTable-pdf-export" title="Save & Download Results report (PDF)" onclick="myApp.saveResults(true)"></button>';
					$("#mpaResultsWrapper").append(pdfExportButton);
				
					var loader = '<div id="upload-loader" style="display:none;"><span class="mpaResultsTable-upload-loader"></span><span id="upload-state" class="mpaResultsTable-upload-state"></span></div>';
					$("#mpaResultsWrapper").append(loader);
						
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
									var aoiName = mData;
									if(aoiName == "All AOIs" && !this_.custom){
										aoiName = aoiName.replace("AOI", this_.constants.AOI);
									}
									return this_.custom? mData : '<a href="#" onclick="myApp.accessReports(\''+row.id+'\')" title="Access report" class="mpa-table-name">' + aoiName +'</a>';                             
								}
							},
							{
								targets: 2,
								render : function ( mData, type,row, meta ) {
									return this_.custom? mData : this_.constants.AOI;                             
								}
							},
							{
								targets: Array.apply(null, Array(Object.keys(this_.processData[0]).length)).map(function (_, i) {return i;}).slice(3), //all surfacic fields
								render: function( mData, type, row, meta ){
									return '<span class="mpa-table-stat">'+this_.renderStatValue(mData, (this_.custom? "surface" : $('input[name=formatSwitcher]:checked').val()), meta)+'</span>';
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
					console.log("Error while fetching algorithm output data");
					$("#mpaResultsWrapper").append("<p><h3 style='display:inline;'>Sorry! </h3>Your computation could not be performed...</br></br>Errors can happen when the target region of analysis is very large (such as the Canadian EEZ) or when there are geometry errors in the underlying data that is analyzed. We are working hard towards fixing these errors in the coming weeks, and increasing the efficiency of the analysis.</br>Meanwhile, you could try analyzing another area or select less features to analyze. The error could also be a timeout issue in which case you could try running your analysis using the Data Miner interface in this VRE. Finally, you can also download the R script of the algorithm <a href='https://github.com/grid-arendal/mpa_algo2' target='_blank'><nobr>here</nobr></a> and run it on your own computer on in the VRE instance of R Studio.</br></br><b>Here is the log of your computation:</p>");
					$("#mpaResultsWrapper").append("<p style='color:red;'>Analysis failed!</p>");
					$("#mpaResultsLoader").hide();
					$("#areaTypeSelector").prop("disabled", false);
                    $("#areaSelector").prop("disabled", false);
                    $("#analyzer").attr("disabled",false);
				}
			});
		}
		
		/**
		 * Stores local Algorithm output metadata
		 */
		myApp.storeAlgorithmOutputMetadata = function(areaType, areaId, areaExtent, start, end){
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
                name: (([("All "+this_.constants.AOI+"s"),"All AOIs"].indexOf(data.name) >= 0)? (this_.custom? "All AOIs" : ("All "+this_.constants.AOI+"s")) : data.name),
                type: (([this_.constants.AOI,"AOI"].indexOf(data.type) >= 0)? (this_.custom? "AOI" : this_.constants.AOI) : data.type),
                isMPA:  ([this_.constants.AOI,"AOI"].indexOf(data.type) >= 0),				
				isSingleMPA: ([("All "+this_.constants.AOI+"s"),"All AOIs"].indexOf(data.name) == -1 && [this_.constants.AOI,"AOI"].indexOf(data.type) >= 0),								
				isAllMPA: ([("All "+this_.constants.AOI+"s"),"All AOIs"].indexOf(data.name) >= 0),
				isEEZ: this.processMetadata.areaType == "EEZ",
				isECOREGION: this.processMetadata.areaType == "ECOREGION",
                surface: this.renderStatValue(data.surface, "surface"),
                surfaceUnit: this.constants.SURFACE_UNIT.label,
                target: this.processData.filter(function(row){if(row.type == this_.processMetadata.areaType) return row})[0],
                features: []
            }
			for(var i=0;i<this.targetDatasets.length;i++){
				var surface = data[this.targetDatasets[i].id];
				if(surface > 0){
						var targetSurface = this.report.target[this.targetDatasets[i].id];
						var featureReport = {
							metadata: this.targetDatasets[i],
							data: {
									surface: this.renderStatValue(surface, "surface"),
									surfaceUnit: this.constants.SURFACE_UNIT.label,
									indicator1: Math.round(surface / targetSurface * 100 * 100) / 100,
									map: this.getFeatureReportMap(this.report.id, this.targetDatasets[i].layer)
							}
						}
						this.report.features.push(featureReport);
				}
			}
            
			//query intersect by filter (if any mpa) to get bbox
			var targetFilter = this.areaIdProperty + " = '" + this.report.target.id + "'";
			if([this_.constants.AOI, "AOI"].indexOf(this.report.type) >=0 && ["All "+this_.constants.AOI+"s","All AOIs"].indexOf(this.report.name) == -1){
				targetFilter += " AND wdpaid = " + id;
			}
			var intersectRequest = this.constants.OGC_WFS_BASEURL + "?version=1.0.0&request=GetFeature";
			var targetLayer = ([this_.constants.AOI, "AOI"].indexOf(this.report.type) == -1)? this.areaFeatureType : this_.intersectFeatureType;
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
					
					console.log("-> Feature report");
					console.log(this_.report);
				},
				error: function(){
					console.log("failed to query WFS");
					$("#mpaReportMainWrapper").append("The MPA analysis returned an error...");
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
			this.addTargetDatasetLayer(trgGtype, false);
			this.addLayer(false, 0, this.report.id, this.processMetadata.areaType, this.processMetadata.areaFeatureType, true, true, (this.processMetadata.areaIdProperty + ' = ' + this.processMetadata.areaId));
			this.addLayer(false, 0, this.report.id, "AOI", this.report.featureType, true, true, this.report.filter);
		}

		/**
		 * Map event handler
		 */
		myApp.onMapRender = function(triggerer, handler){
			var targetMap = this.map;
			var deferred = $.Deferred();
			var mapEvt = targetMap.on('postrender', function(e) {
				var loaded = targetMap.getControls().getArray()[0].loadStatus_;
				if(loaded){
					var out = handler();
					deferred.resolve(out);
				}
			});
			triggerer();
			return deferred.promise();
		}

		/**
		 * Function to produce results as PDF
        	 *
		 */
		myApp.produceResultsPDF = function(data){
			var this_ = this;

			//logo TODO see how to download it from workspace
			var imgData = 'data:image/png;base64,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';
						
			var pdf = new jsPDF();
			var totalWide = 297;
			var totalShort = 210;
			var maxX = totalWide;
			var maxY = totalShort; 
		
			//header
			pdf.addImage(imgData, 'PNG', 10, 10, 50, 20, undefined, 'medium');
	
			//title
			pdf.setFontType('bold')
			pdf.setFontSize(20);
			pdf.text(10, 40, 'Protected Impact Area Maps – Analysis report');
			pdf.setFontSize(15);
			
			//handle information on the selected feature
			if(!this_.custom){
				var selectedEntity = this_.processData.filter(function(row){if(row.type != "AOI") return row})[0];
				pdf.setFontType('bold');
				var entity = selectedEntity.name + ' (' + selectedEntity.type +')';
				var entityTxt = pdf.splitTextToSize(entity, pdf.internal.pageSize.width - 110, {})			
				pdf.text(10, 50, entityTxt);
				pdf.setFontType('normal');
				pdf.setFontSize(12);
				pdf.text(10, 70, 'ID: ' + selectedEntity.id + ' (' + this_.areaIdProperty + ')');
				if(this_.processMetadata.areaType == "EEZ"){
					pdf.text(10, 75, "EEZ description: " + "http://www.marineregions.org/gazetteer.php?p=details&id=" + selectedEntity.id);
				}
			}else{
				pdf.text(10, 75, "Custom Area(s) of Interest (user shapefile)");
			}
						
			//handle user info & date of creation
			pdf.setFontType('italic');
			if(this_.userProfile) pdf.text(10, 85, "PDF Report generated by " + this_.userProfile.fullname);
			var today = new Date();
			pdf.text(10, 90, "Creation date/time: " + today.toISOString());

			//Purpose
			var abstractTxt = "This report has been produced from the BlueBridge Protected Area Impact Map VRE Data Explorer (https://i-marine.d4science.org/group/protectedareaimpactmaps) ";
			abstractTxt += "which allows users to query a rich database to report on the presence of natural features and human usages of managed areas (i.e.: Marine Protected Areas) ";
			abstractTxt += "relative to a target region of interest.";
			pdf.setFontType('normal');
			pdf.setFontSize(12);
			abstractTxt = pdf.splitTextToSize(abstractTxt, pdf.internal.pageSize.width - 20, {})
			pdf.text(10,100, abstractTxt);


			//Datasources
			if(!this_.custom){
				pdf.setFontSize(10);
				var source1 = "- Marine Protected Areas: IUCN and UNEP-WCMC (2017), The World Database on Protected Areas (WDPA) [On-line], [January 2017], Cambridge, UK: UNEP-WCMC. Available here. ";
				source1 += "Post-processed by Lucy Bastin and Andrea Mandrici, Joint Research Centre of the European Commission - methodology available at http://www.protectedplanet.net";
				var source2 = "";
				if(this.processMetadata.areaType == "EEZ"){
					source2 = "- Exclusive Economic Zones: Flanders Marine Institute (2016). Maritime Boundaries Geodatabase: Maritime Boundaries and Exclusive Economic Zones (200NM), version 9. ";
					source2 += "Available online at http://www.marineregions.org";
				}else if(this.processMetadata.areaType == "ECOREGION"){
					source2 = "- Marine Ecoregions: Spalding MD, Fox HE, Allen GR, Davidson N, Ferdaña ZA, Finlayson M, Halpern BS, Jorge MA, Lombana A, Lourie SA, Martin KD, McManus E, Molnar J, Recchia CA, Robertson J (2007). Marine Ecoregions of the World: a bioregionalization of coast and shelf areas.";
				}
				var source3 = "- The global seafloor geomorphic features map has been produced through a collaboration between Geoscience Australia, GRID-Arendal and Conservation International. ";
				source3 += "Reference: Harris et. al. (2014) Geomorphology of the oceans.Marine Geology (in Press)";
				
				pdf.setFontType('bold');
				pdf.text(10, 125, 'Data Sources for the Analysis:');
				pdf.setFontType('normal');
				pdf.text(15, 130, pdf.splitTextToSize(source1, pdf.internal.pageSize.width - 30, {}));
				pdf.text(15, 148, pdf.splitTextToSize(source2, pdf.internal.pageSize.width - 30, {}));
				pdf.text(15, 158, pdf.splitTextToSize(source3, pdf.internal.pageSize.width - 30, {}));
			}
			
			//Map
			var imageMap = $("#map").find("canvas")[0].toDataURL('image/png');
			pdf.addImage(imageMap, 'PNG', 20, 175, 170, 100, undefined, 'medium');

			//Project redit
			pdf.setFontSize(8);
			var credit = "This work has received funding from the European Union's Horizon 2020 research and innovation programme under the BlueBRIDGE project (Grant agreement No 675680).";
			credit = pdf.splitTextToSize(credit, pdf.internal.pageSize.width - 20, {});
			pdf.text(10, 280, credit);
 
			//subreport
			var createSubReport = function(percent){
				//handle table results (with real values)
				pdf.addPage( 'a4','landscape');
				pdf.setFontType('bold');
				pdf.setFontSize(16);
				pdf.text(10, 20, (percent? 'Percentage of geomorphic features' : 'Surfaces - in square kilometers'));
				pdf.line(10, 25, maxX - 10, 25);
				var idx = 35;			
				if(!percent){
					pdf.setFontType('normal');
					pdf.setFontSize(12);
					pdf.text(10, idx, 'Data in CSV format is available for download at '+ data.url);
					idx += 10;
				} 
    	 			var elem = document.getElementById("mpaResultsTable");
    				var res = pdf.autoTableHtmlToJson(elem);
    				pdf.autoTable(this_.columnNames.slice(1), res.data,{
					   startX: 0,
					   startY: idx,
					   styles: {overflow: 'linebreak', columnWidth: 'wrap', cellPadding: 0.5, fontSize: 6, margin: 0},
        				   columnStyles: {0: {columnWidth: 50}}
  				});

				//handle graphic result (with real values)
				pdf.addPage( 'a4','landscape');
				pdf.setFontType('bold');
				pdf.setFontSize(16);
				var imageGraph = $("#mpaResultsCharts").highcharts().createCanvas();
				var marginX = 10;
				var marginY = 20;
        		pdf.addImage(imageGraph, 'PNG', marginX, marginY, maxX - 2*marginX, maxX / 2);	
			}

			//handle sub-report 1 (surfaces)
			//-----------------------------
			if(!this_.custom) $("#surfaceSwitcher")[0].click();
			createSubReport(false);
			
			//handle sub-report 2 (percentage)
			//--------------------------------
			if(!this_.custom){
				$("#percentSwitcher")[0].click();
				createSubReport(true);
			}
			
			//output
   			if(!this_.custom) $("#surfaceSwitcher")[0].click();
			return pdf;
		}     

        /**
         * myApp.configureViewer()
         */
        myApp.configureViewer = function(){
            var this_ = this;
			this_.map = this_.initMap('map', true, false);

			//add MPA layer
            this_.addLayer(true, 2, "allmpas", "Marine Protected Areas", "W_mpa:geo_fea_mpa", true, true);
			this_.addLayer(true, 0, "emodnet_seafloor_habitats_2017", "EMODNet Seafloor habitats (2017)", "W_mpa:emodnet_seafloor_habitat_2017", true, false);
        
			//default selector
			this_.configureDefaultMapSelector("EEZ");
	
			//do business once geomorphic feature data is loaded
			this_.fetchTargetDatasets()
			.done(function(data){
			
				//add geomorphic Feature layers
				this_.addTargetDatasetLayers();
		
				//analyzer button (trigger Dataminer)
				$("#analyzer").on("click", function(e){                            
						
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
						
						if(this_.userAreaFile){
							//if custom file upload
							console.log("MPA custom analysis");
							this_.closeQueryDialog();
							$("#mpaResultsLoaderMsg").html("Uploading shapefile...");
							this_.uploadUserAreaFile().then(function(uploadedEntity){
								console.log(uploadedEntity);
								$("#mpaResultsLoaderMsg").html("Analyzing shapefile...");
								this_.executeAlgorithmRequest(null,null,uploadedEntity);
							});
						}else{
							//if based on zone layer
							var areaType = this_.$areaTypeSelector.select2("data")[0].id;
							var areaId = this_.$areaSelector.select2("data")[0].id;
							console.log("MPA analysis for "+areaType+" id ='"+areaId+"'");
							this_.closeQueryDialog();
							$("#mpaResultsLoaderMsg").html("Analyzing MPAs...");
							this_.executeAlgorithmRequest(areaType, areaId);
						}
						
				});

				$($("li[data-where='#pageMap']")).on("click", function(e){
					$($("#map").find("canvas")).show();
				});

			})
			.fail(function() {
				alert("geodata.json is not valid JSON data");
			});
        }

		//===========================================================================================
		//Widgets UIs
		//===========================================================================================
    
        /**
       * Init dialog
       */
       myApp.initDialog = function(id, title, classes, liIdx, my, at){
             if(!classes){
                classes  = {
                  "ui-dialog": "ui-corner-all",
                  "ui-dialog-titlebar": "ui-corner-all",
                }
             }
             $( "#" + id ).dialog({
                autoOpen: false,
                title: title,
                classes: classes,
		position: { my: my, at: at, of: window },
                show: {
                    effect: "fade",
                    duration: 300
                },
                hide: {
                    effect: "fade",
                    duration: 300
                },
                open: function( event, ui ) {
                    $($("nav li")[liIdx]).addClass("active");
                },
                close: function( event, ui ) {
                    $($("nav li")[liIdx]).removeClass("active");
                }
            });
       }
       
       /**
        * Open dialog
        */
        myApp.openDialog = function(id){
            if(!$("#" + id).dialog("isOpen")){
                $("#" + id).dialog("open");
            }
        }
       
       /**
        * Close dialog
        */
       myApp.closeDialog = function(id){
            if($("#" + id).dialog("isOpen")){
                $("#" + id).dialog("close");
            }
       }
        
       /**
       * Open 'About' dialog
       */
       myApp.openAboutDialog = function(){
             this.closeQueryDialog();
             this.openDialog("aboutDialog");
       }
       /**
        * Close 'About' dialog
        */
       myApp.closeAboutDialog = function(){
            this.closeDialog("aboutDialog");
       }
       
       /**
        * Open 'Query' dialog
        */
       myApp.openQueryDialog = function(){
            this.closeAboutDialog();
            this.openDialog("queryDialog");
       }
       
       /**
        * Close 'Query' dialog
        */
        myApp.closeQueryDialog = function(){
            this.closeDialog("queryDialog");
        }
		 
		//===========================================================================================
		//application init
		//===========================================================================================
		
		//fetch token
		myApp.fetchSecurityToken();

		//initialize wpsService
		myApp.initDataminerWS();
		console.log(myApp.wps);
		
		//fetch user profile
		myApp.fetchUserProfile();
		
		//area type selector
		myApp.initAreaTypeSelector();
        
        //init map
        myApp.configureViewer();
        
        //init widget about
        myApp.initDialog("aboutDialog", "Welcome!", {"ui-dialog": "about-dialog", "ui-dialog-title": "dialog-title"}, 0, "center", "top+35%");
        myApp.initDialog("queryDialog", "Query", {"ui-dialog": "query-dialog", "ui-dialog-title": "dialog-title"}, 1, "center", "top+35%");
        myApp.openAboutDialog();

	});
	
}( jQuery ));


