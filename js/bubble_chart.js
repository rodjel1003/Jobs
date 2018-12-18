/* bubbleChart creation function. Returns a function that will
 * instantiate a new bubble chart given a DOM element to display
 * it in and a dataset to visualize.
 *
 * Organization and style inspired by:
 * https://bost.ocks.org/mike/chart/
 *
 */
function bubbleChart() {
  // Constants for sizing
  var width = $("#vis").width();
  var height = $("#vis").height();

  // tooltip for mouseover functionality
  var tooltip = floatingTooltip('gates_tooltip', 240);

  // Locations to move bubbles towards, depending
  // on which view mode is selected.
  var center = { x: width / 2, y: height / 15 };


  // @v4 strength to apply to the position forces
  var forceStrength = 0.03;

  // These will be set in create_nodes and create_vis
  var svg = null;
  var bubbles = null;
  var nodes = [];

  // Charge function that is called for each node.
  // As part of the ManyBody force.
  // This is what creates the repulsion between nodes.
  //
  // Charge is proportional to the diameter of the
  // circle (which is stored in the radius attribute
  // of the circle's associated data.
  //
  // This is done to allow for accurate collision
  // detection with nodes of different sizes.
  //
  // Charge is negative because we want nodes to repel.
  // @v4 Before the charge was a stand-alone attribute
  // of the force layout. Now we can use it as a separate force!
  function charge(d) {
    return -Math.pow(d.radius, 2.0) * forceStrength;
  }

  // Here we create a force layout and
  // @v4 We create a force simulation now and
  // add forces to it.
  var simulation = d3.forceSimulation()
    .velocityDecay(0.2)
    .force('x', d3.forceX().strength(forceStrength).x(center.x))
    .force('y', d3.forceY().strength(forceStrength).y(center.y))
    .force('charge', d3.forceManyBody().strength(charge))
    .on('tick', ticked);

  // @v4 Force starts up automatically,
  // which we don't want as there aren't any nodes yet.
  simulation.stop();

  // Nice looking colors - no reason to buck the trend
  // @v4 scales now have a flattened naming scheme
  var fillColor = d3.scaleOrdinal()
    .domain(["Germany", "Netherlands", "Sweden", "Denmark", "Japan", "Belgium", "Austria", "Australia", "Canada", "United States", "United Kingdom", "France", "New Zealand", "Switzerland", "China", "Thailand", "Malaysia", "Mexico", "Vietnam", "Ireland", "Spain", "Finland", "Poland", "Estonia", "United Arab Emirates", "Indonesia", "Taiwan", "Italy"])
    .range(['#a239ca', '#9133b5', '#812da1', '#71278d', '#612279', '#511c65', '#ab4ccf', '#b460d4', '#bd74d9', '#c788df', '#4717f6', '#3f14dd', '#3812c4', '#3110ac', '#2a0d93', '#230b7b', '#592ef6', '#6b45f7', '#7e5cf8', '#9073f9', '#e7dfdd', '#cfc8c6', '#b8b2b0', '#a19c9a', '#8a8584', '#736f6e', '#5c5958', '#454242']);


  /*
	 * This data manipulation function takes the raw data from the CSV file and
	 * converts it into an array of node objects. Each node will store data and
	 * visualization values to visualize a bubble.
	 * 
	 * rawData is expected to be an array of data objects, read in from one of
	 * d3's loading functions like d3.csv.
	 * 
	 * This function returns the new node array, with a node in that array for
	 * each element in the rawData input.
	 */
  function createNodes(rawData) {
    // Use the max total_amount in the data as the max in the scale's domain
    // note we have to ensure the total_amount is a number.
    var maxAmount = d3.max(rawData, function (d) { return +d.value; });

    // Sizes bubbles based on area.
    // @v4: new flattened scale names.
    var radiusScale = d3.scalePow()
      .exponent(0.5)
      .range([2, 20])
      .domain([0, maxAmount]);

    // Use map() to convert raw data into node data.
    // Checkout http://learnjsdata.com/ for more on
    // working with data.
    var myNodes = rawData.map(function (d) {
      console.log("+d.value", +d.value);
      return {
        radius: radiusScale(+d.value) * (width/1366),
        value: +d.value,
        name: d.tech,
        country: d.country,
        x: Math.random() * 900,
        y: Math.random() * 800
      };
    });

    // sort them to prevent occlusion of smaller nodes.
    myNodes.sort(function (a, b) { return b.value - a.value; });

    return myNodes;
  }

  /*
	 * Main entry point to the bubble chart. This function is returned by the
	 * parent closure. It prepares the rawData for visualization and adds an svg
	 * element to the provided selector and starts the visualization creation
	 * process.
	 * 
	 * selector is expected to be a DOM element or CSS selector that points to
	 * the parent element of the bubble chart. Inside this element, the code
	 * will add the SVG continer for the visualization.
	 * 
	 * rawData is expected to be an array of data objects as provided by a d3
	 * loading function like d3.csv.
	 */
  var chart = function chart(selector, rawData) {
    // convert raw data into nodes data
    nodes = createNodes(rawData);

    // Create a SVG element inside the provided selector
    // with desired size.
    svg = d3.select(selector)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    // Bind nodes data to what will become DOM elements to represent them.
    bubbles = svg.selectAll('.bubble')
      .data(nodes, function (d) { return d.id; });

    // Create new circle elements each with class `bubble`.
    // There will be one circle.bubble for each object in the nodes array.
    // Initially, their radius (r attribute) will be 0.
    // @v4 Selections are immutable, so lets capture the
    // enter selection to apply our transtition to below.
    var bubblesE = bubbles.enter().append('circle')
      .classed('bubble', true)
      .attr('r', 0)
      .attr('fill', function (d) { return fillColor(d.country); })
      .attr('stroke', function (d) { return d3.rgb(fillColor(d.country)).darker(); })
      // .attr('fill', 'green')
      // .attr('stroke', 'black')
      .attr('stroke-width', 2)
      .on('mouseover', showDetail)
      .on('mouseout', hideDetail);

    // @v4 Merge the original empty selection and the enter selection
    bubbles = bubbles.merge(bubblesE);

    // Fancy transition to make bubbles appear, ending with the
    // correct radius
    bubbles.transition()
      .duration(2000)
      .attr('r', function (d) { return d.radius; });

    // Set the simulation's nodes to our newly created nodes array.
    // @v4 Once we set the nodes, the simulation will start running
	// automatically!
    simulation.nodes(nodes);

    // Set initial layout to single group.
    groupBubbles();
  };

  /*
	 * Callback function that is called after every tick of the force
	 * simulation. Here we do the acutal repositioning of the SVG circles based
	 * on the current x and y values of their bound node data. These x and y
	 * values are modified by the force simulation.
	 */
  function ticked() {
    bubbles
      .attr('cx', function (d) { return d.x; })
      .attr('cy', function (d) { return d.y; });
  }

  /*
	 * Provides a x value for each node to be used with the split by year x
	 * force.
	 */
  function nodeCountryPosX(d) {
    // return yearCenters[d.country].x;
    let remainder = countryToPopulateWithData.indexOf(d.country) % 3;
    if(remainder === 0) {
      return width / 3;
    } else if (remainder === 1) {
      return width / 2;
    } else {
      return 2 * width / 3;
    }
  }

  function nodeTechPosX(d) {
    let remainder = techListForBubble.indexOf(d.name) % 3;
    if(remainder === 0) {
      return width / 3;
    } else if (remainder === 1) {
      return width / 2;
    } else {
      return 2 * width / 3;
    }
  }

  function nodePosX(name, list) {
    let remainder = list.indexOf(name) % 3;
    if(remainder === 0) {
      return width / 3;
    } else if (remainder === 1) {
      return width / 2;
    } else {
      return 2 * width / 3;
    }
  }

  function nodeCountryPosY(d) {
    // return yearCenters[d.country].y - 450;
    console.log(d.name, countryToPopulateWithData, countryToPopulateWithData.indexOf(d.name));
    if(countryToPopulateWithData.indexOf(d.country) != -1) {
      let result = Math.floor((countryToPopulateWithData.indexOf(d.country)) / 3);
      let forComputation = result + 0.5;
      return height * forComputation / 10;
    } else {
      return 9999;
    }
  }

  function nodeTechPosY(d) {
    if(techListForBubble.indexOf(d.name) != -1) {
      let result = Math.floor((techListForBubble.indexOf(d.name)) / 3);
      let forComputation = result + 0.5;
      return height * forComputation / 10;
    } else {
      return 9999;
    }

  }

  function nodePosY(name, list) {

    if(list.indexOf(name) != -1) {
      let result = Math.floor(list.indexOf(name) / 3);
      let forComputation = result + 0.5;
      return ((height * forComputation / 10) - (100 - (result * 10)));
    } else {
      return 9999;
    }

  }


  /*
	 * Sets visualization in "single group mode". The year labels are hidden and
	 * the force layout tick function is set to move all nodes to the center of
	 * the visualization.
	 */
  function groupBubbles() {
    height = 500;
    $("#vis").css("height", height);
    hideCountryTitles();
    hideTechTitles();

    // @v4 Reset the 'x' force to draw the bubbles to the center.
    simulation.force('x', d3.forceX().strength(forceStrength).x(center.x));
    simulation.force('y', d3.forceY().strength(forceStrength).y(center.y));

    // @v4 We can reset the alpha value and restart the simulation
    simulation.alpha(1).restart();
  }


  /*
	 * Sets visualization in "split by year mode". The year labels are shown and
	 * the force layout tick function is set to move nodes to the yearCenter of
	 * their data's year.
	 */
  function splitBubblesByCountry() {
    height = 2500;
    $("#vis").css("height", height);
    hideTechTitles();
    showCountryTitles();

    // @v4 Reset the 'x' force to draw the bubbles to their year centers
    simulation.force('x', d3.forceX().strength(forceStrength).x(nodeCountryPosX));

    simulation.force('y', d3.forceY().strength(forceStrength).y(nodeCountryPosY));

    // @v4 We can reset the alpha value and restart the simulation
    simulation.alpha(1).restart();
  }

  function splitBubblesByTech() {
    height = 2500;
    $("#vis").css("height", height);
    hideCountryTitles();
    showTechTitles();

    // @v4 Reset the 'x' force to draw the bubbles to their year centers
    simulation.force('x', d3.forceX().strength(forceStrength).x(nodeTechPosX));

    simulation.force('y', d3.forceY().strength(forceStrength).y(nodeTechPosY));

    // @v4 We can reset the alpha value and restart the simulation
    simulation.alpha(1).restart();
  }

  function hideCountryTitles() {
    svg.selectAll('.country').remove();
  }

  function hideTechTitles() {
    svg.selectAll('.tech').remove();
  }

  /*
	 * Shows Year title displays.
	 */
  function showCountryTitles() {
    // Another way to do this would be to create
    // the year texts once and then just hide them.
    var country = svg.selectAll('.country')
      .data(countryToPopulateWithData);

    country.enter().append('text')
      .attr('class', 'country')
      .attr('x', function (d) { return nodePosX(d, countryToPopulateWithData); })
      .attr('y', function (d) { return nodePosY(d, countryToPopulateWithData); })
      .attr('text-anchor', 'middle')
      .text(function (d) { return d; });
  }

  function showTechTitles() {

    var tech = svg.selectAll('.tech')
      .data(techListForBubble);

    tech.enter().append('text')
      .attr('class', 'tech')
      .attr('x', function (d) { return nodePosX(d, techListForBubble); })
      .attr('y', function (d) { return nodePosY(d, techListForBubble); })
      .attr('text-anchor', 'middle')
      .text(function (d) { return d.toUpperCase() + " (" + techCountListForBubble[techListForBubble.indexOf(d)] + ")"; });
  }




  /*
	 * Function called on mouseover to display the details of a bubble in the
	 * tooltip.
	 */
  function showDetail(d) {
    // change outline to indicate hover state.
    d3.select(this).attr('stroke', 'black');

    var content = '<span class="name">Country: </span><span class="value">' +
                  d.country +
                  '</span><br/>' +
                  '<span class="name">Technology: </span><span class="value">' +
                  addCommas(d.name) +
                  '</span><br/>' +
                  '<span class="name">Count: </span><span class="value">' +
                  d.value +
                  '</span>';

    tooltip.showTooltip(content, d3.event);
  }

  /*
	 * Hides tooltip
	 */
  function hideDetail(d) {
    // reset outline
    d3.select(this)
      .attr('stroke', d3.rgb(fillColor(d.country)).darker());

    tooltip.hideTooltip();
  }

  /*
	 * Externally accessible function (this is attached to the returned chart
	 * function). Allows the visualization to toggle between "single group" and
	 * "split by year" modes.
	 * 
	 * displayName is expected to be a string and either 'year' or 'all'.
	 */
  chart.toggleDisplay = function (displayName) {
    if (displayName === 'country') {
      splitBubblesByCountry();
    } else if(displayName === 'tech') {
      splitBubblesByTech();
    } else {
      groupBubbles();
    }
  };


  // return the chart function from closure.
  return chart;
}

/*
 * Below is the initialization code as well as some helper functions to create a
 * new bubble chart instance, load the data, and display it.
 */

var myBubbleChart = bubbleChart();

/*
 * Function called once data is loaded from CSV. Calls bubble chart function to
 * display inside #vis div.
 */
function display() {
  // if (error) {
  // console.log(error);
  // }

  let preparedTechData = prepareTechData();

  // console.log("data", data);

  myBubbleChart('#vis', preparedTechData);
}

/*
 * Sets up the layout buttons to allow for toggling between view modes.
 */
function setupButtons() {
  d3.select('#toolbar')
    .selectAll('.btn')
    .on('click', function () {
      // Remove active class from all buttons
      d3.selectAll('.btn').classed('active', false);
      // Find the button just clicked
      var button = d3.select(this);

      // Set it as the active button
      button.classed('active', true);

      // Get the id of the button
      var buttonId = button.attr('id');

      // Toggle the bubble chart based on
      // the currently clicked button.
      myBubbleChart.toggleDisplay(buttonId);
    });
}

/*
 * Helper function to convert a number into a string and add commas to it to
 * improve presentation.
 */
function addCommas(nStr) {
  nStr += '';
  var x = nStr.split('.');
  var x1 = x[0];
  var x2 = x.length > 1 ? '.' + x[1] : '';
  var rgx = /(\d+)(\d{3})/;
  while (rgx.test(x1)) {
    x1 = x1.replace(rgx, '$1' + ',' + '$2');
  }

  return x1 + x2;
}

// Load the data.
// d3.csv('gates_money.csv', display);


// setup the buttons.
setupButtons();

let techList = {};
let preparedTechList = [];
let techListForBubble = [];
let techCountListForBubble = [];

function prepareTechData() {
  let techData = {};
  $.each(jobsData, function(country, jobsArray) {
    techData[country] = {}
    $.each(jobsArray, function(index, job) {

      $.each(job.categories, function(index, category) {

        if(techData[country][category] === undefined) {
          techData[country][category] = 1;
        } else {
          techData[country][category] = techData[country][category] + 1;
        }

        if(techList[category] === undefined) {
          techList[category] = 1;
        } else {
          techList[category] = techList[category] + 1;
        }


      });

    });


  });


  $.each(techList, function(key, value) {
      preparedTechList.push({
          tech: key,
          count: value
      });

  });

  preparedTechList.sort(function (a, b) {
    return b.count - a.count;
  });


  for(let i = 0; i < 30; i++) {
    techListForBubble[i] = preparedTechList[i].tech;
    techCountListForBubble[i] = preparedTechList[i].count;
  }

  let preparedTechData = [];
  $.each(techData, function(country, techArray) {
    $.each(techArray, function(tech, value) {
      preparedTechData.push(
        {
          country: country,
          tech: tech,
          value: value
        }
      );
    });
  });


  return preparedTechData;
}

display();
