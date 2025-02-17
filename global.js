import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

const margin = { top: 20, right: 30, bottom: 50, left: 50 },
  width = 800 - margin.left - margin.right,
  height = 500 - margin.top - margin.bottom;

const svg = d3
  .select("svg")
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

const tooltip = d3
  .select("body")
  .append("div")
  .attr("class", "tooltip")
  .style("position", "absolute")
  .style("visibility", "hidden")
  .style("background", "white")
  .style("padding", "5px")
  .style("border", "1px solid #ddd");

// Add
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

  drawHistogram(data);
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

    drawHistogram(filtered);
  }

  ageSelect.on("change", updateFilters);
  sexSelect.on("change", updateFilters);
  weightSelect.on("change", updateFilters);
  heightSelect.on("change", updateFilters);
  temperatureSelect.on("change", updateFilters);
  speedSelect.on("change", updateFilters);
  restingSelect.on("change", updateFilters);
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

function drawHistogram(data) {
  svg.selectAll("*").remove();

  const x = d3
    .scaleLinear()
    .domain(d3.extent(data, (d) => d.RER))
    .range([0, width]);

  const histogram = d3
    .bin()
    .value((d) => d.RER)
    .domain(x.domain())
    .thresholds(x.ticks(30));

  const bins = histogram(data);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(bins, (d) => d.length)])
    .nice()
    .range([height, 0]);

  svg
    .append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x));

  svg.append("g").call(d3.axisLeft(y));

  svg
    .selectAll("rect")
    .data(bins)
    .enter()
    .append("rect")
    .attr("x", (d) => x(d.x0))
    .attr("y", (d) => y(d.length))
    .attr("width", (d) => x(d.x1) - x(d.x0) - 1)
    .attr("height", (d) => height - y(d.length))
    .attr("fill", "#69b3a2")
    .on("mouseover", (event, d) =>
      tooltip
        .style("visibility", "visible")
        .html(
          `Count: ${d.length}<br>Range: ${d.x0.toFixed(2)} - ${d.x1.toFixed(2)}`
        )
    )
    .on("mousemove", (event) =>
      tooltip
        .style("top", `${event.pageY - 10}px`)
        .style("left", `${event.pageX + 10}px`)
    )
    .on("mouseout", () => tooltip.style("visibility", "hidden"));
}
