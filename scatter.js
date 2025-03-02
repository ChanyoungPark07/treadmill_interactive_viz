import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

// Define dimensions and margins for the chart
const width = 1000,
  height = 600,
  margin = { top: 70, right: 120, bottom: 70, left: 80 };

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

// Create tooltip
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

// Add chart title
svg
  .append("text")
  .attr("class", "chart-title")
  .attr("x", innerWidth / 2)
  .attr("y", -40)
  .attr("text-anchor", "middle")
  .attr("font-size", "20px")
  .attr("font-weight", "bold")
  .text("Average Respiratory Exchange Ratio Over Time and Speed");

// Add axes labels
svg
  .append("text")
  .attr("class", "x-label")
  .attr("x", innerWidth / 2)
  .attr("y", innerHeight + 40)
  .attr("text-anchor", "middle")
  .attr("font-size", "12px")
  .text("Time (seconds)");

svg
  .append("text")
  .attr("class", "y-label")
  .attr("transform", "rotate(-90)")
  .attr("x", -innerHeight / 2)
  .attr("y", -50)
  .attr("text-anchor", "middle")
  .attr("font-size", "12px")
  .text("Speed (km/h)");

// Set background color like in the Python plot
svg
  .append("rect")
  .attr("width", innerWidth)
  .attr("height", innerHeight)
  .attr("fill", "#EAEAF2");

// Load data and create visualization
d3.csv("merged.csv")
  .then((data) => {
    console.log("Raw data sample:", data.slice(0, 3));

    // Filter and parse numeric values
    data = data.filter((d) => d && typeof d === "object");

    data.forEach((d) => {
      d.RER = +d.RER;
      d.time = +d.time || +d.Time || 0; // Try different column names for time
      d.Speed = +d.Speed;
    });

    // Filter out invalid entries
    data = data.filter(
      (d) => !isNaN(d.RER) && !isNaN(d.time) && !isNaN(d.Speed)
    );

    console.log("Filtered data count:", data.length);

    if (data.length === 0) {
      svg
        .append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight / 2)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .text("No valid data available for visualization");
      return;
    }

    // Create time bins (30 second intervals)
    const timeMax = d3.max(data, (d) => d.time);
    const timeBinSize = 30;
    const timeBins = d3.range(0, timeMax + timeBinSize, timeBinSize);

    // Create speed bins (0.5 km/h intervals)
    const speedMin = Math.floor(d3.min(data, (d) => d.Speed));
    const speedMax = Math.ceil(d3.max(data, (d) => d.Speed));
    const speedBinSize = 0.5;
    const speedBins = d3.range(speedMin, speedMax + speedBinSize, speedBinSize);

    // Bin the data
    data.forEach((d) => {
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
        data,
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

    console.log("Binned data sample:", binnedData.slice(0, 5));

    // Set up scales
    const xScale = d3
      .scaleLinear()
      .domain([0, d3.max(binnedData, (d) => d.time_bin) + timeBinSize / 2])
      .range([0, innerWidth]);

    const yScale = d3
      .scaleLinear()
      .domain([speedMin, speedMax])
      .range([innerHeight, 0]);

    // Create color scale for RER values
    // Using RdYlBu_r colormap (reversed Red-Yellow-Blue)
    const rerExtent = d3.extent(binnedData, (d) => d.RER);

    const colorScale = d3
      .scaleSequential()
      .domain([rerExtent[0], rerExtent[1]])
      .interpolator(d3.interpolateRdYlBu)
      .clamp(true);

    // Reverse the color scale to match RdYlBu_r in Python
    const reversedColorScale = (d) =>
      colorScale(rerExtent[1] - (d - rerExtent[0]));

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

    // Add grid
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

    // Add scatter plot points
    svg
      .selectAll(".point")
      .data(binnedData)
      .enter()
      .append("circle")
      .attr("class", "point")
      .attr("cx", (d) => xScale(d.time_bin))
      .attr("cy", (d) => yScale(d.speed_bin))
      .attr("r", (d) => Math.min(10, 5 + Math.sqrt(d.count))) // Larger radius for bins with more data points
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
      .on("mouseout", function () {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("r", (d) => Math.min(10, 5 + Math.sqrt(d.count)))
          .attr("opacity", 0.8);

        tooltip.style("visibility", "hidden");
      });

    // Add color legend
    const legendWidth = 30;
    const legendHeight = innerHeight;

    const legendScale = d3
      .scaleLinear()
      .domain(rerExtent)
      .range([legendHeight, 0]);

    const legendAxis = d3
      .axisRight(legendScale)
      .ticks(8)
      .tickFormat(d3.format(".2f"));

    const legend = svg
      .append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${innerWidth + 40}, 0)`);

    // Create gradient for legend
    const defs = svg.append("defs");

    const linearGradient = defs
      .append("linearGradient")
      .attr("id", "rer-gradient")
      .attr("x1", "0%")
      .attr("y1", "100%")
      .attr("x2", "0%")
      .attr("y2", "0%");

    // Add color stops to match the RdYlBu_r colormap
    const colorStops = d3.range(0, 1.01, 0.1).map((t) => {
      const rer = d3.quantile(rerExtent, t);
      return {
        offset: `${t * 100}%`,
        color: reversedColorScale(rer),
      };
    });

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
  })
  .catch((error) => {
    console.error("Error loading or processing data:", error);
    svg
      .append("text")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight / 2)
      .attr("text-anchor", "middle")
      .attr("font-size", "16px")
      .text("Error loading data: " + error.message);
  });
