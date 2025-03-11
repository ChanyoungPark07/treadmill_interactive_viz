import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

/**
 * RER Histogram Visualization
 *
 * This visualization displays a histogram of Respiratory Exchange Ratio (RER) values
 * with a density curve overlay. It allows filtering by demographics and includes
 * a reference line at RER = 1.0 to indicate metabolic transition.
 */

// =========== TOOLTIP CONFIGURATIONS ===========

// Info tooltip for help icons
const infoTooltip = d3
  .select("body")
  .append("div")
  .attr("class", "info-tooltip")
  .style("position", "absolute")
  .style("visibility", "hidden")
  .style("background", "white")
  .style("padding", "8px")
  .style("border", "1px solid #ddd")
  .style("border-radius", "4px")
  .style("box-shadow", "0 2px 4px rgba(0,0,0,0.1)")
  .style("max-width", "250px")
  .style("font-size", "12px");

// Data tooltip for histogram bars
const tooltip = d3
  .select("body")
  .append("div")
  .attr("class", "tooltip")
  .style("position", "absolute")
  .style("visibility", "hidden")
  .style("background", "white")
  .style("padding", "10px")
  .style("border", "1px solid #ddd")
  .style("border-radius", "4px")
  .style("box-shadow", "0 2px 4px rgba(0,0,0,0.1)")
  .style("font-size", "12px")
  .style("pointer-events", "none")
  .style("z-index", "1000");

// =========== HELP ICONS SETUP ===========

/**
 * Adds an info icon with tooltip to a label
 * @param {d3.Selection} labelElement - The D3 selection of the label element
 * @param {string} tooltipText - The text to display in the tooltip
 */
function addInfoIcon(labelElement, tooltipText) {
  if (!labelElement.empty()) {
    labelElement
      .style("display", "inline-flex")
      .style("align-items", "center")
      .append("span")
      .attr("class", "info-icon")
      .style("margin-left", "5px")
      .style("cursor", "help")
      .style("color", "#666")
      .html(" ⓘ")
      .on("mouseover", (event) => {
        infoTooltip
          .style("visibility", "visible")
          .html(tooltipText)
          .style("top", event.pageY - 10 + "px")
          .style("left", event.pageX + 10 + "px");
      })
      .on("mouseout", () => {
        infoTooltip.style("visibility", "hidden");
      });
  }
}

// Add info icons to labels
addInfoIcon(
  d3.select("label[for='resting']"),
  "Cooldown refers to the final phase of the run, during which they ran at 5 km/h after reaching max speed."
);

addInfoIcon(
  d3.select("label[for='speed']"),
  "The running speed was strictly increasing throughout the experiment, so higher speeds are related to longer running times."
);

// =========== SVG SETUP ===========

// Define margins with more space for bottom
const margin = { top: 50, right: 30, bottom: 70, left: 80 };

// Calculate dimensions based on viewBox
const width = 800 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

// Create responsive SVG with adjusted viewBox
const svg = d3
  .select("#hist1_chart")
  .attr("preserveAspectRatio", "xMinYMin meet")
  .attr("viewBox", `0 0 800 500`) // Increased height to accommodate labels
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

// Create layered groups for proper rendering order
const gridGroup = svg.append("g").attr("class", "grid-layer");
const barsGroup = svg.append("g").attr("class", "bars-layer");
const axesGroup = svg.append("g").attr("class", "axes-layer");
const lineGroup = svg.append("g").attr("class", "line-layer");
const referenceGroup = svg.append("g").attr("class", "reference-layer");

// Variable to store global RER extent
let globalRERExtent;

// =========== DATA LOADING ===========

// Load CSV data and initialize visualization
d3.csv("./data/merged.csv").then((data) => {
  // Parse numeric values
  data.forEach((d) => {
    d.RER = +d.RER;
    d.Age = +d.Age;
    d.Sex = +d.Sex;
    d.Weight = +d.Weight;
    d.Height = +d.Height;
  });

  // Calculate and store the global RER extent from the entire dataset
  globalRERExtent = d3.extent(data, (d) => d.RER);

  // Draw initial visualization with all data
  drawHistogram(data, data.length);

  // Setup the demographic filters
  setupFilters(data);
});

// =========== FILTER FUNCTIONS ===========

/**
 * Sets up the demographic filters and their change events
 * @param {Array} data - The complete dataset
 */
function setupFilters(data) {
  // Get filter elements
  const ageSelect = d3.select("#age-filter");
  const sexSelect = d3.select("#sex");
  const weightSelect = d3.select("#weight-filter");
  const heightSelect = d3.select("#height-filter");

  // Filter update function
  function updateFilters() {
    const ageVal = ageSelect.node().value;
    const sexVal = sexSelect.node().value;
    const weightVal = weightSelect.node().value;
    const heightVal = heightSelect.node().value;

    // Apply all filters
    const filtered = data.filter((d) => {
      const ageFilter = getAgeFilter(ageVal, d.Age);
      const sexFilter = getSexFilter(sexVal, d.Sex);
      const weightFilter = getWeightFilter(weightVal, d.Weight);
      const heightFilter = getHeightFilter(heightVal, d.Height);
      return ageFilter && sexFilter && weightFilter && heightFilter;
    });

    // Update the visualization with filtered data
    drawHistogram(filtered, filtered.length);
  }

  // Attach event listeners
  ageSelect.on("change", updateFilters);
  sexSelect.on("change", updateFilters);
  weightSelect.on("change", updateFilters);
  heightSelect.on("change", updateFilters);
}

/**
 * Age filter function
 * @param {string} ageVal - The selected age range value
 * @param {number} age - The data point's age
 * @returns {boolean} Whether the data point passes the filter
 */
function getAgeFilter(ageVal, age) {
  switch (ageVal) {
    case "all":
      return true;
    case "10s":
      return age >= 10 && age < 20;
    case "20s":
      return age >= 20 && age < 30;
    case "30s":
      return age >= 30 && age < 40;
    case "40s":
      return age >= 40 && age < 50;
    default:
      return age >= 50;
  }
}

/**
 * Sex filter function
 * @param {string} sexVal - The selected sex value
 * @param {number} sex - The data point's sex (0=male, 1=female)
 * @returns {boolean} Whether the data point passes the filter
 */
function getSexFilter(sexVal, sex) {
  switch (sexVal) {
    case "all":
      return true;
    case "Male":
      return sex === 0;
    default:
      return sex === 1;
  }
}

/**
 * Weight filter function
 * @param {string} weightVal - The selected weight range value
 * @param {number} weight - The data point's weight
 * @returns {boolean} Whether the data point passes the filter
 */
function getWeightFilter(weightVal, weight) {
  switch (weightVal) {
    case "all":
      return true;
    case "Under 60":
      return weight < 60;
    case "60-70":
      return weight >= 60 && weight < 70;
    case "70-80":
      return weight >= 70 && weight < 80;
    case "80-90":
      return weight >= 80 && weight < 90;
    default:
      return weight >= 90;
  }
}

/**
 * Height filter function
 * @param {string} heightVal - The selected height range value
 * @param {number} height - The data point's height
 * @returns {boolean} Whether the data point passes the filter
 */
function getHeightFilter(heightVal, height) {
  switch (heightVal) {
    case "all":
      return true;
    case "Under 165":
      return height < 165;
    case "165-175":
      return height >= 165 && height < 175;
    case "175-185":
      return height >= 175 && height < 185;
    default:
      return height >= 185;
  }
}

// =========== VISUALIZATION FUNCTIONS ===========

/**
 * Draws the histogram visualization
 * @param {Array} data - The dataset to visualize
 * @param {number} dlength - The length of the dataset
 */
function drawHistogram(data, dlength) {
  // Initialize previous bins storage if not exists
  if (!window.previousBins) {
    window.previousBins = [];
  }

  // Get current sex filter value
  const currentSex = d3.select("#sex").node().value;

  // Define color based on sex selection
  const getBarColor = () => {
    switch (currentSex) {
      case "Male":
        return "#5D8AA8"; // Air Force blue
      case "Female":
        return "#DB7093"; // Pale violet red
      default:
        return "#69b3a2"; // Default teal
    }
  };

  // Update chart labels
  updateChartLabels(dlength);

  // Check if we have enough data (minimum 100 samples)
  if (dlength < 100) {
    showNotEnoughDataMessage(dlength);
    return;
  }

  // Remove "not enough data" message if it exists
  removeNotEnoughDataMessage();

  // Create scales and calculate histogram
  const { x, y, bins } = createScalesAndHistogram(data);

  // Update grid lines
  updateGridLines(y);

  // Update axes
  updateAxes(x, y);

  // Update histogram bars
  updateHistogramBars(bins, x, y, getBarColor(), dlength);

  // Add density curve
  addDensityCurve(data, x, y);

  // Add reference line at RER = 1.0
  addReferenceLine(x);

  // Store current bins for next comparison
  window.previousBins = bins;
}

/**
 * Updates the chart labels
 * @param {number} dlength - The length of the dataset
 */
function updateChartLabels(dlength) {
  const labels = {
    "chart-title": {
      text: "Density Distribution of Respiratory Exchange Ratio (RER)",
      x: width / 2,
      y: -20,
      size: "18px",
      weight: "bold",
    },
    "x-label": {
      text: "RER (VCO₂/VO₂)",
      x: width / 2,
      y: height + 40,
      size: "14px",
    },
    "y-label": {
      text: "Density %",
      x: -height / 2,
      y: -60,
      size: "14px",
      transform: "rotate(-90)",
    },
    "count-label": {
      text: `Sample Size: ${dlength}`,
      x: width,
      y: 30,
      size: "14px",
      anchor: "end",
    },
  };

  // Update each label
  Object.entries(labels).forEach(([className, config]) => {
    const label = svg.selectAll(`.${className}`).data([1]);

    // Enter new labels
    label
      .enter()
      .append("text")
      .attr("class", className)
      .attr("text-anchor", config.anchor || "middle")
      .attr("x", config.x)
      .attr("y", config.y)
      .attr("font-size", config.size)
      .attr("font-weight", config.weight || "normal")
      .attr("transform", config.transform || null)
      .style("opacity", 0)
      .text(config.text)
      .transition()
      .duration(750)
      .style("opacity", 1);

    // Update existing labels
    label.transition().duration(750).text(config.text).style("opacity", 1);
  });
}

/**
 * Shows a message when there is not enough data
 * @param {number} dlength - The length of the dataset
 */
function showNotEnoughDataMessage(dlength) {
  // Remove existing visual elements
  barsGroup
    .selectAll("rect")
    .transition()
    .duration(750)
    .attr("y", height)
    .attr("height", 0)
    .remove();

  axesGroup
    .selectAll(".x-axis, .y-axis")
    .transition()
    .duration(750)
    .style("opacity", 0)
    .remove();

  lineGroup
    .selectAll(".density-line")
    .transition()
    .duration(750)
    .style("opacity", 0)
    .remove();

  gridGroup.selectAll(".y-grid-line").remove();
  referenceGroup.selectAll(".reference-line, .reference-annotation").remove();

  // Display message
  const noDataMessage = svg.selectAll(".no-data-message").data([1]);

  noDataMessage
    .enter()
    .append("text")
    .attr("class", "no-data-message")
    .attr("text-anchor", "middle")
    .attr("x", width / 2)
    .attr("y", height / 2)
    .attr("font-size", "18px")
    .attr("font-weight", "bold")
    .style("opacity", 0)
    .text("Not enough data (minimum 100 samples required)")
    .transition()
    .duration(750)
    .style("opacity", 1);

  noDataMessage
    .text("Not enough data (minimum 100 samples required)")
    .transition()
    .duration(750)
    .style("opacity", 1);

  // Show current count
  const countInfo = svg.selectAll(".count-info").data([1]);

  countInfo
    .enter()
    .append("text")
    .attr("class", "count-info")
    .attr("text-anchor", "middle")
    .attr("x", width / 2)
    .attr("y", height / 2 + 30)
    .attr("font-size", "14px")
    .style("opacity", 0)
    .text(`Current sample size: ${dlength}`)
    .transition()
    .duration(750)
    .style("opacity", 1);

  countInfo
    .text(`Current sample size: ${dlength}`)
    .transition()
    .duration(750)
    .style("opacity", 1);
}

/**
 * Removes the "not enough data" message
 */
function removeNotEnoughDataMessage() {
  svg
    .selectAll(".no-data-message, .count-info")
    .transition()
    .duration(750)
    .style("opacity", 0)
    .remove();
}

/**
 * Creates scales and calculates histogram bins
 * @param {Array} data - The dataset to visualize
 * @returns {Object} Object containing x scale, y scale, and histogram bins
 */
function createScalesAndHistogram(data) {
  // Add 5% padding to the x-axis domain
  const padding = (globalRERExtent[1] - globalRERExtent[0]) * 0.05;

  // Create x scale using global extent for consistency
  const x = d3
    .scaleLinear()
    .domain([
      Math.max(0.55, globalRERExtent[0] - padding),
      globalRERExtent[1] + padding,
    ])
    .range([0, width]);

  // Create histogram generator with 30 bins
  const histogram = d3
    .bin()
    .value((d) => d.RER)
    .domain(x.domain())
    .thresholds(x.ticks(30));

  // Generate bins
  const bins = histogram(data);

  // Calculate bin width
  const binWidth = bins.length > 0 ? bins[0].x1 - bins[0].x0 : 0.02;

  // Calculate the total count
  let totalCount = 0;
  bins.forEach((bin) => {
    totalCount += bin.length;
  });

  // Calculate density for each bin
  bins.forEach((bin) => {
    // Density = count / (N * bin_width)
    bin.density = bin.length / (totalCount * binWidth);
  });

  // Define y scale for density
  const yMax = d3.max(bins, (d) => d.density);

  const y = d3
    .scaleLinear()
    .domain([0, yMax * 1.05]) // Add 5% padding
    .nice()
    .range([height, 0]);

  return { x, y, bins };
}

/**
 * Updates the grid lines
 * @param {d3.ScaleLinear} y - Y scale
 */
function updateGridLines(y) {
  gridGroup.selectAll(".y-grid-line").remove();
  gridGroup
    .selectAll(".y-grid-line")
    .data(y.ticks(5))
    .enter()
    .append("line")
    .attr("class", "y-grid-line")
    .attr("x1", 0)
    .attr("x2", width)
    .attr("y1", (d) => y(d))
    .attr("y2", (d) => y(d))
    .attr("stroke", "#eee")
    .attr("stroke-width", 1);
}

/**
 * Updates the axes
 * @param {d3.ScaleLinear} x - X scale
 * @param {d3.ScaleLinear} y - Y scale
 */
function updateAxes(x, y) {
  const xAxis = axesGroup.selectAll(".x-axis").data([1]);
  const yAxis = axesGroup.selectAll(".y-axis").data([1]);

  // Enter new axes
  xAxis
    .enter()
    .append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height})`)
    .style("opacity", 0)
    .call(d3.axisBottom(x).tickFormat(d3.format(".2f")))
    .transition()
    .duration(750)
    .style("opacity", 1);

  yAxis
    .enter()
    .append("g")
    .attr("class", "y-axis")
    .style("opacity", 0)
    .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format(".3f")))
    .transition()
    .duration(750)
    .style("opacity", 1);

  // Update existing axes
  xAxis
    .transition()
    .duration(750)
    .call(d3.axisBottom(x).tickFormat(d3.format(".2f")))
    .style("opacity", 1);

  yAxis
    .transition()
    .duration(750)
    .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format(".3f")))
    .style("opacity", 1);

  // Style the axes
  axesGroup
    .selectAll(".domain, .tick line")
    .attr("stroke", "#888")
    .attr("stroke-width", 1);

  axesGroup
    .selectAll(".tick text")
    .attr("fill", "#333")
    .attr("font-size", "12px");
}

/**
 * Updates the histogram bars
 * @param {Array} bins - The histogram bins
 * @param {d3.ScaleLinear} x - X scale
 * @param {d3.ScaleLinear} y - Y scale
 * @param {string} barColor - The color for the bars
 * @param {number} dlength - The total count of data points
 */
function updateHistogramBars(bins, x, y, barColor, dlength) {
  const bars = barsGroup.selectAll(".histogram-bar").data(bins);

  // Remove old bars
  bars
    .exit()
    .transition()
    .duration(750)
    .attr("y", height)
    .attr("height", 0)
    .remove();

  // Update existing bars to show density
  bars
    .transition()
    .duration(750)
    .attr("class", "histogram-bar")
    .attr("x", (d) => x(d.x0))
    .attr("y", (d) => y(d.density))
    .attr("width", (d) => Math.max(0, x(d.x1) - x(d.x0) - 1))
    .attr("height", (d) => height - y(d.density))
    .attr("fill", barColor)
    .attr("opacity", 0.7)
    .attr("stroke", "white")
    .attr("stroke-width", 0.5);

  // Add new bars
  bars
    .enter()
    .append("rect")
    .attr("class", "histogram-bar")
    .attr("x", (d) => x(d.x0))
    .attr("y", height)
    .attr("width", (d) => Math.max(0, x(d.x1) - x(d.x0) - 1))
    .attr("height", 0)
    .attr("fill", barColor)
    .attr("opacity", 0.7)
    .attr("stroke", "white")
    .attr("stroke-width", 0.5)
    .transition()
    .duration(750)
    .attr("y", (d) => y(d.density))
    .attr("height", (d) => height - y(d.density));

  // Add tooltip interactions
  barsGroup
    .selectAll(".histogram-bar")
    .on("mouseover", (event, d) =>
      tooltip.style("visibility", "visible").html(
        `<strong>RER Range:</strong> ${d.x0.toFixed(2)} - ${d.x1.toFixed(2)}<br>
         <strong>Count:</strong> ${d.length}<br>
         <strong>Density:</strong> ${d.density.toFixed(4)}<br>
         <strong>% of Data:</strong> ${((d.length / dlength) * 100).toFixed(
           1
         )}%`
      )
    )
    .on("mousemove", (event) =>
      tooltip
        .style("top", `${event.pageY - 10}px`)
        .style("left", `${event.pageX + 10}px`)
    )
    .on("mouseout", () => tooltip.style("visibility", "hidden"));
}

/**
 * Adds a density curve to the visualization
 * @param {Array} data - The dataset to visualize
 * @param {d3.ScaleLinear} x - X scale
 * @param {d3.ScaleLinear} y - Y scale
 */
function addDensityCurve(data, x, y) {
  // Extract valid RER values
  const filteredValues = data.map((d) => d.RER).filter((d) => !isNaN(d));

  // Use Scott's rule for bandwidth calculation
  const stdDev = d3.deviation(filteredValues) || 0.01;
  const bandwidth = 1.06 * stdDev * Math.pow(filteredValues.length, -0.2);

  // Generate KDE data points
  const kde = generateKDE(filteredValues, bandwidth, x.domain(), 200);

  // Remove existing density line
  lineGroup.selectAll(".density-line").remove();

  // Add new density line
  lineGroup
    .append("path")
    .attr("class", "density-line")
    .datum(kde)
    .attr("fill", "none")
    .attr("stroke", "#111")
    .attr("stroke-width", 1.5)
    .attr("stroke-opacity", 0.8)
    .attr(
      "d",
      d3
        .line()
        .curve(d3.curveBasis)
        .x((d) => x(d[0]))
        .y((d) => y(d[1]))
    )
    .style("opacity", 0)
    .transition()
    .duration(750)
    .style("opacity", 1);
}

/**
 * Adds a reference line at RER = 1.0
 * @param {d3.ScaleLinear} x - X scale
 */
function addReferenceLine(x) {
  // Clear any existing reference line and annotation
  referenceGroup
    .selectAll(".reference-line, .reference-annotation, .reference-box")
    .remove();

  // Only add the reference line if it falls within our x-domain
  if (x.domain()[0] <= 1 && x.domain()[1] >= 1) {
    // Add the vertical reference line at RER = 1
    referenceGroup
      .append("line")
      .attr("class", "reference-line")
      .attr("x1", x(1))
      .attr("y1", 0)
      .attr("x2", x(1))
      .attr("y2", height)
      .attr("stroke", "red")
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "5,5") // Creates a dotted line
      .style("opacity", 0)
      .transition()
      .duration(750)
      .style("opacity", 0.8);

    // Add an annotation for the reference line
    referenceGroup
      .append("text")
      .attr("class", "reference-annotation")
      .attr("x", x(1) + 13)
      .attr("y", 20)
      .attr("text-anchor", "start")
      .attr("font-size", "12px")
      .attr("font-weight", "bold")
      .attr("fill", "red")
      .style("opacity", 0)
      .text("RER = 1.0")
      .transition()
      .duration(750)
      .style("opacity", 1);

    // Add explanation text
    referenceGroup
      .append("text")
      .attr("class", "reference-annotation")
      .attr("x", x(1) + 13)
      .attr("y", 35)
      .attr("text-anchor", "start")
      .attr("font-size", "10px")
      .attr("fill", "#333")
      .style("opacity", 0)
      .text("Metabolic transition from")
      .transition()
      .duration(750)
      .style("opacity", 1);

    referenceGroup
      .append("text")
      .attr("class", "reference-annotation")
      .attr("x", x(1) + 13)
      .attr("y", 45)
      .attr("text-anchor", "start")
      .attr("font-size", "10px")
      .attr("fill", "#333")
      .style("opacity", 0)
      .text("fats to carbohydrates")
      .transition()
      .duration(750)
      .style("opacity", 1);
  }
}

// =========== UTILITY FUNCTIONS ===========

/**
 * Generate KDE (Kernel Density Estimation) points
 * @param {Array} data - The dataset values
 * @param {number} bandwidth - The bandwidth parameter for KDE
 * @param {Array} domain - The domain range [min, max]
 * @param {number} numPoints - Number of evaluation points
 * @returns {Array} Array of [x, density] pairs
 */
function generateKDE(data, bandwidth, domain, numPoints) {
  // Create equally spaced points for evaluation
  const points = [];
  const step = (domain[1] - domain[0]) / numPoints;

  for (let i = 0; i <= numPoints; i++) {
    const x = domain[0] + i * step;
    points.push(x);
  }

  // Calculate density at each point using Gaussian kernel
  const densities = points.map((point) => {
    let sum = 0;
    data.forEach((value) => {
      // Use Gaussian kernel
      const z = (point - value) / bandwidth;
      if (Math.abs(z) <= 4) {
        // Only consider points within 4 standard deviations
        sum += Math.exp(-0.5 * z * z);
      }
    });
    // Normalize by bandwidth and data length
    return [point, sum / (data.length * bandwidth * Math.sqrt(2 * Math.PI))];
  });

  return densities;
}
