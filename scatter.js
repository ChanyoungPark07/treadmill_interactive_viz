import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

/**
 * Respiratory Exchange Ratio Visualization Tool
 *
 * This visualization displays the relationship between time, speed, and RER values
 * for different demographic groups. It allows users to see predicted RER values
 * based on a linear regression model and interact with the visualization by drawing
 * custom paths to explore different speed profiles.
 */

// Define dimensions and margins for the chart
const width = 900,
  height = 600,
  margin = { top: 70, right: 120, bottom: 70, left: 80 };

// Variable to track if drawing is enabled
let drawingEnabled = false;

// Add event listeners when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", function () {
  const calculateBtn = document.querySelector(".predict-btn");
  const resetBtn = document.querySelector(".reset-btn");
  const eraseBtn = document.querySelector(".erase-draw");

  // Set up the calculate button - initiates visualization based on demographic inputs
  calculateBtn.addEventListener("click", function () {
    // For gender, convert dropdown value to numeric format where 1=female, 0=male
    const genderElem = document.getElementById("gender");
    const gender = genderElem.value === "female" ? 1 : 0;

    const age = parseFloat(document.getElementById("age").value);
    const weight = parseFloat(document.getElementById("weight").value);
    const height = parseFloat(document.getElementById("height").value);

    // Validate inputs
    if (isNaN(age) || isNaN(weight) || isNaN(height)) {
      alert("Please enter valid numeric values for age, weight, and height.");
      return;
    }

    // Create the scatter plot with the provided inputs
    createScatterPlot(gender, age, weight, height);

    // Enable drawing after calculation
    drawingEnabled = true;
  });

  // Set up the reset button - clears visualization and input fields
  resetBtn.addEventListener("click", function () {
    // Clear input fields
    document.getElementById("age").value = "";
    document.getElementById("weight").value = "";
    document.getElementById("height").value = "";

    // Reset the visualization to show placeholder
    svg.selectAll(".point").remove();
    svg.selectAll(".x-axis").remove();
    svg.selectAll(".y-axis").remove();
    svg.selectAll(".grid-lines").remove();
    svg.selectAll(".legend").remove();
    svg.selectAll(".regression-line").remove();
    svg.selectAll(".regression-line-outline").remove();
    svg.selectAll(".regression-point-label").remove();
    svg.selectAll(".regression-line-overlay").remove();
    svg.selectAll(".highlight-point").remove();

    // Clear any user drawings
    svg.selectAll(".draw-layer").remove();

    // Disable drawing
    drawingEnabled = false;

    // Add placeholder text again
    svg.selectAll(".placeholder-text").remove();
    svg
      .append("text")
      .attr("class", "placeholder-text")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight / 2)
      .attr("text-anchor", "middle")
      .attr("font-size", "16px")
      .text("Enter your information and click 'Calculate' to view data");
  });

  // Set up the erase button - removes any user-drawn paths
  eraseBtn.addEventListener("click", function () {
    svg.selectAll(".draw-layer path").remove();
  });
});

// Working dimensions inside the chart
const innerWidth = width - margin.left - margin.right;
const innerHeight = height - margin.top - margin.bottom;

// Create SVG canvas with responsive sizing
const svg = d3
  .select("#scatter_chart")
  .attr("preserveAspectRatio", "xMinYMin meet")
  .attr("viewBox", `0 0 ${width} ${height}`)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

// Create tooltip for interactive data exploration
const tooltip = d3
  .select("body")
  .append("div")
  .attr("class", "tooltip")
  .style("visibility", "hidden")
  .style("background-color", "rgba(255, 255, 255, 0.9)")
  .style("padding", "10px")
  .style("border-radius", "5px")
  .style("box-shadow", "0 0 10px rgba(0,0,0,0.1)")
  .style("position", "absolute")
  .style("z-index", "1000");

/**
 * Define demographic bins for categorizing users
 * Bins are organized by gender, age, weight, and height
 */
const male_age_bins = [
  [10, 19],
  [20, 29],
  [30, 39],
  [40, 65],
];
const male_weight_bins = [
  [40, 64],
  [65, 74],
  [75, 84],
  [85, 140],
];
const male_height_bins = [
  [155, 169],
  [170, 179],
  [180, 205],
];
const female_age_bins = [
  [10, 19],
  [20, 29],
  [30, 39],
  [40, 60],
];
const female_weight_bins = [
  [40, 54],
  [55, 69],
  [70, 110],
];
const female_height_bins = [
  [145, 159],
  [160, 169],
  [170, 205],
];

// Set up initial chart title and labels
svg
  .append("text")
  .attr("class", "chart-title")
  .attr("x", innerWidth / 2)
  .attr("y", -40)
  .attr("text-anchor", "middle")
  .attr("font-size", "20px")
  .attr("font-weight", "bold")
  .text("Average Respiratory Exchange Ratio Over Time and Speed");

svg
  .append("text")
  .attr("class", "x-label")
  .attr("x", innerWidth / 2)
  .attr("y", innerHeight + 40)
  .attr("text-anchor", "middle")
  .attr("font-size", "14px")
  .text("Time (seconds)");

svg
  .append("text")
  .attr("class", "y-label")
  .attr("transform", "rotate(-90)")
  .attr("x", -innerHeight / 2)
  .attr("y", -50)
  .attr("text-anchor", "middle")
  .attr("font-size", "14px")
  .text("Speed (km/h)");

// Set background color
svg
  .append("rect")
  .attr("width", innerWidth)
  .attr("height", innerHeight)
  .attr("fill", "#EAEAF2");

// Add placeholder text until calculation
svg
  .append("text")
  .attr("class", "placeholder-text")
  .attr("x", innerWidth / 2)
  .attr("y", innerHeight / 2)
  .attr("text-anchor", "middle")
  .attr("font-size", "16px")
  .text("Enter your information and click 'Calculate' to view data");

/**
 * Helper function to determine if a value falls within any of the bin ranges
 * @param {number} value - The value to check
 * @param {Array} bins - Array of bin ranges
 * @returns {boolean} True if value falls in any bin, false otherwise
 */
function fallsInBin(value, bins) {
  return bins.some((bin) => value >= bin[0] && value <= bin[1]);
}

/**
 * Helper function to determine which bin a value falls into
 * @param {number} value - The value to check
 * @param {Array} bins - Array of bin ranges
 * @returns {number} Index of the bin or -1 if not found
 */
function getBinIndex(value, bins) {
  for (let i = 0; i < bins.length; i++) {
    if (value >= bins[i][0] && value <= bins[i][1]) {
      return i;
    }
  }
  return -1; // Not in any bin
}

/**
 * Filters data based on user demographic inputs
 * @param {Array} data - The dataset to filter
 * @param {number|string} gender - 0/1 or "male"/"female"
 * @param {number} age - User's age
 * @param {number} weight - User's weight in kg
 * @param {number} height - User's height in cm
 * @returns {Array} Filtered dataset matching demographic profile
 */
function filterDataByDemographics(data, gender, age, weight, height) {
  const isFemale = gender === 1 || gender === "1" || gender === "female";

  // Determine which bins to use based on gender
  const ageBins = isFemale ? female_age_bins : male_age_bins;
  const weightBins = isFemale ? female_weight_bins : male_weight_bins;
  const heightBins = isFemale ? female_height_bins : male_height_bins;

  // Get bin indices for the input demographics
  const ageBinIndex = getBinIndex(age, ageBins);
  const weightBinIndex = getBinIndex(weight, weightBins);
  const heightBinIndex = getBinIndex(height, heightBins);

  // If any value doesn't fall within the defined bins, return empty dataset
  if (ageBinIndex === -1 || weightBinIndex === -1 || heightBinIndex === -1) {
    return [];
  }

  // Get the specific bin ranges that the user falls into
  const targetAgeBin = ageBins[ageBinIndex];
  const targetWeightBin = weightBins[weightBinIndex];
  const targetHeightBin = heightBins[heightBinIndex];

  // Filter data to match gender and the specific bins
  return data.filter((d) => {
    const dataIsFemale = d.Gender === 1 || d.Gender === "1";
    return (
      dataIsFemale === isFemale &&
      d.Age >= targetAgeBin[0] &&
      d.Age <= targetAgeBin[1] &&
      d.Weight >= targetWeightBin[0] &&
      d.Weight <= targetWeightBin[1] &&
      d.Height >= targetHeightBin[0] &&
      d.Height <= targetHeightBin[1]
    );
  });
}

/**
 * Finds the appropriate model weights based on demographics
 * @param {number} gender - 0 for male, 1 for female
 * @param {number} age - User's age
 * @param {number} weight - User's weight in kg
 * @param {number} height - User's height in cm
 * @param {Object} modelWeights - Object containing model weights for different demographic groups
 * @returns {Object|null} Object with matching model weights or null if no match
 */
function findModelWeights(gender, age, weight, height, modelWeights) {
  // Parse key format: gender_age_weight_height
  function parseWeightKey(key) {
    const parts = key.split("_");
    const gender = parseInt(parts[0]); // 0 for male, 1 for female
    const ageBin = JSON.parse(parts[1]); // [min, max]
    const weightBin = JSON.parse(parts[2]); // [min, max]
    const heightBin = JSON.parse(parts[3]); // [min, max]

    return { gender, ageBin, weightBin, heightBin };
  }

  // Find the matching demographic bin key
  let matchingKey = null;
  for (const key of Object.keys(modelWeights.Weights)) {
    const { gender: g, ageBin, weightBin, heightBin } = parseWeightKey(key);

    if (
      g === gender &&
      age >= ageBin[0] &&
      age <= ageBin[1] &&
      weight >= weightBin[0] &&
      weight <= weightBin[1] &&
      height >= heightBin[0] &&
      height <= heightBin[1]
    ) {
      matchingKey = key;
      break;
    }
  }

  if (matchingKey) {
    return {
      key: matchingKey,
      weights: modelWeights.Weights[matchingKey],
      rmse: modelWeights.RMSE[matchingKey],
    };
  } else {
    return null;
  }
}

/**
 * Calculates RER based on linear model: RER = intercept + time*coefficient + speed*coefficient
 * @param {Array|Object} weights - Model coefficients
 * @param {number} time - Time in seconds
 * @param {number} speed - Speed in km/h
 * @returns {number} Calculated RER value
 */
function calculateRER(weights, time, speed) {
  // Check if weights is an array or an object with named fields
  if (Array.isArray(weights)) {
    return weights[0] + weights[1] * time + weights[2] * speed;
  } else {
    return weights.yintercept + weights.time * time + weights.speed * speed;
  }
}

/**
 * Main function to create and update the scatter plot
 * @param {number} gender - 0 for male, 1 for female
 * @param {number} age - User's age
 * @param {number} weight - User's weight in kg
 * @param {number} height - User's height in cm
 */
function createScatterPlot(gender, age, weight, height) {
  // Remove placeholder text
  svg.select(".placeholder-text").remove();

  // Clear any existing plot elements
  svg.selectAll(".point").remove();
  svg.selectAll(".x-axis").remove();
  svg.selectAll(".y-axis").remove();
  svg.selectAll(".grid-lines").remove();
  svg.selectAll(".legend").remove();
  svg.selectAll(".regression-line").remove();
  svg.selectAll(".regression-line-outline").remove();
  svg.selectAll(".regression-point-label").remove();
  svg.selectAll(".regression-line-overlay").remove();
  svg.selectAll(".highlight-point").remove();
  svg.selectAll("defs").remove();
  svg.selectAll(".draw-layer").remove();

  // Create drawing layer for user interactions
  const drawLayer = svg.append("g").attr("class", "draw-layer");

  // Create a group to hold regression lines - will be moved to top later
  const regressionGroup = svg.append("g").attr("class", "regression-group");

  // Variables to track drawing state
  let isDrawing = false;
  let userOutlinePath = null;
  let freePathData = [];
  let lastPoint = null;
  let lastTimestamp = 0;

  // Create a smooth curve interpolator with higher alpha value for more smoothness
  const pathLineGenerator = d3
    .line()
    .x((d) => d[0])
    .y((d) => d[1])
    .curve(d3.curveCatmullRom.alpha(0.75)); // Increased smoothing with higher alpha

  // Load and process the data
  Promise.all([d3.json("model_weights.json"), d3.csv("merged.csv")])
    .then(([modelWeights, data]) => {
      // Find the appropriate model for this demographic
      const model = findModelWeights(gender, age, weight, height, modelWeights);

      if (!model) {
        svg
          .append("text")
          .attr("class", "placeholder-text")
          .attr("x", innerWidth / 2)
          .attr("y", innerHeight / 2)
          .attr("text-anchor", "middle")
          .attr("font-size", "16px")
          .text("No matching model for your demographic profile");

        // Disable drawing when no model is found
        drawingEnabled = false;
        return;
      }

      // Filter and parse numeric values
      data = data.filter((d) => d && typeof d === "object");

      data.forEach((d) => {
        d.RER = +d.RER;
        d.time = +d.time || +d.Time || 0;
        d.Speed = +d.Speed;
        d.Age = +d.Age;
        d.Weight = +d.Weight;
        d.Height = +d.Height;
        // Ensure Gender is properly parsed as a number (0 or 1)
        d.Gender = d.Gender === "1" || d.Gender === 1 ? 1 : 0;
      });

      // Filter out invalid entries
      data = data.filter(
        (d) => !isNaN(d.RER) && !isNaN(d.time) && !isNaN(d.Speed)
      );

      // Calculate global RER extent from the entire dataset
      // This ensures color scale is consistent across different demographic selections
      const globalRerExtent = d3.extent(data, (d) => d.RER);

      // Filter data based on demographic inputs
      const filteredData = filterDataByDemographics(
        data,
        gender,
        age,
        weight,
        height
      );

      if (filteredData.length === 0) {
        svg
          .append("text")
          .attr("class", "placeholder-text")
          .attr("x", innerWidth / 2)
          .attr("y", innerHeight / 2)
          .attr("text-anchor", "middle")
          .attr("font-size", "16px")
          .text("No matching data for your demographic profile");

        // Disable drawing when no data is found
        drawingEnabled = false;
        return;
      }

      // Create time bins (30 second intervals)
      const timeMax = d3.max(filteredData, (d) => d.time);
      const timeBinSize = 30;
      const timeBins = d3.range(0, timeMax + timeBinSize, timeBinSize);

      // Create speed bins (0.5 km/h intervals)
      const speedMin = 0; // Set to 0 as per request
      const speedMax = Math.ceil(d3.max(filteredData, (d) => d.Speed) * 1.05); // Add 5% margin
      const speedBinSize = 0.5;
      const speedBins = d3.range(
        speedMin,
        speedMax + speedBinSize,
        speedBinSize
      );

      // Bin the data
      filteredData.forEach((d) => {
        d.time_bin =
          Math.floor(d.time / timeBinSize) * timeBinSize + timeBinSize / 2;
        d.speed_bin =
          Math.floor((d.Speed - speedMin) / speedBinSize) * speedBinSize +
          speedMin +
          speedBinSize / 2;
      });

      // Group data by time bin and speed bin to calculate average RER
      const binnedData = Array.from(
        d3.group(
          filteredData,
          (d) => d.time_bin,
          (d) => d.speed_bin
        ),
        ([time_bin, speedMap]) => {
          return Array.from(speedMap, ([speed_bin, values]) => {
            const avgRER = d3.mean(values, (d) => d.RER);
            return {
              time_bin,
              speed_bin,
              RER: avgRER,
              count: values.length,
            };
          });
        }
      ).flat();

      // Set up scales
      const xScale = d3
        .scaleLinear()
        .domain([0, d3.max(binnedData, (d) => d.time_bin) + timeBinSize / 2])
        .range([0, innerWidth]);

      const yScale = d3
        .scaleLinear()
        .domain([0, speedMax]) // Start at 0 as requested
        .range([innerHeight, 0]);

      // Create color scale for RER values using the global extent
      // This ensures consistent coloring across different demographic selections
      const colorScale = d3
        .scaleSequential()
        .domain([globalRerExtent[0], globalRerExtent[1]])
        .interpolator(d3.interpolateRdYlBu)
        .clamp(true);

      // Reverse the color scale to match RdYlBu_r in Python
      const reversedColorScale = (d) =>
        colorScale(globalRerExtent[1] - (d - globalRerExtent[0]));

      // Create defs for gradients
      const defs = svg.append("defs");

      // Create axes
      const xAxis = d3.axisBottom(xScale);
      const yAxis = d3.axisLeft(yScale);

      // Add X axis
      svg
        .append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0, ${innerHeight})`)
        .call(xAxis);

      // Add Y axis
      svg.append("g").attr("class", "y-axis").call(yAxis);

      // Add grid lines
      svg
        .append("g")
        .attr("class", "grid-lines")
        .selectAll("line")
        .data(yScale.ticks(10))
        .enter()
        .append("line")
        .attr("x1", 0)
        .attr("x2", innerWidth)
        .attr("y1", (d) => yScale(d))
        .attr("y2", (d) => yScale(d))
        .attr("stroke", "#fff")
        .attr("stroke-width", 1)
        .attr("opacity", 0.3);

      svg
        .append("g")
        .attr("class", "grid-lines")
        .selectAll("line")
        .data(xScale.ticks(10))
        .enter()
        .append("line")
        .attr("y1", 0)
        .attr("y2", innerHeight)
        .attr("x1", (d) => xScale(d))
        .attr("x2", (d) => xScale(d))
        .attr("stroke", "#fff")
        .attr("stroke-width", 1)
        .attr("opacity", 0.3);

      // Calculate default radius for each point based on count
      const calculateRadius = (count) => Math.min(5, 5 + Math.sqrt(count));

      // Calculate average speeds at each time point to use in our regression line
      const timeGroups = d3.group(binnedData, (d) => d.time_bin);
      const regressionData = Array.from(timeGroups, ([time, values]) => {
        const avgSpeed = d3.mean(values, (d) => d.speed_bin);
        const predictedRER = calculateRER(model.weights, time, avgSpeed);
        return { time, avgSpeed, predictedRER };
      }).sort((a, b) => a.time - b.time);

      // Create a line generator for the regression line with more smoothing
      const lineGenerator = d3
        .line()
        .x((d) => xScale(d.time))
        .y((d) => yScale(d.avgSpeed))
        .curve(d3.curveCatmullRom.alpha(0.5)); // Smoother curve

      // Add color stops to match the RdYlBu_r colormap for both legends
      // Use global RER extent for consistent legend colors
      const colorStops = d3.range(0, 1.01, 0.1).map((t) => {
        const rer = d3.quantile(globalRerExtent, t);
        return {
          offset: `${t * 100}%`,
          color: reversedColorScale(rer),
        };
      });

      // Variables to track animation completion
      let totalPoints = binnedData.length;
      let animatedPoints = 0;
      let animationComplete = false;

      /**
       * Creates the regression line with color gradient based on RER values
       */
      function createRegressionLine() {
        // Create gradient for the line color with unique ID
        const lineGradientId = "line-gradient-" + Date.now();
        const lineGradient = defs
          .append("linearGradient")
          .attr("id", lineGradientId)
          .attr("gradientUnits", "userSpaceOnUse")
          .attr("x1", 0)
          .attr("y1", 0)
          .attr("x2", innerWidth)
          .attr("y2", 0);

        // Use the same color scale as the data points for consistent coloring
        regressionData.forEach((d, i) => {
          lineGradient
            .append("stop")
            .attr("offset", `${(i / (regressionData.length - 1)) * 100}%`)
            .attr("stop-color", reversedColorScale(d.predictedRER));
        });

        // First add the outline stroke to the regression group
        const outlinePath = regressionGroup
          .append("path")
          .datum(regressionData)
          .attr("class", "regression-line-outline")
          .attr("fill", "none")
          .attr("stroke", "#000") // Black outline
          .attr("stroke-width", 6) // Wider than the colored line
          .attr("stroke-opacity", 0.5)
          .attr("d", lineGenerator);

        // Then add the colored regression line on top in the regression group
        const path = regressionGroup
          .append("path")
          .datum(regressionData)
          .attr("class", "regression-line")
          .attr("fill", "none")
          .attr("stroke", `url(#${lineGradientId})`)
          .attr("stroke-width", 4)
          .attr("d", lineGenerator);

        // Animate the regression line drawing from left to right
        const pathLength = path.node().getTotalLength();
        const outlinePathLength = outlinePath.node().getTotalLength();

        outlinePath
          .attr("stroke-dasharray", outlinePathLength)
          .attr("stroke-dashoffset", outlinePathLength)
          .transition()
          .duration(1500)
          .attr("stroke-dashoffset", 0);

        path
          .attr("stroke-dasharray", pathLength)
          .attr("stroke-dashoffset", pathLength)
          .transition()
          .duration(1500)
          .attr("stroke-dashoffset", 0)
          .on("end", function () {
            // After line is drawn, add RER value labels to the regression group
            regressionGroup
              .selectAll(".regression-point-label")
              .data(regressionData)
              .enter()
              .append("text")
              .attr("class", "regression-point-label")
              .attr("x", (d) => xScale(d.time) + 5)
              .attr("y", (d) => yScale(d.avgSpeed) - 15) // Moved up more as requested
              .attr("font-size", "10px")
              .attr("fill", "#303030")
              .attr("stroke", "#ffffff")
              .attr("stroke-width", 0.5)
              .attr("paint-order", "stroke")
              .text((d) => d.predictedRER.toFixed(2))
              .style("opacity", 0)
              .style("display", (d) => (d.time % 120 === 0 ? "block" : "none")) // Show labels only every 2 minutes
              .transition()
              .duration(500)
              .style("opacity", 1);

            // Create an invisible overlay for the regression line to make it easier to hover
            const lineOverlayWidth = 20; // Width of the invisible hover area

            // Create a path generator for the overlay
            const overlayPathGenerator = d3
              .line()
              .x((d) => xScale(d.time))
              .y((d) => yScale(d.avgSpeed))
              .curve(d3.curveCatmullRom.alpha(0.5));

            // Add invisible overlay path with wider stroke-width for easier hovering to the regression group
            const overlayPath = regressionGroup
              .append("path")
              .datum(regressionData)
              .attr("class", "regression-line-overlay")
              .attr("fill", "none")
              .attr("stroke", "transparent") // Invisible stroke
              .attr("stroke-width", lineOverlayWidth) // Much wider than the visible line for easier hovering
              .attr("d", overlayPathGenerator)
              .style("pointer-events", "stroke") // Only trigger mouse events on the stroke, not the area
              .on("mousemove", function (event) {
                // Get mouse position relative to the SVG
                const [mouseX, mouseY] = d3.pointer(event, this);

                // Convert mouse position to data values
                const time = xScale.invert(mouseX);
                const speed = yScale.invert(mouseY);

                // Find the closest point on the regression line
                // Use bisector to find the closest time point
                const bisectTime = d3.bisector((d) => d.time).left;
                const index = bisectTime(regressionData, time);

                // Choose the closest point
                const closest =
                  index > 0
                    ? time - regressionData[index - 1].time <
                      regressionData[index].time - time
                      ? regressionData[index - 1]
                      : regressionData[index]
                    : regressionData[index];

                // Calculate predicted RER for the exact mouse position using the model weights
                const exactRER = calculateRER(model.weights, time, speed);

                // Show tooltip at mouse position
                tooltip
                  .style("visibility", "visible")
                  .style("left", `${event.pageX + 10}px`)
                  .style("top", `${event.pageY - 10}px`).html(`
                  <b>Regression Line</b><br>
                  <strong>Time:</strong> ${time.toFixed(
                    0
                  )} seconds (${(time / 60).toFixed(1)} min)<br>
                  <strong>Speed:</strong> ${speed.toFixed(1)} km/h<br>
                  <strong>Predicted RER:</strong> ${exactRER.toFixed(3)}
                `);

                // Highlight the point on the regression line
                svg.selectAll(".highlight-point").remove();

                regressionGroup
                  .append("circle")
                  .attr("class", "highlight-point")
                  .attr("cx", xScale(closest.time))
                  .attr("cy", yScale(closest.avgSpeed))
                  .attr("r", 6)
                  .attr("fill", "white")
                  .attr("stroke", "#000")
                  .attr("stroke-width", 2)
                  .style("pointer-events", "none"); // Don't interfere with hover events
              })
              .on("mouseout", function () {
                // Hide tooltip
                tooltip.style("visibility", "hidden");

                // Remove highlight
                svg.selectAll(".highlight-point").remove();
              });

            // After regression line is complete, add legends
            addLegends();

            // Ensure proper z-index by raising elements in order
            // First make sure drawing layer is above data points
            drawLayer.raise();
            // Then make sure regression layer is on top of everything
            regressionGroup.raise();
          });
      }

      /**
       * Creates color legends for the visualization
       */
      function addLegends() {
        // Create a small gradient for the legend - with explicit ID for browser compatibility
        const legendLineGradientId = "legend-line-gradient-" + Date.now();
        const legendLineGradient = defs
          .append("linearGradient")
          .attr("id", legendLineGradientId)
          .attr("gradientUnits", "userSpaceOnUse")
          .attr("x1", "0")
          .attr("y1", "0")
          .attr("x2", "30")
          .attr("y2", "0");

        // Use samples from the global RER range to create the legend gradient stops
        // This ensures legend matches the same color scale across all visualizations
        const legendStops = d3.range(0, 1.01, 0.2).map((t) => {
          const rerValue = d3.quantile(globalRerExtent, t);
          return {
            offset: `${t * 100}%`,
            color: reversedColorScale(rerValue),
          };
        });

        // Add color stops to the legend gradient
        legendStops.forEach((stop) => {
          legendLineGradient
            .append("stop")
            .attr("offset", stop.offset)
            .attr("stop-color", stop.color);
        });

        // Add a legend entry for the regression line
        const legendGroup = svg
          .append("g")
          .attr("class", "legend")
          .attr("transform", `translate(${innerWidth - 180}, 20)`);

        // Add the outline for the legend line
        legendGroup
          .append("line")
          .attr("x1", 0)
          .attr("y1", -35)
          .attr("x2", 30)
          .attr("y2", -35)
          .attr("stroke", "#000")
          .attr("stroke-opacity", 0.5)
          .attr("stroke-width", 6);

        // Add the colored line for the legend with updated gradient reference
        legendGroup
          .append("line")
          .attr("x1", 0)
          .attr("y1", -35)
          .attr("x2", 30)
          .attr("y2", -35)
          .attr("stroke", `url(#${legendLineGradientId})`)
          .attr("stroke-width", 4);

        legendGroup
          .append("text")
          .attr("x", 35)
          .attr("y", -30)
          .attr("text-anchor", "start")
          .text("Model Regression Line");

        // Add color legend for RER values
        const legendWidth = 30;
        const legendHeight = innerHeight;

        const legendScale = d3
          .scaleLinear()
          .domain(globalRerExtent)
          .range([legendHeight, 0]);

        const legendAxis = d3
          .axisRight(legendScale)
          .ticks(8)
          .tickFormat(d3.format(".2f"));

        const legend = svg
          .append("g")
          .attr("class", "legend")
          .attr("transform", `translate(${innerWidth + 20}, 0)`);

        // Create gradient for legend
        const linearGradient = defs
          .append("linearGradient")
          .attr("id", "rer-gradient")
          .attr("x1", "0%")
          .attr("y1", "100%")
          .attr("x2", "0%")
          .attr("y2", "0%");

        // Add color stops to match the RdYlBu_r colormap
        colorStops.forEach((stop) => {
          linearGradient
            .append("stop")
            .attr("offset", stop.offset)
            .attr("stop-color", stop.color);
        });

        // Draw the gradient rectangle
        legend
          .append("rect")
          .attr("width", legendWidth)
          .attr("height", legendHeight)
          .style("fill", "url(#rer-gradient)");

        // Add the legend axis
        legend
          .append("g")
          .attr("transform", `translate(${legendWidth}, 0)`)
          .call(legendAxis);

        // Add legend title
        legend
          .append("text")
          .attr("transform", "rotate(90)")
          .attr("x", legendHeight / 2)
          .attr("y", -legendWidth - 45)
          .attr("text-anchor", "middle")
          .attr("font-size", "12px")
          .text("Average RER (VCO2/VO2)");

        // Ensure legends are above the data points
        svg.selectAll(".legend").raise();
      }

      // Add scatter plot points with appearance animation
      svg
        .selectAll(".point")
        .data(binnedData)
        .enter()
        .append("circle")
        .attr("class", "point")
        .attr("cx", (d) => xScale(d.time_bin))
        .attr("cy", (d) => yScale(d.speed_bin))
        .attr("r", 0) // Start with radius 0 for animation
        .attr("fill", (d) => reversedColorScale(d.RER))
        .attr("stroke", "#fff")
        .attr("stroke-width", 1)
        .attr("opacity", 0.8)
        .on("mouseover", function (event, d) {
          d3.select(this)
            .transition()
            .duration(200)
            .attr("r", (d) => Math.min(12, 7 + Math.sqrt(d.count)))
            .attr("opacity", 1);

          tooltip
            .style("visibility", "visible")
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 10}px`).html(`
            <strong>Time:</strong> ${d.time_bin} seconds<br>
            <strong>Speed:</strong> ${d.speed_bin.toFixed(1)} km/h<br>
            <strong>Average RER:</strong> ${d.RER.toFixed(3)}<br>
            <strong>Data points:</strong> ${d.count}
          `);
        })
        .on("mouseout", function (event, d) {
          d3.select(this)
            .transition()
            .duration(200)
            .attr("r", (d) => calculateRadius(d.count))
            .attr("opacity", 0.8);

          tooltip.style("visibility", "hidden");
        })
        .transition() // Animate points appearance
        .duration(1000)
        .delay((d, i) => i * 10)
        .attr("r", (d) => calculateRadius(d.count))
        .on("end", function (d, i) {
          animatedPoints++;

          // When the last point is done animating, create the regression line
          if (animatedPoints === totalPoints && !animationComplete) {
            animationComplete = true; // Prevent multiple calls
            createRegressionLine();
          }
        });

      /**
       * Helper function to calculate distance between two points
       */
      function distance(p1, p2) {
        return Math.sqrt(
          Math.pow(p2[0] - p1[0], 2) + Math.pow(p2[1] - p1[1], 2)
        );
      }

      /**
       * Helper function to interpolate points for smoother drawing
       * Creates additional points between p1 and p2 when the distance is large
       */
      function interpolatePoints(p1, p2, minDistance = 5) {
        const dist = distance(p1, p2);
        const result = [p1];

        if (dist > minDistance) {
          // Calculate number of points to insert (more points = smoother curve)
          const numPoints = Math.ceil(dist / minDistance);

          for (let i = 1; i < numPoints; i++) {
            const t = i / numPoints;
            result.push([
              p1[0] + (p2[0] - p1[0]) * t,
              p1[1] + (p2[1] - p1[1]) * t,
            ]);
          }
        }

        result.push(p2);
        return result;
      }

      /**
       * Starts user drawing on mouse down
       * @param {Event} event - Mouse event
       */
      function startDrawing(event) {
        // Only allow drawing if enabled
        if (!drawingEnabled) {
          return;
        }

        isDrawing = true;

        document.body.style.pointerEvents = "none";
        svg.style("pointer-events", "all"); // Allow SVG interactions

        const [x, y] = d3.pointer(event);
        lastPoint = [x, y];
        lastTimestamp = Date.now();

        // Store initial point
        freePathData = [[x, y]];

        // Create an outline path in the drawing layer
        userOutlinePath = drawLayer
          .append("path")
          .datum(freePathData)
          .attr("class", "user-line-outline")
          .attr("fill", "none")
          .attr("stroke", "#000") // Black outline
          .attr("stroke-width", 6) // Thicker than main line
          .attr("stroke-opacity", 0.5)
          .attr("stroke-linecap", "round")
          .attr("stroke-linejoin", "round")
          .attr("d", pathLineGenerator);
      }

      /**
       * Updates user drawing on mouse move
       * @param {Event} event - Mouse event
       */
      function updateDrawing(event) {
        if (!isDrawing || !drawingEnabled) return;

        const [x, y] = d3.pointer(event);
        const currentPoint = [x, y];
        const now = Date.now();

        // Only add points if we've moved a minimum distance or after a time threshold
        // This prevents too many points when moving slowly
        if (distance(lastPoint, currentPoint) > 3 || now - lastTimestamp > 50) {
          // Add interpolated points between last point and current point for smoother curves
          const newPoints = interpolatePoints(lastPoint, currentPoint);

          // Add all new points except the first one (which is the same as lastPoint)
          for (let i = 1; i < newPoints.length; i++) {
            freePathData.push(newPoints[i]);
          }

          // Update the path with the more detailed point set using our smooth curve generator
          userOutlinePath.datum(freePathData).attr("d", pathLineGenerator);

          // Update tracking variables
          lastPoint = currentPoint;
          lastTimestamp = now;
        }

        // Ensure regression group stays on top
        regressionGroup.raise();
      }

      /**
       * Finishes user drawing on mouse up, creates gradient-colored path
       */
      function endDrawing() {
        if (!isDrawing || !drawingEnabled) return;

        isDrawing = false;

        // Convert drawing points to data coordinates and calculate RER
        const dataPoints = freePathData.map((point) => {
          const time = xScale.invert(point[0]);
          const speed = yScale.invert(point[1]);
          const calculatedRER = calculateRER(model.weights, time, speed);
          return {
            x: point[0],
            y: point[1],
            time: time,
            speed: speed,
            rer: calculatedRER,
          };
        });

        // Create a unique gradient ID for this path
        const userPathGradientId = "user-path-gradient-" + Date.now();

        // Create a linear gradient for the path
        const userPathGradient = defs
          .append("linearGradient")
          .attr("id", userPathGradientId)
          .attr("gradientUnits", "userSpaceOnUse")
          .attr("x1", dataPoints[0].x)
          .attr("y1", dataPoints[0].y)
          .attr("x2", dataPoints[dataPoints.length - 1].x)
          .attr("y2", dataPoints[dataPoints.length - 1].y);

        // Add color stops based on calculated RER values
        dataPoints.forEach((point, i) => {
          userPathGradient
            .append("stop")
            .attr("offset", `${(i / (dataPoints.length - 1)) * 100}%`)
            .attr("stop-color", reversedColorScale(point.rer));
        });

        // Create the final path with gradient color
        const userPath = drawLayer
          .append("path")
          .datum(freePathData)
          .attr("class", "user-line-outline")
          .attr("fill", "none")
          .attr("stroke", `url(#${userPathGradientId})`) // Use gradient color
          .attr("stroke-width", 4)
          .attr("stroke-opacity", 1.0)
          .attr("stroke-linecap", "round")
          .attr("stroke-linejoin", "round")
          .attr("d", pathLineGenerator)
          .on("mouseover", function (event) {
            // Get mouse position
            const [mouseX, mouseY] = d3.pointer(event);

            // Find closest point in the path
            let minDist = Infinity;
            let closestPoint = null;

            dataPoints.forEach((point) => {
              const dist = Math.sqrt(
                Math.pow(mouseX - point.x, 2) + Math.pow(mouseY - point.y, 2)
              );

              if (dist < minDist) {
                minDist = dist;
                closestPoint = point;
              }
            });

            // Only show tooltip if we're close enough to the line
            if (minDist < 10 && closestPoint) {
              tooltip
                .style("visibility", "visible")
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY - 10}px`).html(`
                  <b>Your Drawn Line</b><br>
                  <strong>Time:</strong> ${closestPoint.time.toFixed(
                    0
                  )} seconds (${(closestPoint.time / 60).toFixed(1)} min)<br>
                  <strong>Speed:</strong> ${closestPoint.speed.toFixed(
                    1
                  )} km/h<br>
                  <strong>Predicted RER:</strong> ${closestPoint.rer.toFixed(3)}
                `);
            }
          })
          .on("mousemove", function (event) {
            // Update tooltip position with the same logic as mouseover
            const [mouseX, mouseY] = d3.pointer(event);

            let minDist = Infinity;
            let closestPoint = null;

            dataPoints.forEach((point) => {
              const dist = Math.sqrt(
                Math.pow(mouseX - point.x, 2) + Math.pow(mouseY - point.y, 2)
              );

              if (dist < minDist) {
                minDist = dist;
                closestPoint = point;
              }
            });

            if (minDist < 10 && closestPoint) {
              tooltip
                .style("visibility", "visible")
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY - 10}px`).html(`
                  <b>Your Drawn Line</b><br>
                  <strong>Time:</strong> ${closestPoint.time.toFixed(
                    0
                  )} seconds (${(closestPoint.time / 60).toFixed(1)} min)<br>
                  <strong>Speed:</strong> ${closestPoint.speed.toFixed(
                    1
                  )} km/h<br>
                  <strong>Predicted RER:</strong> ${closestPoint.rer.toFixed(3)}
                `);
            }
          })
          .on("mouseout", function () {
            tooltip.style("visibility", "hidden");
          });

        document.body.style.pointerEvents = "auto";

        // Make sure regression group stays on top after drawing
        regressionGroup.raise();
      }

      // Attach mouse events to the SVG
      svg
        .on("mousedown", startDrawing)
        .on("mousemove", updateDrawing)
        .on("mouseup", endDrawing);
    })
    .catch((error) => {
      svg
        .append("text")
        .attr("class", "placeholder-text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight / 2)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .text("Error loading data: " + error.message);
    });
}
