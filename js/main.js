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
    margin = {top: 60, right: 10, bottom: 40, left: 10};
  } else {
    margin = {top: 60, right: 15, bottom: 40, left: 15};
  }

  const pathOpacity = 0.3;
  const circleOpacity = 0.9;
  const backOpacity = 0.3;
  const circleRadius = 2.5;
  const tooltipMargin = 10;

  class Plot {
    constructor(container, dateIdx, mode, subtitle, nLines){
      this.container = container;
      this.dateIdx = dateIdx;
      this.mode = mode;
      this.subtitle = subtitle;
      this.nLines = nLines;
    }

    addPlot() {
      const vis = this;
      const container = vis.container;
      const dateIdx = vis.dateIdx;
      const mode = vis.mode;

      const isStatic = mode === 'static';

      let factor;
      if (isStatic) {
        if (mobile){
          factor = 0.5;
        } else {
          factor = 1.3;
        }
      } else {
        factor = 1.0;
      }

      const containerRect = container.node().getBoundingClientRect();
      const ratio = window.innerWidth / window.innerHeight;
      // const ratio = 1280. / 800.;
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

      gXAxis.call(xAxis)
        .call(g => g.append("text")
          .attr("x", width / 2)
          .attr("y", margin.bottom - 4)
          .attr("class", "axis-label")
          .attr("text-anchor", "middle")
          .text("Change in time spent at workplace, % points"));;
      gYAxis.call(yAxis)
        .call(g => g.append("text")
          .attr("x", -margin.left)
          .attr("y", 0)
          .attr("class", "axis-label")
          .attr("text-anchor", "start")
          .text("Change in time spent in residential areas, % points"))

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

      vis.callout = (g, value, nLines) => {
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
              .style("font-weight", (_, i) => i < nLines ? "700" : "300")
              .text(d => d));
      }

      vis.title = svg.append("g")
        .attr("transform", "translate(0, 16)")
        .call(vis.callout, `${vis.subtitle} \n Week of ${formatTime(dates[dateIdx])}`, vis.nLines);

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
            .attr("opacity", 1.0)
            .attr("fill", "none")
            .style("pointer-events", "all")

      vis.path
        .classed("closer", d => d.values[dateIdx].improving)
        .transition().duration(200)
        .attr("d", d => vis.line(d.values.slice(dateIdx - trail, dateIdx + 1)));

      vis.circle.classed("closer", d => d.values[dateIdx].improving)
        .transition().duration(200)
        .attr("cx", d => vis.xScale(d.values[dateIdx][xVar]))
        .attr("cy", d => vis.yScale(d.values[dateIdx][yVar]))

      if (!isStatic){
        let xPos, xOffset;
        if (mobile) {
          xPos = vis.xScale(-60);
          xOffset = 5;
        } else {
          xPos = vis.xScale(0);
          xOffset = 10;
        }
        const legend = g.append("g")
          .attr("transform", `translate(${xPos + xOffset},0)`);
        legend.selectAll("legend-line")
          .data([0, 1])
          .join("line")
            .attr("class", "legend-line")
            .classed("closer", d => d)
            .attr("x1", 0)
            .attr("y1", (_, i) => (i + 1) * 18)
            .attr("x2", 40)
            .attr("y2", (_, i) => (i + 1) * 18);

        legend.selectAll(".legend-circle")
          .data([0, 1])
          .join("circle")
            .attr("class", "legend-circle")
            .classed("closer", d => d)
            .attr("cx", 40)
            .attr("cy", (_, i) => (i + 1) * 18)
            .attr("r", circleRadius);

        legend.selectAll(".legend-text")
          .data(["moving towards more time at workplace", "moving towards less time at workplace"])
          .join("text")
            .attr("class", "legend-text")
            .classed("closer", d => d)
            .attr("x", 45)
            .attr("y", (_, i) => (i + 1) * 18 + 3)
            .text(d => d);
      }

      const voronoi = d3.Delaunay
        .from(data.countries, d => vis.xScale(d.values[dateIdx][xVar]), d => vis.yScale(d.values[dateIdx][yVar]))
        .voronoi([margin.left, 0, width - margin.right, height - margin.bottom]);
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

          vis.tooltip.call(vis.callout, `${d.name}`, 1);
          let tooltipWidth = vis.tooltip.node().getBoundingClientRect().width;
          let xPos = vis.xScale(d.values[dateIdx][xVar]) + margin.left + tooltipMargin;
          if (xPos + tooltipWidth >= width - margin.right) {
            vis.tooltip.attr("transform", `translate(${vis.xScale(d.values[dateIdx][xVar]) + margin.left - tooltipWidth - tooltipMargin}, ${vis.yScale(d.values[dateIdx][yVar]) + margin.top})`)
          } else {
            vis.tooltip.attr("transform", `translate(${vis.xScale(d.values[dateIdx][xVar]) + margin.left + tooltipMargin}, ${vis.yScale(d.values[dateIdx][yVar]) + margin.top})`)
          }
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

          vis.tooltip.call(vis.callout, null, 0);
        });
      }

      updatePlot(idx) {
        const vis = this;
        const xScale = vis.xScale;
        const yScale = vis.yScale;
        const width = vis.width;
        const height = vis.height;

        vis.title
          .call(vis.callout, `${vis.subtitle} \n Week of ${formatTime(dates[idx])}`, vis.nLines);

        vis.path
          .classed("closer", d => d.values[idx].improving)
          .transition().duration(200)
          .attr("d", d => vis.line(d.values.slice(idx - trail, idx + 1)));

        vis.circle
          .classed("closer", d => d.values[idx].improving)
          .transition().duration(200)
          .attr("cx", d => xScale(d.values[idx][xVar]))
          .attr("cy", d => yScale(d.values[idx][yVar]))

        const voronoi = d3.Delaunay
          .from(data.countries, d => xScale(d.values[idx][xVar]), d => yScale(d.values[idx][yVar]))
          .voronoi([margin.left, 0, width - margin.right, height - margin.bottom]);
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
              .call(vis.callout, `${d.name}`, 1);
          })
          .on("mouseleave", (event, d) => {
            vis.path.classed("hidden", false)
              .classed("highlighted", false);
            vis.circle.classed("hidden", false)
              .classed("highlighted", false);
            vis.tooltip.call(vis.callout, null, 0);
          });
      };
    }

  let animatedTitle, nLines;
  if (mobile) {
    animatedTitle = 'Change in time spent at workplace v \n change in time spent in residential areas';
    nLines = 2;
  } else {
    animatedTitle = 'Change in time spent at workplace v change in time spent in residential areas';
    nLines = 1
  }

  const svgAnimated = new Plot(d3.select("#viz-animated"), 1, 'animated', animatedTitle, nLines);
  svgAnimated.addPlot();
  let idx = 0;

  timer = setInterval(() => {
    svgAnimated.updatePlot(idx);
    if (dates.length <= ++idx) {
      idx = 0;
      clearInterval(timer);
    };
  }, 300)

  // Spikes
  const lockdownStart = new Plot(d3.select("#viz-1"), 5, 'static', 'First lockdown', 1);
  lockdownStart.addPlot()

  const lockdownEnd = new Plot(d3.select("#viz-2"), 11, 'static', '', 0);
  lockdownEnd.addPlot()

  // Holidays
  const summerStart = new Plot(d3.select("#viz-7"), 23, 'static', 'Summer in the Northern Hemisphere', 1);
  summerStart.addPlot()

  const christmasStart = new Plot(d3.select("#viz-8"), 45, 'static', 'Christmas', 1);
  christmasStart.addPlot()

  const easterStart = new Plot(d3.select("#viz-9"), 58, 'static', 'Easter', 1);
  easterStart.addPlot()

  const summerEnd = new Plot(d3.select("#viz-10"), 25, 'static', '', 0);
  summerEnd.addPlot()

  const christmasEnd = new Plot(d3.select("#viz-11"), 46, 'static', '', 0);
  christmasEnd.addPlot()

  const easterEnd = new Plot(d3.select("#viz-12"), 60, 'static', '', 0);
  easterEnd.addPlot()
})
