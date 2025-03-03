import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

// Set dimensions and margins
const width = 800,
  height = 500,
  margin = { top: 60, right: 100, bottom: 60, left: 80 };

// Generate sample data for three different groups
const generateData = () => {
  const categories = ["Group A", "Group B", "Group C"];
  const distributions = [
    { mean: 50, sd: 15 }, // Group A
    { mean: 65, sd: 10 }, // Group B
    { mean: 40, sd: 20 }, // Group C
  ];

  let allData = [];
  categories.forEach((category, i) => {
    const dist = distributions[i];
    const categoryData = d3.range(200).map(() => ({
      category: category,
      value: d3.randomNormal(dist.mean, dist.sd)(),
    }));
    allData = allData.concat(categoryData);
  });

  return allData;
};

// Create data
const data = generateData();

// Get unique categories
const categories = [...new Set(data.map((d) => d.category))];

// Create SVG container
const svg = d3
  .select("#violin_plot")
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .append("g")
  .attr("transform", `translate(${margin.left}, ${margin.top})`);

// Set the scales
const xScale = d3
  .scaleBand()
  .domain(categories)
  .range([0, width - margin.left - margin.right])
  .padding(0.3);

// Compute the y scale based on actual data range
const yMin = d3.min(data, (d) => d.value);
const yMax = d3.max(data, (d) => d.value);
const yPadding = (yMax - yMin) * 0.1; // Add 10% padding

const yScale = d3
  .scaleLinear()
  .domain([yMin - yPadding, yMax + yPadding])
  .range([height - margin.top - margin.bottom, 0]);

// Add X axis
svg
  .append("g")
  .attr("transform", `translate(0, ${height - margin.top - margin.bottom})`)
  .call(d3.axisBottom(xScale))
  .attr("font-size", "14px");

// Add Y axis
svg.append("g").call(d3.axisLeft(yScale)).attr("font-size", "12px");

// Add title
svg
  .append("text")
  .attr("x", (width - margin.left - margin.right) / 2)
  .attr("y", -30)
  .attr("text-anchor", "middle")
  .attr("font-size", "18px")
  .attr("font-weight", "bold")
  .text("Distribution Comparison");

// Add X axis label
svg
  .append("text")
  .attr("x", (width - margin.left - margin.right) / 2)
  .attr("y", height - margin.top - margin.bottom + 40)
  .attr("text-anchor", "middle")
  .attr("font-size", "14px")
  .text("Group");

// Add Y axis label
svg
  .append("text")
  .attr("transform", "rotate(-90)")
  .attr("x", -(height - margin.top - margin.bottom) / 2)
  .attr("y", -50)
  .attr("text-anchor", "middle")
  .attr("font-size", "14px")
  .text("Value");

// Kernel density estimation functions
function kernelDensityEstimator(kernel, X) {
  return function (V) {
    return X.map((x) => [x, d3.mean(V, (v) => kernel(x - v))]);
  };
}

function kernelEpanechnikov(bandwidth) {
  return (u) =>
    Math.abs((u /= bandwidth)) <= 1 ? (0.75 * (1 - u * u)) / bandwidth : 0;
}

// Color scale
const colorScale = d3
  .scaleOrdinal()
  .domain(categories)
  .range(["#4682b4", "#d95f02", "#7570b3"]);

// Draw violins for each category
categories.forEach((category) => {
  // Filter data for this category
  const categoryData = data.filter((d) => d.category === category);
  const categoryValues = categoryData.map((d) => d.value);

  // Compute kernel density estimation
  const kde = kernelDensityEstimator(kernelEpanechnikov(7), yScale.ticks(50));
  const density = kde(categoryValues);

  // Find maximum density for width scaling
  const densityMax = d3.max(density, (d) => d[1]);

  // Scale for violin width
  const xViolinScale = d3
    .scaleLinear()
    .domain([0, densityMax])
    .range([0, xScale.bandwidth() / 2]);

  // Calculate statistics
  const mean = d3.mean(categoryValues);
  const median = d3.median(categoryValues);

  // Draw violin shape
  const violinArea = d3
    .area()
    .x0((d) => xScale(category) + xScale.bandwidth() / 2 - xViolinScale(d[1]))
    .x1((d) => xScale(category) + xScale.bandwidth() / 2 + xViolinScale(d[1]))
    .y((d) => yScale(d[0]))
    .curve(d3.curveCatmullRom);

  // Add violin path
  svg
    .append("path")
    .datum(density)
    .attr("class", "violin")
    .attr("d", violinArea)
    .attr("fill", colorScale(category))
    .attr("opacity", 0.8)
    .attr("stroke", "#000")
    .attr("stroke-width", 1)
    .attr("stroke-opacity", 0.3);

  // Add median line
  svg
    .append("line")
    .attr(
      "x1",
      xScale(category) + xScale.bandwidth() / 2 - xScale.bandwidth() / 4
    )
    .attr(
      "x2",
      xScale(category) + xScale.bandwidth() / 2 + xScale.bandwidth() / 4
    )
    .attr("y1", yScale(median))
    .attr("y2", yScale(median))
    .attr("stroke", "#000")
    .attr("stroke-width", 2);

  // Add mean indicator
  svg
    .append("circle")
    .attr("cx", xScale(category) + xScale.bandwidth() / 2)
    .attr("cy", yScale(mean))
    .attr("r", 4)
    .attr("fill", "#fff")
    .attr("stroke", "#000")
    .attr("stroke-width", 1);
});

// Add legend
const legend = svg
  .append("g")
  .attr(
    "transform",
    `translate(${width - margin.left - margin.right + 10}, 0)`
  );

// Add rectangles for each group
categories.forEach((category, i) => {
  legend
    .append("rect")
    .attr("x", 0)
    .attr("y", i * 25)
    .attr("width", 15)
    .attr("height", 15)
    .attr("fill", colorScale(category));

  legend
    .append("text")
    .attr("x", 25)
    .attr("y", i * 25 + 12)
    .attr("font-size", "12px")
    .text(category);
});

// Add legend for statistics
legend
  .append("line")
  .attr("x1", 0)
  .attr("x2", 15)
  .attr("y1", categories.length * 25 + 12)
  .attr("y2", categories.length * 25 + 12)
  .attr("stroke", "#000")
  .attr("stroke-width", 2);

legend
  .append("text")
  .attr("x", 25)
  .attr("y", categories.length * 25 + 15)
  .attr("font-size", "12px")
  .text("Median");

legend
  .append("circle")
  .attr("cx", 7.5)
  .attr("cy", categories.length * 25 + 35)
  .attr("r", 4)
  .attr("fill", "#fff")
  .attr("stroke", "#000")
  .attr("stroke-width", 1);

legend
  .append("text")
  .attr("x", 25)
  .attr("y", categories.length * 25 + 40)
  .attr("font-size", "12px")
  .text("Mean");
