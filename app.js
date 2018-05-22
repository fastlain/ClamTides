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
    // show tide-results section
    $("#tide-results").show();
    
    // render JSON tide data in cards
    $.each(data.predictions, function(index, value){
        value.date = moment(value.t);
        value.v = Number(value.v).toFixed(2);

        let day = value.date.format("ddd");
        let month = value.date.format("MMM");
        let date = value.date.format("Do");
        let time = value.date.format("h:mm");
        let ampm = value.date.format("a");
        
        let cardContent = `
            <div class="result-card">
                <div class="date-container">               
                    <span class="${day}">${day}, </span>
                    <span class="${month}">${month} </span>
                    <span class="${date}">${date}</span>
                </div>
                <div class="time-container">
                        <span>${time}</span>
                        <span class="${ampm}">${ampm}</span>
                </div>
                <div class="tide-container">
                    <span class="tide-height">${value.v}</span>
                    <span> ft</span>
                </div>
            </div>
        `;
        $("#results-grid").append(cardContent);
        console.log("appending");
        
    });

    $(".tide-height").each(function(index, elem){              
        if (Number($(this).text()) > 0) {
            $(this).parent().parent().hide();
        }
    });

    // listen for user clicks on Start Over button
    handleStartOverBtn();
    // show restart-btn
    $("#restart-btn").show();
}

 // submit AJAX request to NOAA
function getTides(stationId, beginDate, endDate) {
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
        // pull date inputs and 
        const beginDateRaw = $("#date-start").val();
        const endDateRaw = $("#date-end").val();
        const momentBegin = moment(beginDateRaw);
        const momentEnd = moment(endDateRaw);
        const displayBegin = momentBegin.format("MMM Do YYYY");
        const displayEnd = momentEnd.format("MMM Do YYYY");
        
        // remove dashes ('-')
        const beginDate = beginDateRaw.replace(/-/g,'');
        const endDate = endDateRaw.replace(/-/g,'');

        $("#results-daterange").text(`${displayBegin} - ${displayEnd}`);
        $("#results-subheading").text(`Showing tides less than 0 ft`);
        
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
    handleDateSubmit(stationId);
}

function handleTideStationSelection(stationId, stationName) {
   //console.log(`Selected Station: ${stationName} (${stationId})`);

    // render selected tide station in results section
    $("#results-heading").text(`${stationName}`);

    // hide map and location search bar
    $("#map").hide();
    $("#location-form").hide();

    // load date filter selection page
    loadDateFilters(stationId, stationName);
}

function setLocation(lat, long) {
    //console.log(`Map repositioning at Lat: ${lat} Lon: ${long}`);
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
    map = new google.maps.Map(document.getElementById('map'), {
        center: {lat: 39, lng: -98},
        zoom: 4,
        fullscreenControl: false,
        mapTypeControl: false,
        streetViewControl: false
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
        // open the info window on the map
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
    createMap();
    getGeoLoc();
    createAutoComplete();
    handleLocationFormSubmit();
}