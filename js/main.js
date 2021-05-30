Promise.all([d3.json("data/mobility.json")]).then(function(mobility){

  const data = mobility[0];

  console.log(data);

  const parseTime = d3.timeParse("%Y-%m"),
        formatTime = d3.timeFormat("%B, %Y");

  data.countries.forEach(d => {
    d.values.forEach(v => {
      v.date = parseTime(v.date);
    })
  })

  const trail = 2;
  const dates = data.countries[0].values.map(d => d.date).slice(trail);

  const mobile = window.innerWidth < 768;
  let margin;

  if (mobile) {
    margin = {top: 30, right: 20, bottom: 20, left: 100};
  } else {
    margin = {top: 50, right: 15, bottom: 40, left: 15};
  }

  const pathOpacity = 0.3;
  const circleOpacity = 0.9;
  const backOpacity = 0.3;
  const circleRadius = 2.5;

  addPlot = (container, dateIdx) => {
    const containerRect = container.node().getBoundingClientRect();
    const ratio = window.innerWidth / window.innerHeight;
    const width = containerRect.width - margin.left - margin.right,
          height = containerRect.width / ratio * 1.3 - margin.top - margin.bottom;

    const svg = container.append("svg")
      .attr("viewBox", [0, 0, width + margin.left + margin.right, height + margin.top + margin.bottom])
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);

    const g = svg.append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    const gXAxis = svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(" + margin.left + "," + (margin.top + height - margin.bottom) + ")");
    const gYAxis = svg.append("g")
      .attr("class", "y axis")
      .attr("transform", "translate(" + (2 * margin.left) + "," + margin.top + ")");

    const xVar = 'workplaces_percent_change_from_baseline',
          yVar = 'residential_percent_change_from_baseline';

    const xScale = d3.scaleLinear()
      .range([margin.left, width - margin.right])
      .domain([-80, 20]);
    const yScale = d3.scaleLinear()
      .range([height - margin.bottom, 0])
      .domain([-15, 45]);
    const line = d3.line()
      .curve(d3.curveNatural)
      .x(d => xScale(d[xVar]))
      .y(d => yScale(d[yVar]));
    const xAxis = d3.axisBottom()
      .scale(xScale)
      .tickValues(d3.range(-80, 40, 20));
    const yAxis = d3.axisLeft()
      .scale(yScale)
      .tickValues(d3.range(-0, 60, 20));

    gXAxis.call(xAxis);
    gYAxis.call(yAxis);

    gXAxis.selectAll(".domain").remove();
    gXAxis.selectAll(".tick line")
      .attr("stroke-opacity", 0.1)
      .attr("class", "axis-line")
      .attr("y2", margin.bottom - height);

    gYAxis.selectAll(".domain").remove();
    gYAxis.selectAll(".tick line")
      .attr("stroke-opacity", 0.1)
      .attr("class", "axis-line")
      .attr("x2", width - margin.right - margin.left);

    const tooltipMargin = 10;
    const tooltip = svg.append("g")
      .attr("class", "viz-tooltip");

    callout = (g, value) => {
      if (!value) return g.style("display", "none");

      g.style("display", null)
        .style("pointer-events", "none")

      const text = g.selectAll("text")
        .data([null])
        .join("text")
        .call(text => text
          .selectAll("tspan")
          .data((value + "").split(/\n/))
          .join("tspan")
            .attr("x", 0)
            .attr("y", (d, i) => `${i * 1.1}em`)
            .style("font-weight", (_, i) => i ? null : "600")
            .text(d => d));
    }

    let voronoi;

    const title = svg.append("g")
      .attr("transform", `translate(0, ${margin.top/2})`)
      .selectAll("text")
      .data([dates[dateIdx-1]])
      .join("text")
        .attr("class", "plot-title")
        .text(d => formatTime(d))

    const path = g.append("g")
      .selectAll("path")
      .data(data.countries)
      .join("path")
        .attr("class", "country-line");

    const circle = g.append("g")
      .selectAll("circle")
      .data(data.countries)
      .join("circle")
        .attr("class", "country-circle")
        .attr("r", circleRadius);

    const cells = g.append("g")
      .attr("class", "voronoiWrapper")
       .selectAll("path")
       .data(data.countries)
       .join("path")
          .attr("opacity", 0.5)
          .attr("fill", "none")
          .style("pointer-events", "all")

    path
      .classed("closer", d => d.values[dateIdx].moving_closer)
      .transition().duration(200)
      .attr("d", d => line(d.values.slice(dateIdx - trail, dateIdx + 1)));

    circle.classed("closer", d => d.values[dateIdx].moving_closer)
      .transition().duration(200)
      .attr("cx", d => xScale(d.values[dateIdx][xVar]))
      .attr("cy", d => yScale(d.values[dateIdx][yVar]))

    voronoi = d3.Delaunay
      .from(data.countries, d => xScale(d.values[dateIdx][xVar]), d => yScale(d.values[dateIdx][yVar]))
      .voronoi([margin.left, margin.top, width - margin.right, height - margin.bottom]);
    cells.attr("d", (d,i) => voronoi.renderCell(i))
      .on("mouseover", (event, d) => {
        let allPaths = d3.select("body").selectAll(".country-line"),
          allCircles = d3.select("body").selectAll(".country-circle");

        allPaths.classed("hidden", c => c.name !== d.name);
        allPaths.filter(c => c.name === d.name)
          .classed("highlighted", true);

        allCircles.classed("hidden", c => c.name !== d.name);
        allCircles.filter(c => c.name === d.name)
          .classed("highlighted", true);

        tooltip
          .attr("transform", `translate(${xScale(d.values[dateIdx][xVar]) + margin.left + tooltipMargin}, ${yScale(d.values[dateIdx][yVar]) + margin.top})`)
          .call(callout, `${d.name}`);
      })
      .on("mouseleave", (event, d) => {
        let allPaths = d3.select("body").selectAll(".country-line"),
          allCircles = d3.select("body").selectAll(".country-circle");

        allPaths.classed("hidden", false)
          .classed("highlighted", false);

        allCircles.classed("hidden", false)
          .classed("highlighted", false);

        tooltip.call(callout, null)
      });
    }

  const vizDiv1 = d3.select("#viz-1");
  addPlot(vizDiv1, 2);

  const vizDiv2 = d3.select("#viz-2");
  addPlot(vizDiv2, 4);

  const vizDiv3 = d3.select("#viz-3");
  addPlot(vizDiv3, 6);

  const vizDiv4 = d3.select("#viz-4");
  addPlot(vizDiv4, 10);

  const vizDiv5 = d3.select("#viz-5");
  addPlot(vizDiv5, 12);

  const vizDiv6 = d3.select("#viz-6");
  addPlot(vizDiv6, 14);
})
