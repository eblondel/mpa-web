/**
 * MPA Analysis web-application by UN FAO & UNEP GRID-ARENDAL
 * Application development powered by FAO FIGIS team, and funded by BlueBridge EC project
 *
 * Last change: 2022-09-22
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
			IMG_DATA: "data/imgdata.json",
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
			//var esri1Template = 'https://server.arcgisonline.com/ArcGIS/rest/services/ESRI_Imagery_World_2D/MapServer/tile/{z}/{y}/{x}';
			var esri1Template = 'https://wi.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
			//var esri2Template = 'https://server.arcgisonline.com/ArcGIS/rest/services/ESRI_StreetMap_World_2D/MapServer/tile/{z}/{y}/{x}';
			var baseLayers = [
				new ol.layer.Group({
					'title': "Basemaps",
					layers: [
						/*new ol.layer.Tile({
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
						}),*/
						new ol.layer.Tile({
							title : "ESRI World Imagery",
							type: 'base',
							source : new ol.source.XYZ({
								attributions: [
									new ol.Attribution({
										html: 'Tiles Â© <a href="https://wi.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/MapServer">ArcGIS</a>'
									})
								],
								projection: ol.proj.get(this_.constants.MAP_PROJECTION),
								tileSize: 256,
								maxResolution: 180 / 256,
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
						formatSwitcherHtml += '<td style="padding-top:20px;"><input id="surfaceSwitcher" type="radio" name="formatSwitcher" value="surface" checked onclick="myApp.renderStatistics()">Surface (km²)</td>';
						formatSwitcherHtml += '<td style="padding-top:20px;"><input id = "percentSwitcher" type="radio" name="formatSwitcher" value="percentage" onclick="myApp.renderStatistics()">% of geomorphic feature</td>';
					}else{
						formatSwitcherHtml += '<td style="padding-top:20px;">Surface (km²)</td>';
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
			if(this.custom){
				this.processMetadata.userAreaFileName = this.userAreaFile.name;
				this.processMetadata.userAreaFileNameField = this.$fieldSelector.val();
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
			this.addLayer(false, 0, this.report.id, "AOI", this.report.featureType + "_display", true, true, this.report.filter);
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
		 * Function to load an  image
		 * Sets an object with named images base64 strings
		 */
		myApp.loadImage = function(id, src){
			var this_ = this;
			console.log("Loading report image '"+src+"' ["+id+"]...");
			$.ajax({
				type: "GET",
				url: src,
				beforeSend: function (xhr) {
					xhr.overrideMimeType('text/plain; charset=x-user-defined');
				},
				success: function (result, textStatus, jqXHR) {       
					if(result.length < 1){
						console.error("PAIM error: No image for '"+src+"'");
						return
					}

					var binary = "";
					var responseText = jqXHR.responseText;
					var responseTextLen = responseText.length;
					for ( i = 0; i < responseTextLen; i++ ) {
						binary += String.fromCharCode(responseText.charCodeAt(i) & 255)
					}
					var dataURL = "data:image/png;base64," + btoa(binary);
					this_.reportImages[id] = dataURL;
					console.log("Loading report image '"+src+"' ["+id+"] OK!");
				},
				error: function(xhr, textStatus, errorThrown){
					console.error("PAIM error: No image for '"+src+"'");
				} 
			});
		}
		
		/**
		 * Function to load images from sources files
		 * Sets an object with named images base64 strings
		 */
		myApp.loadImages = function(){
			var this_ = this;
			this_.reportImages = new Object();
			console.log("Loading report images...");
			$.getJSON(this_.constants.IMG_DATA, function(srcImages){
				for(var i=0;i<srcImages.length;i++){
					var srcImage = srcImages[i];
					this_.loadImage(srcImage.id, srcImage.src);
				};
			});
		}
		
		/**
		 * Function to produce results as PDF
         *
		 */
		myApp.produceResultsPDF = function(data){
			var this_ = this;
			
			//init
			var pdf = new jsPDF();
			pdf.page = 1;
			
			//pdf utils
			pdf.addNewPage = function(orientation){
				
				//Project credit
				if(pdf.page == 1){
					pdf.addImage(this_.reportImages.ec, 'PNG', 10, pdf.internal.pageSize.height - 15, 25, 10, undefined, 'medium');
					pdf.setFontSize(8);
					var credit = "This work has received funding from the European Union's Horizon 2020 research and innovation programme under the BlueBRIDGE project (Grant agreement No 675680).";
					credit = pdf.splitTextToSize(credit, pdf.internal.pageSize.width - 50, {});
					pdf.text(40, pdf.internal.pageSize.height - 10, credit);
				}
				
				//add page
				pdf.addPage( 'a4', orientation);
				pdf.page++;
			}
			pdf.addLineSeparator = function(){
				pdf.line(10, 25, pdf.internal.pageSize.width - 10, 25);
			}
		
			//header
			pdf.addImage(this_.reportImages.bluebridge, 'PNG', 10, 10, 50, 20, undefined, 'medium');
	
			//title
			pdf.setFontType('bold')
			pdf.setFontSize(20);
			pdf.text(10, 40, 'Protected Area Impact Maps – Analysis report');
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
				pdf.setFontType('normal');
				pdf.setFontSize(12);
				pdf.text(10, 70, "Custom Areas of Interest (user shapefile)")
				pdf.text(10, 75, 'Shapefile name: '+this_.processMetadata.userAreaFileName+"' (AOI identifier: '"+this_.processMetadata.userAreaFileNameField+"')");
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
			pdf.setFontSize(10);
			pdf.setFontType('bold');
			pdf.text(10, 125, 'Data Sources for the Analysis:');
			pdf.setFontType('normal');
			if(!this_.custom){
				var source1 = "- Marine Protected Areas: IUCN and UNEP-WCMC (2017), The World Database on Protected Areas (WDPA) [On-line], [January 2017], Cambridge, UK: UNEP-WCMC. Available here. ";
				source1 += "Post-processed by Lucy Bastin and Andrea Mandrici, Joint Research Centre of the European Commission - methodology available at http://www.protectedplanet.net";
				var source2 = "";
				if(this.processMetadata.areaType == "EEZ"){
					source2 = "- Exclusive Economic Zones: Flanders Marine Institute (2016). Maritime Boundaries Geodatabase: Maritime Boundaries and Exclusive Economic Zones (200NM), version 9. ";
					source2 += "Available online at http://www.marineregions.org";
				}else if(this.processMetadata.areaType == "ECOREGION"){
					source2 = "- Marine Ecoregions: Spalding MD, Fox HE, Allen GR, Davidson N, Ferdaña ZA, Finlayson M, Halpern BS, Jorge MA, Lombana A, Lourie SA, Martin KD, McManus E, Molnar J, Recchia CA, Robertson J (2007). Marine Ecoregions of the World: a bioregionalization of coast and shelf areas.";
				}
				pdf.text(15, 130, pdf.splitTextToSize(source1, pdf.internal.pageSize.width - 30, {}));
				pdf.text(15, 148, pdf.splitTextToSize(source2, pdf.internal.pageSize.width - 30, {}));
			}
			var source3 = "- The global seafloor geomorphic features map has been produced through a collaboration between Geoscience Australia, GRID-Arendal and Conservation International. ";
			source3 += "Reference: Harris et. al. (2014) Geomorphology of the oceans.Marine Geology (in Press)";
			pdf.text(15, (this_.custom? 130 : 158), pdf.splitTextToSize(source3, pdf.internal.pageSize.width - 30, {}));
			
			//Map
			var imageMap = $("#map").find("canvas")[0].toDataURL('image/png');
			pdf.addImage(imageMap, 'PNG', 20, 175, 170, 100, undefined, 'medium');
 
			//subreport
			var createSubReport = function(percent){
				//handle table results (with real values)
				pdf.addNewPage('landscape');
				pdf.setFontType('bold');
				pdf.setFontSize(16);
				pdf.text(10, 20, (percent? 'Percentage of geomorphic features' : 'Surfaces - in square kilometers'));
				pdf.addLineSeparator();
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
				pdf.addNewPage('landscape');
				pdf.setFontType('bold');
				pdf.setFontSize(16);
				var imageGraph = $("#mpaResultsCharts").highcharts().createCanvas();
				var marginX = 10;
				var marginY = 20;
        		pdf.addImage(imageGraph, 'PNG', marginX, marginY, pdf.internal.pageSize.width - 2*marginX, pdf.internal.pageSize.width / 2);	
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
		
		//gcube-dependent blocks
		myApp.fetchSecurityToken();	//fetch token
		myApp.fetchUserProfile();	//fetch user profile
		myApp.initDataminerWS();	//initialize wpsService
		
		//image assets for reporting
		myApp.loadImages();
		
		//GIS component
		myApp.initAreaTypeSelector();
        myApp.configureViewer();
        
        //init widget about
        myApp.initDialog("aboutDialog", "Welcome!", {"ui-dialog": "about-dialog", "ui-dialog-title": "dialog-title"}, 0, "center", "top+35%");
        myApp.initDialog("queryDialog", "Query", {"ui-dialog": "query-dialog", "ui-dialog-title": "dialog-title"}, 1, "center", "top+35%");
        myApp.openAboutDialog();

	});
	
}( jQuery ));


