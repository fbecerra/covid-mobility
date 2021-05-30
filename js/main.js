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
    margin = {top: 60, right: 20, bottom: 80, left: 180};
  }

  const width = window.innerWidth - margin.left - margin.right,
        height = window.innerHeight - margin.top - margin.bottom;

  const pathOpacity = 0.3;

  const svg = d3.select("#viz").append("svg")
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
    .domain([data.params['min_'+xVar], data.params['max_'+xVar]]);
  const yScale = d3.scaleLinear()
    .range([height - margin.bottom, 0])
    .domain([data.params['min_'+yVar], data.params['max_'+yVar]]);
  const line = d3.line()
    .curve(d3.curveNatural)
    .x(d => xScale(d[xVar]))
    .y(d => yScale(d[yVar]));
  const xAxis = d3.axisBottom()
    .scale(xScale);
  const yAxis = d3.axisLeft()
    .scale(yScale);

  gXAxis.call(xAxis);
  gYAxis.call(yAxis);

  const tooltipMargin = 10;
  const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0)
    .style("max-width", margin.left * 4/3 + "px");

  getColor = (d, idx) => {
    return d.values[idx].moving_closer ? "#00a7c0" : '#f04e33'
  }

  const path = g.append("g")
    .selectAll("path")
    .data(data.countries)
    .join("path")
      .attr("class", "country-line")
      .attr("id", d => `${d.name}-line`)

  const circle = g.append("g")
    .selectAll("circle")
    .data(data.countries)
    .join("circle")
      .attr("class", "country-circle")
      .attr("fill", d => getColor(d, d.values.length - 1))
      .attr("r", 5);

  updatePlot = (idx) => {
    path.transition().duration(200)
    .attr("stroke", d => getColor(d, idx))
    .attr("d", d => line(d.values.slice(idx - trail, idx + 1)));

    circle.transition().duration(200)
      .attr("fill", d =>  getColor(d, idx))
      .attr("cx", d => xScale(d.values[idx][xVar]))
      .attr("cy", d => yScale(d.values[idx][yVar]))

    circle.on("mouseover", (event, d) => {
        path.filter(c => c.name !== d.name)
          .attr("stroke", "lightgray")
          .attr("opacity", pathOpacity);
        path.filter(c => c.name === d.name)
          .attr("stroke", c =>  getColor(c, idx))

        circle.filter(c => c.name !== d.name)
          .attr("fill", "lightgray")
          .attr("opacity", pathOpacity);

        tooltip.html(`<p><strong>${d.name}</strong></p>`)

        tooltip.style("left", `${event.pageX + tooltipMargin}px`)
          .style("top", `${event.pageY}px`)
          .transition().duration(200)
          .style("opacity", 1.0)

      })
      .on("mouseleave", (event, d) => {
        path.attr("stroke", d =>  getColor(d, idx))
        circle.attr("fill", d =>  getColor(d, idx))
          .attr("opacity", 1.0);
        tooltip.transition().duration(200)
          .style("opacity", 0.0)
      });
    }

    // Initial drawing at last date
    updatePlot(dates.length);

    // slider
    const slider = d3.sliderHorizontal()
      .min(trail)
      .max(dates.length)
      .step(1)
      .width(300)
      .displayValue(false)
      .default(dates.length)
      // .tickFormat(dates.map(d => formatTime(d)))
      .on('onchange', val => {
        updatePlot(val);
      })

    d3.select('#slider')
      .append('svg')
      .attr('width', 500)
      .attr('height', 100)
      .append('g')
      .attr('transform', 'translate(30,30)')
      .call(slider);

})
