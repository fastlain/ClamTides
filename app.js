"use strict";

// create Google Map API global variables
let map, places, searchBox;

function handleStartOverBtn() {
    $("#restart-btn").click(function (evt) {
        $("#tide-results").hide();
        //clear results
        $("#grid-container").html("");
        $("#location-form").show();
        $("#restart-btn").hide();
        $("#map").show();
    });
}

// filter tides when filter form is submitted
function handleFilterSubmit() {
    $("#filter-form").submit(function (evt) {
        evt.preventDefault();
        filterHeight($("#height-input").val());
        countGridChildren();
    })
}

// Hide month containers with no visible tides
function hideEmpty() {
    $(".results-grid").each(function (index, elem) {
        $(this).parent().show();
        if ($(this).find(":visible").length === 0) {
            $(this).parent().hide();
        }
    });
}

// Check number of visible children in each month-grid and assign to 
// data attribute to determine grid layout in CSS
function countGridChildren() {
    $(".month-grid").each(function (index, element) {
        // count number of visible children 
        const visChildren = $(element).children(":visible").length;

        // assign data attribute based on visChildren
        if (visChildren >= 4) {
            $(element).attr("data-visChildren", "4")
        } else if (visChildren === 3) {
            $(element).attr("data-visChildren", "3")
        } else if (visChildren === 2) {
            $(element).attr("data-visChildren", "2")
        } else {
            $(element).attr("data-visChildren", "0")
        }
    });
}

// filter out tides that are greater than filter height
function filterHeight(height) {
    let parsedHeight = parseFloat(height);
    $("#height-input").val(parsedHeight);

    $(".tide-height").each(function (index, elem) {
        if (parseFloat($(this).text()) > parsedHeight) {
            $(this).parent().parent().hide();
        } else {
            $(this).parent().parent().show();
        }
    });
    hideEmpty();
}

function renderTides(data) {
    $("#tide-results").show();

    // get the first and last years of the results
    let dateIndex = moment(data.predictions[0].t);
    const endTideDate = moment(data.predictions[data.predictions.length - 1].t);
    let yearIndex = dateIndex.year();

    // create container for each year and month
    let dateContainer = "";
    while (dateIndex.isBefore(endTideDate)) {

        // create a new year container if it's a new year
        if (dateIndex.year() >= yearIndex) {
            dateContainer += `</div><h3 class="year-heading">${yearIndex}</h3><div id="${yearIndex}-container" class="month-grid">`;
            yearIndex += 1;
        }

        // create a new month container
        dateContainer += `<div class="month-container"><h4 class="month-heading">${dateIndex.format("MMMM")}</h4><div id="${dateIndex.format("YYYYMMM")}" class="results-grid"></div></div>`;

        // increment the month moment
        dateIndex.add(1, "months")

    }

    dateContainer += "</div";

    $("#grid-container").append(dateContainer);

    // render JSON tide data in cards
    $.each(data.predictions, function (index, value) {

        // create a moment for each result
        value.date = moment(value.t);
        // round tide data to two decimal places
        value.v = Number(value.v).toFixed(2);

        // format dates 
        const day = value.date.format("ddd");
        const month = value.date.format("MMM");
        const dateOfMonth = value.date.format("Do");
        const time = value.date.format("h:mm");
        const ampm = value.date.format("a");

        // add dates and tides as content (and classes for potential formatting)
        const cardContent = `
            <div class="result-card">
                <div class="date-container ${day}">               
                    <span>${day}, </span>
                    <span>${month} </span>
                    <span class="${dateOfMonth}">${dateOfMonth}</span>
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

        // add result card to appropriate year results-grid
        const year = value.date.year();

        $(`#${year}${month}`).append(cardContent);

    });

    filterHeight(0);
    countGridChildren();

    // hide ajax loading section
    $("#ajax-status").hide();

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
        datum: "MLLW", //mean lower low water (standard low tide value)
        units: "english",
        time_zone: "lst_ldt",
        format: "json",
        interval: "hilo" // request daily high and low tides
    };

    const settings = {
        url: "https://tidesandcurrents.noaa.gov/api/datagetter",
        data: data,
        dataType: "json",
        beforeSend: function () {
            // show ajax status container and create page loader img
            $("#ajax-status").show().html(`<img src="loader.png" alt="Page Loading">`);
        },
        success: renderTides,
        error: function () {
            // if ajax fails, replace page loader img with error message
            $("#ajax-status").html("<p>Your request was unsuccessful. Please try again.")
            // show restart-btn
            $("#restart-btn").show();
        }
    }

    $.ajax(settings);
}

function handleDateSubmit() {
    $("#date-submit").click(function (evt) {
        evt.preventDefault();

        // hide date selection screen
        $("#date-container").hide();

        // get date range from input field
        const dateRange = $("#date-range").val().split(" - ");

        // convert input dates to moments
        const start = moment(dateRange[0], "MM-DD-YYYY");
        const end = moment(dateRange[1], "MM-DD-YYYY");

        //format dates for AJAX request
        const startDate = start.format("YYYYMMDD");
        const endDate = end.format("YYYYMMDD");

        //format dates for display
        const displayBegin = start.format("MMM Do YYYY");
        const displayEnd = end.format("MMM Do YYYY");

        $("#results-daterange").text(`${displayBegin} - ${displayEnd}`);

        getTides($("#results-heading").data("stationId"), startDate, endDate);
    });
}

function loadDateSelection() {
    // show date selection screen
    $("#date-container").show();

    // if input date picker is blank, create date picker and listen for submit
    if (!$("#date-range").val()) {
        // create date range picker
        $("#date-range").daterangepicker(
            // date range picker options
            {
                opens: "center",
                //default dates: today to today+1month
                startDate: moment().format("MM/DD/YYYY"),
                endDate: moment().add(1, "months").format("MM/DD/YYYY"),
                "alwaysShowCalendars": true,
                ranges: {
                    "1 week": [moment(), moment().add(6, "days")],
                    "1 month": [moment(), moment().add(1, "months")],
                    "3 months": [moment(), moment().add(3, "months")],
                    "6 months": [moment(), moment().add(6, "months")],
                    "1 year": [moment(), moment().add(1, "years")],
                    "Current year": [moment().startOf("year"), moment().endOf("year")]
                }
            }
        );
        handleDateSubmit();
    }
}

function handleTideStationSelection(stationId, stationName) {
    console.log('Click Detected');

    // render selected tide station in results section
    $("#results-heading").text(stationName);
    // store associated stationId as a data attribute
    $("#results-heading").data("stationId", stationId);

    // hide map and location search bar
    $("#map").hide();
    $("#location-form").hide();

    // load date filter selection page
    loadDateSelection();
}

// handle manual entry of location by user (not selection from autocomplete)
function handleLocationFormSubmit() {
    $("#location-form").submit(function (evt) {
        evt.preventDefault();
        // focus on location input and trigger enter keystroke to simulate
        // change in the Places autocomplete box
        $("#location-input").focus();
        const locationInput = document.getElementById("location-input");
        google.maps.event.trigger(locationInput, "keydown", { keyCode: 13 });

        if (searchBox.getPlaces() != undefined) {
            changePlace();
        }
    });
}

// handle user selection of places from autocomplete box
function changePlace() {
    // get selected Places
    places = searchBox.getPlaces();

    // clear user input
    $("#location-input").val("");

    // if no Places found, leave function and wait for new selection
    if (places.length == 0) {
        return;
    }

    // Change the map bounds to encompass matching returned places
    const bounds = new google.maps.LatLngBounds();
    places.forEach(function (place) {
        // if user entry or selection doesn't have latlong coordinates, exit
        if (!place.geometry) {
            return;
        }
        if (place.geometry.viewport) {
            bounds.union(place.geometry.viewport);
        } else {
            bounds.extend(place.geometry.location);
        }
    });
    // reposition map around Places
    map.fitBounds(bounds);
}

// use the Google Maps Places library to generate an autocomplete search box
function createAutoComplete() {
    // associate the search box with #location-input
    const input = document.getElementById("location-input");
    searchBox = new google.maps.places.SearchBox(input);

    // Bias the SearchBox results towards current map's viewport.
    map.addListener("bounds_changed", function () {
        searchBox.setBounds(map.getBounds());
    });

    // when user selects a generated place, reposition the map
    searchBox.addListener("places_changed", changePlace);
}

// get geolocation, if available, and recenter map to that location
function getGeoLoc() {
    navigator.geolocation.getCurrentPosition(function (position) {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        map.setCenter({ lat, lng });
        map.setZoom(8);
    });
}

function createMap() {
    // create new map centered on USA  
    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: 39, lng: -98 },
        zoom: 4,
        fullscreenControl: false,
        mapTypeControl: false,
        streetViewControl: false
    });

    // add geolocation button to map
    const controlDiv = document.getElementById("geo-btn");
    map.controls[google.maps.ControlPosition.TOP_RIGHT].push(controlDiv);

    // delay showing geolocation button until map loads
    google.maps.event.addListenerOnce(map, "tilesloaded", function () {
        $("#geo-btn").show();
    });

    // add event handler to geolocation button
    $("#geo-btn").click(function (evt) {
        getGeoLoc();
    });

    // load static file with tide station locations and display markers
    map.data.loadGeoJson("tidestations.json");
    // create pop-up to display info when a marker is clicked
    const infoWindow = new google.maps.InfoWindow();

    // listen for map clicks and get information marker click
    map.data.addListener("click", function (event) {
        const clickID = event.feature.getProperty("Station ID");
        const clickStation = event.feature.getProperty("Station Name");
        const contentString = `
            <p class="info-label">${clickStation}</p>
            <button id="select-station" class="btn" type="button">Select</button>
            `;

        // add marker description and a selection button to infoWindow 
        infoWindow.setContent(contentString);
        // set the position of the infoWindow to the position of the click event
        infoWindow.setPosition(event.feature.getGeometry().get());
        // center on info window
        map.setCenter(event.feature.getGeometry().get());
        // offset the infoWindow from the marker
        infoWindow.setOptions({ pixelOffset: new google.maps.Size(-1, -35) });
        // open the info window on the map
        infoWindow.open(map);
        // when DOM is ready, add click listener to select-station button
        google.maps.event.addDomListener(infoWindow, 'domready', () => {
            $("#select-station").click(function (evt) {
                handleTideStationSelection(clickID, clickStation);
            });
        })
    });

    // list for clicks away from info window and close
    map.addListener("click", function (event) {
        infoWindow.close(map)
    });

}

// initialize the map, geolocation, autocomplete, and handling of user input
function initialize() {
    createMap();
    getGeoLoc();
    createAutoComplete();
    handleLocationFormSubmit();
    handleStartOverBtn();
    handleFilterSubmit();
}

// on document ready, run initialize function
$(initialize);