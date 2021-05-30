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
  console.log(dates)

  const mobile = window.innerWidth < 768;
  let margin;

  if (mobile) {
    margin = {top: 30, right: 20, bottom: 20, left: 100};
  } else {
    margin = {top: 40, right: 15, bottom: 40, left: 15};
  }

  const pathOpacity = 0.3;
  const circleOpacity = 0.9;
  const backOpacity = 0.3;
  const circleRadius = 2.5;

  addPlot = (container, month) => {
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
      .domain([-80, 30]);
    const yScale = d3.scaleLinear()
      .range([height - margin.bottom, 0])
      .domain([-20, 50]);
    const line = d3.line()
      .curve(d3.curveNatural)
      .x(d => xScale(d[xVar]))
      .y(d => yScale(d[yVar]));
    const xAxis = d3.axisBottom()
      .scale(xScale)
      .tickValues(d3.range(-80, 40, 20));
    const yAxis = d3.axisLeft()
      .scale(yScale)
      .tickValues(d3.range(-20, 60, 20));

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

    getColor = (d, idx) => {
      return d.values[idx].moving_closer ? "#00a7c0" : '#f04e33'
    }

    const title = g.append("g")
      .selectAll("text")
      .data([dates[month-1]])
      .join("text")
        .attr("class", "plot-title")
        .text(d => formatTime(d))

    const path = g.append("g")
      .selectAll("path")
      .data(data.countries)
      .join("path")
        .attr("class", "country-line")
        .attr("stroke-opacity", pathOpacity)

    const circle = g.append("g")
      .selectAll("circle")
      .data(data.countries)
      .join("circle")
        .attr("class", "country-circle")
        .attr("fill", d => getColor(d, d.values.length - 1))
        .attr("r", circleRadius);

    const cells = g.append("g")
      .attr("class", "voronoiWrapper")
       .selectAll("path")
       .data(data.countries)
       .join("path")
          .attr("opacity", 0.5)
          .attr("fill", "none")
          .style("pointer-events", "all")

    updatePlot = (idx) => {
      path.transition().duration(200)
        .attr("stroke", d => getColor(d, idx))
        .attr("d", d => line(d.values.slice(idx - trail, idx + 1)));

      circle.transition().duration(200)
        .attr("fill", d =>  getColor(d, idx))
        .attr("cx", d => xScale(d.values[idx][xVar]))
        .attr("cy", d => yScale(d.values[idx][yVar]))

      voronoi = d3.Delaunay
        .from(data.countries, d => xScale(d.values[idx][xVar]), d => yScale(d.values[idx][yVar]))
        .voronoi([margin.left, margin.top, width - margin.right, height - margin.bottom]);
      cells.attr("d", (d,i) => voronoi.renderCell(i))
        .on("mouseover", (event, d) => {
          path.filter(c => c.name !== d.name)
            .attr("stroke", "lightgray")
            .attr("opacity", backOpacity);
          path.filter(c => c.name === d.name)
            .attr("stroke", c =>  getColor(c, idx))
            .attr("stroke-opacity", circleOpacity);

          circle.filter(c => c.name !== d.name)
            .attr("fill", "lightgray")
            .attr("stroke-opacity", backOpacity);

          tooltip
            .attr("transform", `translate(${xScale(d.values[idx][xVar]) + margin.left + tooltipMargin}, ${yScale(d.values[idx][yVar]) + margin.top})`)
            .call(callout, `${d.name}`);
        })
        .on("mouseleave", (event, d) => {
          path.attr("stroke", d =>  getColor(d, idx))
            .attr("stroke-opacity", pathOpacity);
          circle.attr("fill", d =>  getColor(d, idx))
            .attr("opacity", circleOpacity);
          tooltip.call(callout, null)
        });
      }

      // Initial drawing at last date
      updatePlot(month);
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



    // // slider
    // const slider = d3.sliderHorizontal()
    //   .min(trail)
    //   .max(dates.length)
    //   .step(1)
    //   .width(300)
    //   .displayValue(false)
    //   .default(dates.length)
    //   // .tickFormat(dates.map(d => formatTime(d)))
    //   .on('onchange', val => {
    //     updatePlot(val);
    //   })
    //
    // d3.select('#slider')
    //   .append('svg')
    //   .attr('width', 500)
    //   .attr('height', 100)
    //   .append('g')
    //   .attr('transform', 'translate(30,30)')
    //   .call(slider);

})
