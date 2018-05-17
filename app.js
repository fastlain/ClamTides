"use strict";

// create map as a global variable 
let map;

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
    $("#results-heading").text(`Tides for ${stationName} (Station ID:${stationId})`);

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
        let location = $("#location-input").val();
        console.log(`User location input: ${location}`);
        // clear user input
        $("#location-input").val("");
    });
}

function createMap() {
    // create new map centered on USA
    console.log("Creating map");
    
    map = new google.maps.Map(document.getElementById('map'), {
        center: {lat: 39, lng: -98},
        zoom: 5,
        fullscreenControl: false
    });

    map.data.loadGeoJson("http://localhost:8080/tidestations.json");

    // create infoWindow to display info when a marker is clicked
    let infoWindow = new google.maps.InfoWindow();    

    // listen for map clicks and display info window on marker click
    map.data.addListener('click', function(event) {
        let clickID = event.feature.getProperty('Station ID');         
        let clickStation = event.feature.getProperty('Station Name'); 
        let contentString = `
            <p>${clickStation}</p>
            <button id="select-station" type="button">Select</button>
            `;

        // add description and select button to infoWindow 
        infoWindow.setContent(contentString);
        // set the position of the infoWindow to the position of the click event
        infoWindow.setPosition(event.feature.getGeometry().get());
        // offset the infoWindow from the marker
        infoWindow.setOptions({pixelOffset: new google.maps.Size(-1,-35)});
        // open the info winow on the map
        infoWindow.open(map);

        // handle clicks on the info window select button
        $("#select-station").click(function(evt) {
            handleTideStationSelection(clickID, clickStation);   
        });
    });

    // ask for geolocation
    navigator.geolocation.getCurrentPosition(function(position){
        let lat = position.coords.latitude;
        let long = position.coords.longitude;
        setLocation(lat, long);
    });

}

function initialize() {
    console.log("Initializing");
    createMap();
}

// on document ready, handle location form submission
$(initialize);