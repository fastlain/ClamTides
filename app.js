"use strict";

function handleStartOverBtn(){
    $("#restart-btn").click(function(evt){
        // clear results-tbody
        $("#results-tbody").html("");
        // hide tide-results section
        $("#tide-results").hide();
        //show location form
        $("#location-form").show();
    });
}

function renderTides(data) {
    // show tide-results section
    $("#tide-results").show();

    $.each(data.predictions, function(index, value){
        if (value.v < 0) {
            $("#results-tbody").append(`<tr><td>${value.t}</td><td>${value.v}</td></tr>`);
        }
    });
    handleStartOverBtn();
    
}

 // submit AJAX request to NOAA
function getTides(stationId, beginDate, endDate) {
    console.log("Getting tides...");

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


function loadDateFilters(stationId, stationName) {
    
    // render date selection screen
    console.log(`Rendering date filter screen for ${stationName}`);
    
    // listen for date selection
    console.log("Listening for date selection...");
    
        // temporary static dates for testing
        const beginDate = 20180601;
        const endDate = 20180901;
        console.log(`Begin Date: ${beginDate}  End Date: ${endDate}`);
        
        // hide date selection screen
        getTides(stationId, beginDate, endDate);

}

function handleTideStationSelection() {
    // listen for tide station selection
    console.log("Listening for station selection...");
    
        // Temporary static id and name for testing
        const stationId = 9439026;    
        const stationName = "Astoria (Youngs Bay), Oreg."
        console.log(`Selected Station: ${stationName} (${stationId})`);

        // render selected tide station in results section
        $("#results-heading").text(`Tides for ${stationName} (Station ID:${stationId})`);

        // hide map
        console.log("Hiding Map..."); // $(#map).hide();

        // load date filter selection page
        loadDateFilters(stationId, stationName);
}

function loadMap(location) {
    // load map
    console.log("Map loading...");

    // listen for user selection of tide station
    handleTideStationSelection();
}

function handleLocationFormSubmit() {
    $("#location-form").submit(function (evt) {
        evt.preventDefault();
        let location = $("#location-input").val();
        console.log(`User location input: ${location}`);
        // clear user input
        $("#location-input").val("");
        // hide location form
        $("#location-form").hide();
        //load map
        loadMap(location);
    });
}

// on document ready, handle location form submission
$(handleLocationFormSubmit);
