import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

// Add tooltip container to body if it doesn't exist
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

// Add info icons next to labels
const coolingLabel = d3.select("label[for='resting']");
coolingLabel
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
      .html(
        "Cooldown refers to the final phase of the run, during which they ran at 5 km/h after reaching max speed."
      )
      .style("top", event.pageY - 10 + "px")
      .style("left", event.pageX + 10 + "px");
  })
  .on("mouseout", () => {
    infoTooltip.style("visibility", "hidden");
  });

const speedLabel = d3.select("label[for='speed']");
speedLabel
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
      .html(
        "The running speed was strictly increasing throughout the experiment, so higher speeds are related to longer running times."
      )
      .style("top", event.pageY - 10 + "px")
      .style("left", event.pageX + 10 + "px");
  })
  .on("mouseout", () => {
    infoTooltip.style("visibility", "hidden");
  });

// Define margins with more space for bottom
const margin = { top: 50, right: 30, bottom: 70, left: 80 };

// Create responsive SVG with adjusted viewBox
const svg = d3
  .select("#chart")
  .attr("preserveAspectRatio", "xMinYMin meet")
  .attr("viewBox", `0 0 800 500`) // Increased height to accommodate labels
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

// Calculate dimensions based on viewBox
const width = 800 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

const tooltip = d3
  .select("body")
  .append("div")
  .attr("class", "tooltip")
  .style("position", "absolute")
  .style("visibility", "hidden")
  .style("background", "white")
  .style("padding", "5px")
  .style("border", "1px solid #ddd");

// Rest of your d3.csv and data loading code remains the same...
d3.csv("merged.csv").then((data) => {
  data.forEach((d) => {
    d.RER = +d.RER;
    d.Age = +d.Age;
    d.Sex = +d.Sex;
    d.Weight = +d.Weight;
    d.Height = +d.Height;
    d.Temperature = +d.Temperature;
    d.Speed = +d.Speed;
    d.Resting = +d.Resting;
  });

  drawHistogram(data, data.length);
  setupFilters(data);
});

// Setup
function setupFilters(data) {
  const ageSelect = d3.select("#age");
  const sexSelect = d3.select("#sex");
  const weightSelect = d3.select("#weight");
  const heightSelect = d3.select("#height");
  const temperatureSelect = d3.select("#temperature");
  const speedSelect = d3.select("#speed");
  const restingSelect = d3.select("#resting");

  function updateSpeedInput() {
    const restingVal = restingSelect.node().value;
    const speedInput = document.getElementById("speed");

    if (restingVal === "resting") {
      speedInput.disabled = true;
      speedInput.value = "all";
    } else {
      speedInput.disabled = false;
    }
  }

  function updateFilters() {
    const ageVal = ageSelect.node().value;
    const sexVal = sexSelect.node().value;
    const weightVal = weightSelect.node().value;
    const heightVal = heightSelect.node().value;
    const temperatureVal = temperatureSelect.node().value;
    const speedVal = speedSelect.node().value;
    const restingVal = restingSelect.node().value;

    const filtered = data.filter((d) => {
      const ageFilter = getAgeFilter(ageVal, d.Age);
      const sexFilter = getSexFilter(sexVal, d.Sex);
      const weightFilter = getWeightFilter(weightVal, d.Weight);
      const heightFilter = getHeightFilter(heightVal, d.Height);
      const temperatureFilter = getTemperatureFilter(
        temperatureVal,
        d.Temperature
      );
      const speedFilter = getSpeedFilter(speedVal, d.Speed);
      const restingFilter = getRestingFilter(restingVal, d.Resting);
      return (
        ageFilter &&
        sexFilter &&
        weightFilter &&
        heightFilter &&
        temperatureFilter &&
        speedFilter &&
        restingFilter
      );
    });
    drawHistogram(filtered, filtered.length);
  }

  ageSelect.on("change", updateFilters);
  sexSelect.on("change", updateFilters);
  weightSelect.on("change", updateFilters);
  heightSelect.on("change", updateFilters);
  temperatureSelect.on("change", updateFilters);
  speedSelect.on("change", updateFilters);
  restingSelect.on("change", () => {
    updateSpeedInput();
    updateFilters();
  });
}

// Add filter
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

function getTemperatureFilter(tempVal, temp) {
  switch (tempVal) {
    case "all":
      return true;
    case "Under 20":
      return temp < 20;
    case "20-22.5":
      return temp >= 20 && temp < 22.5;
    case "22.5-25":
      return temp >= 22.5 && temp < 25;
    default:
      return temp >= 25;
  }
}

function getRestingFilter(restingVal, resting) {
  switch (restingVal) {
    case "running":
      return resting === 0;
    default:
      return resting === 1;
  }
}

function getSpeedFilter(speedVal, speed) {
  switch (speedVal) {
    case "all":
      return true;
    case "5-10":
      return speed >= 5 && speed < 10;
    case "10-15":
      return speed >= 10 && speed < 15;
    default:
      return speed >= 15;
  }
}

function drawHistogram(data, dlength, previousBins = null) {
  if (!window.previousBins) {
    window.previousBins = [];
  }

  // Get current sex filter value
  const currentSex = d3.select("#sex").node().value;

  // Define colors based on sex selection
  const getBarColor = () => {
    switch (currentSex) {
      case "Male":
        return "#89CFF0"; // Baby blue
      case "Female":
        return "#FFB6C1"; // Pink
      default:
        return "#69b3a2"; // Original teal color
    }
  };

  // Update title and labels with transitions
  const labels = {
    "chart-title": {
      text: "Distribution of Respiratory Exchange Rate (RER) by Demographics",
      x: width / 2,
      y: -20,
      size: "18px",
      weight: "bold",
    },
    "x-label": {
      text: "RER (VCO2 / VO2)",
      x: width / 2,
      y: height + 40, // Adjusted position
      size: "14px",
    },
    "y-label": {
      text: "Count",
      x: -height / 2,
      y: -60,
      size: "14px",
      transform: "rotate(-90)",
    },
    "count-label": {
      text: `Total Count: ${dlength}`,
      x: width,
      y: 30, // Adjusted position
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

  // Check if we have enough data
  if (dlength <= 1000) {
    // Remove existing bars with transition
    svg
      .selectAll("rect")
      .transition()
      .duration(750)
      .attr("y", height)
      .attr("height", 0)
      .remove();

    // Remove existing axes with transition
    svg
      .selectAll(".x-axis, .y-axis")
      .transition()
      .duration(750)
      .style("opacity", 0)
      .remove();

    // Update or add message
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
      .text("Not enough data (minimum 1,000 samples required)")
      .transition()
      .duration(750)
      .style("opacity", 1);

    noDataMessage
      .text("Not enough data (minimum 1,000 samples required)")
      .transition()
      .duration(750)
      .style("opacity", 1);

    // Update or add count info
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

    return;
  }

  // Remove "not enough data" message if it exists
  svg
    .selectAll(".no-data-message, .count-info")
    .transition()
    .duration(750)
    .style("opacity", 0)
    .remove();

  const x = d3.scaleLinear().domain([0.55, 1.5]).range([0, width]);

  const histogram = d3
    .bin()
    .value((d) => d.RER)
    .domain(x.domain())
    .thresholds(x.ticks(50));

  const bins = histogram(data);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(bins, (d) => d.length)])
    .nice()
    .range([height, 0]);

  // Update axes with transition
  const xAxis = svg.selectAll(".x-axis").data([1]);
  const yAxis = svg.selectAll(".y-axis").data([1]);

  // Enter new axes
  xAxis
    .enter()
    .append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height})`)
    .style("opacity", 0)
    .call(d3.axisBottom(x))
    .transition()
    .duration(750)
    .style("opacity", 1);

  yAxis
    .enter()
    .append("g")
    .attr("class", "y-axis")
    .style("opacity", 0)
    .call(d3.axisLeft(y))
    .transition()
    .duration(750)
    .style("opacity", 1);

  // Update existing axes
  xAxis.transition().duration(750).call(d3.axisBottom(x)).style("opacity", 1);

  yAxis.transition().duration(750).call(d3.axisLeft(y)).style("opacity", 1);

  // Update bars with transition
  const bars = svg.selectAll("rect").data(bins);

  // Remove old bars
  bars
    .exit()
    .transition()
    .duration(750)
    .attr("y", height)
    .attr("height", 0)
    .remove();

  // Update existing bars
  bars
    .transition()
    .duration(750)
    .attr("x", (d) => x(d.x0))
    .attr("y", (d) => y(d.length))
    .attr("width", (d) => x(d.x1) - x(d.x0) - 1)
    .attr("height", (d) => height - y(d.length))
    .attr("fill", getBarColor());

  // Add new bars
  bars
    .enter()
    .append("rect")
    .attr("x", (d) => x(d.x0))
    .attr("y", height)
    .attr("width", (d) => x(d.x1) - x(d.x0) - 1)
    .attr("height", 0)
    .attr("fill", getBarColor())
    .transition()
    .duration(750)
    .attr("y", (d) => y(d.length))
    .attr("height", (d) => height - y(d.length));

  // Update tooltip
  svg
    .selectAll("rect")
    .on("mouseover", (event, d) =>
      tooltip.style("visibility", "visible").html(
        `Count: ${d.length}<br>
           Range: ${d.x0.toFixed(2)} - ${d.x1.toFixed(2)}`
      )
    )
    .on("mousemove", (event) =>
      tooltip
        .style("top", `${event.pageY - 10}px`)
        .style("left", `${event.pageX + 10}px`)
    )
    .on("mouseout", () => tooltip.style("visibility", "hidden"));

  // Store current bins for next comparison
  window.previousBins = bins;
}
