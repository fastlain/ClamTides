"use strict";

// create Google Map API global variables
var map, places, searchBox;

function handleStartOverBtn(){
    $("#restart-btn").click(function(evt){
        // clear results-tbody 
        $("#results-tbody").html("");
        // hide tide-results section
        $("#tide-results").hide();
        // show location form
        $("#location-form").show();
        // hide start over btn
        $("#restart-btn").hide();
        // show map
        $("#map").show();
    });
}

function renderTides(data) {
    console.log("Rendering Tides");
        
    // show tide-results section
    $("#tide-results").show();
    
    // render JSON tide data in table format
    $.each(data.predictions, function(index, value){
        if (value.v < 0) {
            $("#results-tbody").append(`<tr><td>${value.t}</td><td>${value.v}</td></tr>`);
        }
    });

    // listen for user clicks on Start Over button
    handleStartOverBtn();
    // show restart-btn
    $("#restart-btn").show();
}

 // submit AJAX request to NOAA
function getTides(stationId, beginDate, endDate) {
    console.log("Fetching tides");

    const data = {
        station: stationId,
        begin_date: beginDate,
        end_date: endDate,
        product: "predictions",
        datum: "MLLW",
        units: "english",
        time_zone: "lst_ldt",
        format: "json",
        interval: "hilo"
    }

    $.getJSON("https://tidesandcurrents.noaa.gov/api/datagetter", data, renderTides);
}

function handleDateSubmit(stationId) {
            
    $("#date-submit").click(function(evt){
        evt.preventDefault();
        // pull date inputs and remove dashes ('-')
        const beginDate = $("#date-start").val().replace(/-/g,'');
        const endDate = $("#date-end").val().replace(/-/g,'');
        console.log(`Begin Date: ${beginDate}  End Date: ${endDate}`);
        // hide date selection screen
        $("#date-container").hide();
        // obtain tide data for specified station and dates
        getTides(stationId, beginDate, endDate);    
    });    

}

function loadDateFilters(stationId, stationName) {
    
    // show date selection screen
    $("#date-container").show();

    // listen for date selection
    console.log("Listening for date selection...");
    
    handleDateSubmit(stationId);
}

function handleTideStationSelection(stationId, stationName) {
   
    console.log(`Selected Station: ${stationName} (${stationId})`);

    // render selected tide station in results section
    $("#results-heading").text(`Tides for ${stationName}`);

    // hide map and location search bar
    $("#map").hide();
    $("#location-form").hide();

    // load date filter selection page
    loadDateFilters(stationId, stationName);
}

function setLocation(lat, long) {
    console.log(`Map repositioning at Lat: ${lat} Lon: ${long}`);
    map.setCenter({lat: lat, lng: long});
    map.setZoom(8);
}

function handleLocationFormSubmit() {
    $("#location-form").submit(function (evt) {
        evt.preventDefault();
        $("#location-input").focus();
        var locationInput = document.getElementById('location-input');
        google.maps.event.trigger(locationInput, 'keydown', { keyCode: 13 });
        
        if (searchBox.getPlaces() != undefined)
        {
            changePlace();
        
            // clear user input
            $("#location-input").val("");
        }
    });
}

function changePlace() {
    console.log("changing place");
    
    places = searchBox.getPlaces();

    if (places.length == 0) {
        console.log("no places");
        return;
    }

    // Change the map bounds to encompass matching returned places
    var bounds = new google.maps.LatLngBounds();
    places.forEach(function(place) {
        if (!place.geometry) {
        console.log("Returned place contains no geometry");
        return;
        }
        if (place.geometry.viewport) {
        // Only geocodes have viewport.
        bounds.union(place.geometry.viewport);
        } else {
        bounds.extend(place.geometry.location);
        }
    });
    map.fitBounds(bounds);
}

function createAutoComplete() {
    console.log("AutoComplete Created");
    
    let input = document.getElementById('location-input');
    searchBox = new google.maps.places.SearchBox(input);
    //***map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

     // Bias the SearchBox results towards current map's viewport.
    map.addListener('bounds_changed', function() {
        searchBox.setBounds(map.getBounds());
      });    

    searchBox.addListener('places_changed', changePlace);
}


function getGeoLoc() {
    navigator.geolocation.getCurrentPosition(function(position){
        let lat = position.coords.latitude;
        let long = position.coords.longitude;
        setLocation(lat, long);
    });
}

function createMap() {
    // create new map centered on USA
    console.log("Creating map");
    
    map = new google.maps.Map(document.getElementById('map'), {
        center: {lat: 39, lng: -98},
        zoom: 4,
        fullscreenControl: false
    });



    // add geolocation button to map
    let controlDiv = document.getElementById('geo-btn');
    map.controls[google.maps.ControlPosition.TOP_RIGHT].push(controlDiv);
    // delay showing geolocation button a second until map loads
    google.maps.event.addListenerOnce(map, 'tilesloaded', function(){
      $("#geo-btn").show();
    });
    
    // add event handler to geolocation button
    $("#geo-btn").click(function(evt) {
        getGeoLoc();
    });



    // load static file with tide station locations and display markers
    map.data.loadGeoJson("tidestations.json");

    // create infoWindow to display info when a marker is clicked
    let infoWindow = new google.maps.InfoWindow();    

    // listen for map clicks and display info window on marker click
    map.data.addListener('click', function(event) {
        let clickID = event.feature.getProperty('Station ID');         
        let clickStation = event.feature.getProperty('Station Name'); 
        let contentString = `
            <p class="info-label">${clickStation}</p>
            <button id="select-station" type="button">Select</button>
            `;

        // add description and select button to infoWindow 
        infoWindow.setContent(contentString);
        // set the position of the infoWindow to the position of the click event
        infoWindow.setPosition(event.feature.getGeometry().get());
        // center on info window
        map.setCenter(event.feature.getGeometry().get());
        // offset the infoWindow from the marker
        infoWindow.setOptions({pixelOffset: new google.maps.Size(-1,-35)});
        // open the info winow on the map
        infoWindow.open(map);

        // handle clicks on the info window select button
        $("#select-station").click(function(evt) {
            handleTideStationSelection(clickID, clickStation);   
        });
    });

    // list for clicks away from info window and close
    map.addListener('click', function(event){
        infoWindow.close(map)
    });

}

// initialize the map, geolocation, autocomplete, and handling of user input
// this function is a callback after load of Google Maps API
function initialize() {
    console.log("Initializing");
    createMap();
    getGeoLoc();
    createAutoComplete();
    handleLocationFormSubmit();
}