
var mapWidth = $("#map").width(),
mapHeight = $("#map").height(),
focused = false,
ortho = true,
speed = -7e-3,
start = Date.now(),
corr = 0;

var projectionGlobe = d3.geoOrthographic()
.scale(mapWidth/4.55)
.translate([mapWidth / 2, mapHeight / 2])
.clipAngle(90);

var projectionMap = d3.geoEquirectangular()
.scale(mapWidth/6.83)
.translate([mapWidth / 2, mapHeight / 2]);

var projection = projectionGlobe;

var path = d3.geoPath()
.projection(projection);

var svgMap = d3.select("div#map").append("svg")
.attr("overflow", "hidden")
.attr("width", mapWidth)
.attr("height", mapHeight);

var zoneTooltip = d3.select("div#map").append("div").attr("class", "zoneTooltip");

var g = svgMap.append("g");

var center = [mapWidth/2, mapHeight/2];

var rotate = true;

// Starter for function AFTER All transitions

function endall(transition, callback) {
	var n = 0;
	transition
	.each(function() { ++n; })
	.on("end", function() { if (!--n) callback.apply(this, arguments); });
}

function sleep(milliseconds) {
	var start = new Date().getTime();
	for (var i = 0; i < 1e7; i++) {
		if ((new Date().getTime() - start) > milliseconds){
			break;
		}
	}
}

let jobsData = {};
let countryToPopulateWithData = ["Germany", "Netherlands", "Sweden", "Denmark", "Japan", "Belgium", "Austria", "Australia", "Canada", "United States", "United Kingdom", "France", "New Zealand", "Switzerland", "China", "Thailand", "Malaysia", "Mexico", "Vietnam", "Ireland", "Spain", "Finland", "Poland", "Estonia", "United Arab Emirates", "Indonesia", "Taiwan", "Italy"];
function prepareJobsData(callback) {


	countryToPopulateWithData.forEach(function(d) {
		let countryName = d.split(' ').join('%2B');
		d3.json("https://api.rss2json.com/v1/api.json?api_key=7ljbnfrdxovotfzlndazd1kxxtlyqizkcy5ot0kt&rss_url=https%3A%2F%2Fstackoverflow.com%2Fjobs%2Ffeed%3Fl%3D"+ countryName +"%26u%3DKm%26d%3D20%26v%3Dtrue", function(error, data) {



			if(data != undefined){
				jobsData[d] = data["items"];

				if(Object.keys(jobsData).length === countryToPopulateWithData.length) {
					display();
					callback(null);
				}
			} else {
				console.log(countryName);
			}


		});

	});

}


// Loading data

queue()
.defer(d3.json, "https://unpkg.com/world-atlas@1/world/110m.json")
.defer(d3.tsv, "https://raw.githubusercontent.com/KoGor/Map-Icons-Generator/master/data/world-110m-country-names.tsv")
.defer(prepareJobsData)
.await(ready);


function ready(error, world, countryData) {



	var countryById = {},
	// jobsData = {},
	countries = topojson.feature(world, world.objects.countries).features;


	countryData.forEach(function(d) {
		let pad = "000";
		let n = d.id;
		let id = (pad+n).slice(-pad.length);
		countryById[id] = d.name;
	});



	// Drawing countries on the globe

	var world = g.selectAll("path").data(countries);

	appendWaterMass();
	world.enter().append("path")
	.attr("class", function(d) {
		let countryName = countryById[d.id];
		let countryNameSelector;
		if(countryName != undefined) {
			countryNameSelector = countryName.split(' ').join('-');
		} else {
			countryName = "";
		}

		return "mapData " + countryNameSelector;
	})
	.attr("d", path)
	.attr("opacity", 1)
	.attr("stroke", "#4717F6")
	.attr("fill", function(d) {
		let countryName = countryById[d.id];
		let jobsByCountry = jobsData[countryName];

		if(jobsByCountry === undefined) {
			return "#000000";
		} else if(jobsByCountry.length < 1) {
			return "#7e5cf8";
		} else if(jobsByCountry.length < 4) {
			return "#592ef6";
		} else if(jobsByCountry.length < 6) {
			return "#4717f6";
		} else if(jobsByCountry.length < 9) {
			return "#3812c4";
		} else if(jobsByCountry.length < 11) {
			return "#2a0d93";
		} else {
			return "#1c0962";
		}
	})
	.classed("ortho", ortho = true)



	// Events processing

	.on("mouseover", function(d) {
		let countryName = countryById[d.id];
		let jobsByCountry = jobsData[countryName];
		let jobCount;

		if(jobsByCountry != undefined) {
			jobCount = ": " + jobsByCountry.length + " jobs";
		} else {
			jobCount = ": No Data";
		}

		if (ortho === true) {
		} else {
			zoneTooltip.text(countryById[d.id] + jobCount)
			.style("left", (d3.event.pageX + 7) + "px")
			.style("top", (d3.event.pageY - 15) + "px")
			.style("display", "block");
		}
	})
	.on("mouseout", function(d) {
		if (ortho === true) {
			// infoLabel.style("display", "none");
		} else {
			zoneTooltip.style("display", "none");
		}
	})
	.on("mousemove", function() {
		if (ortho === false) {
			zoneTooltip.style("left", (d3.event.pageX + 7) + "px")
			.style("top", (d3.event.pageY - 15) + "px");
		}

	})
	.on("click", function(d) {
		let countryName = countryById[d.id];
		let jobsByCountry = jobsData[countryName];

		if(jobsByCountry != undefined) {
			d3.selectAll(".mapData").classed("selected", false);
			d3.select(this).classed("selected", true);
			populateJobsDataDisplay(jobsByCountry, countryName);
		}

	});


	// locations = locationData;
	// drawMarkers();

	svgMap.on("mouseover", function(d) {


		// Transforming Globe to Map
		if (ortho === true) {
			corr = projection.rotate()[0]; // <- save last rotation angle
			g.selectAll(".ortho").classed("ortho", ortho = false);

			projection = projectionMap;
			path.projection(projection);
			g.selectAll("path").transition().duration(500).attr("d", path);


			d3.select(".sphere").attr("opacity", "0");
			d3.select("div#map > svg").style("background", "#0E0B16");
			rotate = false;
		}
	});



	svgMap.on("mouseleave", function(d) {

		reset();
		d3.select(".sphere").attr("opacity", "1");
		d3.select("div#map > svg").style("background", "#07050b");
		rotate = true;


	});



	// Globe rotating via timer

	d3.timer(function() {

		if(rotate) {
			var λ = speed * (Date.now() - start);

			projection.rotate([λ + corr, -5]);
			g.selectAll(".ortho").attr("d", path);
			// g.selectAll(".test").attr("d", path);
			// drawMarkers();
		}


	});

	// Adding extra data when focused

	function focus(d) {
		if (focused === d) return reset();
		g.selectAll(".focused").classed("focused", false);
		d3.select(this).classed("focused", focused = d);
	}

	// Reset projection

	function reset() {
		g.selectAll(".focused").classed("focused", focused = false);
		// infoLabel.style("display", "none");
		zoneTooltip.style("display", "none");

		// Transforming Map to Globe

		projection = projectionGlobe;



		path.projection(projection);
		g.selectAll("path").transition()
		.duration(500).attr("d", path)
		.call(endall, function() {
			g.selectAll("path").classed("ortho", ortho = true);
			start = Date.now(); // <- reset start for rotation
		});

	}

	function appendWaterMass() {
		g.append("path")
		.datum({type: "Sphere"})
		.attr("class", "sphere")
		.attr("d", path)
		.attr("fill", "#0E0B16")
		.attr("stroke", "#A239CA");
	}


	$(".loading-panel").css("display", "none");

};




// Jquery
function populateJobsDataDisplay(jobsData, countryName) {
	$(".jobsData li").remove();
	$(".country").html('<i class="material-icons">place</i>' + countryName);



	$.each(jobsData, function(index, value) {

		$(".jobsData").append(
				"<li>" +
				"<div class='collapsible-header'>" +
				value.title +
				"</div>" +
				"<div class='collapsible-body'>" +
				"Technologies: <br>" +
				"<div class='row'>" +
				"<div class='col s12 technologies-" + index +"'>" +
				"</div>" +
				// value.categories +
				"</div>" +
				"<br> Published Date: <br>" +
				'<span class="badge">' + value.pubDate + '</span>'  + "<br>" +
				// value.pubDate + "<br>" +
				value.content + "<br>" +
				"<a class='waves-effect waves-light btn' target='_blank' " +
				"href='" +
				value.link +
				"'" +
				">Go to Job Site</a>" +

				"</div>" +
				"</li>"
		);

		$.each(value.categories, function(indexCategory, valueCategory) {

			$(".technologies-" + index).append('<span class="badge">' + valueCategory + '</span>');


		});

	});
}

$(document).ready(function(){
	// $('.collapsible').collapsible();
	// $('.modal').modal();
	M.AutoInit();

	d3.select("#map").append("div")
	.classed("show-jobs-button-container", true)
	.append("a").classed("btn pulse modal-trigger show-jobs-button rr-d-flex rr-flex-direction-row-reverse", true)
	.attr("href", "#jobsModal")
	.text("Show Jobs")
	.append("i")
	.classed("material-icons left", true)
	.text("work");


	$.each(countryToPopulateWithData, function(index, value) {
		$("#countryList").append('<li><a href="#!">' + value + '</a></li>');

	});

	$(document).on("click", "#countryList li a", function() {
		let countryName = $(this).html();
		let jobsByCountry = jobsData[countryName];
		let countryNameSelector = countryName.split(' ').join('-');
		if(jobsByCountry != undefined) {
			d3.selectAll(".mapData").classed("selected", false);
			d3.select("." + countryNameSelector).classed("selected", true);
			populateJobsDataDisplay(jobsByCountry, countryName);

		}

	});


});
