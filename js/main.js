const xVar = 'workplaces_percent_change_from_baseline',
      yVar = 'residential_percent_change_from_baseline';

Promise.all([d3.json("data/weekly_mobility.json")]).then(function(mobility){

  const data = mobility[0];

  console.log(data);

  const parseTime = d3.timeParse("%Y-%m-%d"),
        formatTime = d3.timeFormat("%B %d, %Y");

  data.countries.forEach(d => {
    d.values.forEach(v => {
      v.date = parseTime(v.start_date);
    })
  })

  const trail = 1;
  const dates = data.countries[0].values.map(d => d.date);

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
  const tooltipMargin = 10;

  class Plot {
    constructor(container, dateIdx, mode){
      this.container = container;
      this.dateIdx = dateIdx;
      this.mode = mode;
    }


    addPlot() {
      const vis = this;
      const container = vis.container;
      const dateIdx = vis.dateIdx;
      const mode = vis.mode;

      const isStatic = mode === 'static';

      let factor;
      if (isStatic) {
        factor = 1.3;
      } else {
        factor = 1.0;
      }

      const containerRect = container.node().getBoundingClientRect();
      const ratio = window.innerWidth / window.innerHeight;
      const width = containerRect.width - margin.left - margin.right,
            height = containerRect.width / ratio * factor - margin.top - margin.bottom;
      vis.width = width;
      vis.height = height;

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

      vis.xScale = d3.scaleLinear()
        .range([margin.left, width - margin.right]);
      vis.yScale = d3.scaleLinear()
        .range([height - margin.bottom, 0]);

      if (isStatic) {
        vis.xScale.domain([-80, 20]);
        vis.yScale.domain([-15, 45]);
      } else {
        vis.xScale.domain([-90, 40]);
        vis.yScale.domain([-20, 50]);
      }

      vis.line = d3.line()
        .x(d => vis.xScale(d[xVar]))
        .y(d => vis.yScale(d[yVar]));
      const xAxis = d3.axisBottom()
        .scale(vis.xScale)
        .tickValues(d3.range(-80, 40, 20));
      const yAxis = d3.axisLeft()
        .scale(vis.yScale)
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

      vis.tooltip = svg.append("g")
        .attr("class", "viz-tooltip");

      vis.callout = (g, value) => {
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

      vis.title = svg.append("g")
        .attr("transform", `translate(0, ${margin.top/2})`)
        .selectAll("text")
        .data([dates[dateIdx]])
        .join("text")
          .attr("class", "plot-title")
          .text(d => `Week of ${formatTime(d)}`)

      vis.path = g.append("g")
        .selectAll("path")
        .data(data.countries)
        .join("path")
          .attr("class", "country-line");

      vis.circle = g.append("g")
        .selectAll("circle")
        .data(data.countries)
        .join("circle")
          .attr("class", "country-circle")
          .attr("r", circleRadius);

      vis.cells = g.append("g")
        .attr("class", "voronoiWrapper")
         .selectAll("path")
         .data(data.countries)
         .join("path")
            .attr("opacity", 0.5)
            .attr("fill", "none")
            .style("pointer-events", "all")

      vis.path
        .classed("closer", d => d.values[dateIdx].moving_closer)
        .transition().duration(200)
        .attr("d", d => vis.line(d.values.slice(dateIdx - trail, dateIdx + 1)));

      vis.circle.classed("closer", d => d.values[dateIdx].moving_closer)
        .transition().duration(200)
        .attr("cx", d => vis.xScale(d.values[dateIdx][xVar]))
        .attr("cy", d => vis.yScale(d.values[dateIdx][yVar]))

      const voronoi = d3.Delaunay
        .from(data.countries, d => vis.xScale(d.values[dateIdx][xVar]), d => vis.yScale(d.values[dateIdx][yVar]))
        .voronoi([margin.left, margin.top, width - margin.right, height - margin.bottom]);
      vis.cells.attr("d", (d,i) => voronoi.renderCell(i))
        .on("mouseover", (event, d) => {
          if (isStatic) {
            let allPaths = d3.select("body").selectAll(".country-line"),
              allCircles = d3.select("body").selectAll(".country-circle");

            allPaths.classed("hidden", c => c.name !== d.name);
            allPaths.filter(c => c.name === d.name)
              .classed("highlighted", true);

            allCircles.classed("hidden", c => c.name !== d.name);
            allCircles.filter(c => c.name === d.name)
              .classed("highlighted", true);
          } else {
            vis.path.classed("hidden", c => c.name !== d.name);
            vis.path.filter(c => c.name === d.name)
              .classed("highlighted", true);

            vis.circle.classed("hidden", c => c.name !== d.name);
            vis.circle.filter(c => c.name === d.name)
              .classed("highlighted", true);
          }

          vis.tooltip
            .attr("transform", `translate(${vis.xScale(d.values[dateIdx][xVar]) + margin.left + tooltipMargin}, ${vis.yScale(d.values[dateIdx][yVar]) + margin.top})`)
            .call(vis.callout, `${d.name}`);
        })
        .on("mouseleave", (event, d) => {
          if (isStatic) {
            let allPaths = d3.select("body").selectAll(".country-line"),
              allCircles = d3.select("body").selectAll(".country-circle");

            allPaths.classed("hidden", false)
              .classed("highlighted", false);
            allCircles.classed("hidden", false)
              .classed("highlighted", false);
          } else {
            vis.path.classed("hidden", false)
              .classed("highlighted", false);
            vis.circle.classed("hidden", false)
              .classed("highlighted", false);
          }

          vis.tooltip.call(vis.callout, null);
        });
      }

      updatePlot(idx) {
        const vis = this;
        const xScale = vis.xScale;
        const yScale = vis.yScale;
        const width = vis.width;
        const height = vis.height;

        vis.title.data([dates[idx]])
          .join("text")
            .text(d => `Week of ${formatTime(d)}`)

        vis.path
          .classed("closer", d => d.values[idx].moving_closer)
          .transition().duration(200)
          .attr("d", d => vis.line(d.values.slice(idx - trail, idx + 1)));

        vis.circle
          .classed("closer", d => d.values[idx].moving_closer)
          .transition().duration(200)
          .attr("cx", d => xScale(d.values[idx][xVar]))
          .attr("cy", d => yScale(d.values[idx][yVar]))

        const voronoi = d3.Delaunay
          .from(data.countries, d => xScale(d.values[idx][xVar]), d => yScale(d.values[idx][yVar]))
          .voronoi([margin.left, margin.top, width - margin.right, height - margin.bottom]);
        vis.cells.attr("d", (d,i) => voronoi.renderCell(i))
          .on("mouseover", (event, d) => {
            vis.path.classed("hidden", c => c.name !== d.name);
            vis.path.filter(c => c.name === d.name)
              .classed("highlighted", true);

            vis.circle.classed("hidden", c => c.name !== d.name);
            vis.circle.filter(c => c.name === d.name)
              .classed("highlighted", true);

            vis.tooltip
              .attr("transform", `translate(${xScale(d.values[idx][xVar]) + margin.left + tooltipMargin}, ${yScale(d.values[idx][yVar]) + margin.top})`)
              .call(vis.callout, `${d.name}`);
          })
          .on("mouseleave", (event, d) => {
            vis.path.classed("hidden", false)
              .classed("highlighted", false);
            vis.circle.classed("hidden", false)
              .classed("highlighted", false);
            vis.tooltip.call(vis.callout, null)
          });
      };
    }

  const svgAnimated = new Plot(d3.select("#viz-animated"), 1, 'animated');
  svgAnimated.addPlot();
  let idx = 0;

  timer = setInterval(() => {
    svgAnimated.updatePlot(idx);
    if (dates.length <= ++idx) {
      idx = 0;
      clearInterval(timer);
    };
  }, 300)

  const vizDiv1 = new Plot(d3.select("#viz-1"), 5, 'static');
  vizDiv1.addPlot()

  const vizDiv2 = new Plot(d3.select("#viz-2"), 23, 'static');
  vizDiv2.addPlot()

  const vizDiv3 = new Plot(d3.select("#viz-3"), 45, 'static');
  vizDiv3.addPlot()

  const vizDiv4 = new Plot(d3.select("#viz-4"), 11, 'static');
  vizDiv4.addPlot()

  const vizDiv5 = new Plot(d3.select("#viz-5"), 25, 'static');
  vizDiv5.addPlot()

  const vizDiv6 = new Plot(d3.select("#viz-6"), 46, 'static');
  vizDiv6.addPlot()
})
