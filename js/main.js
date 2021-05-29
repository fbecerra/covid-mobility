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

  const mobile = window.innerWidth < 768;
  let margin;

  if (mobile) {
    margin = {top: 30, right: 20, bottom: 20, left: 100};
  } else {
    margin = {top: 60, right: 20, bottom: 80, left: 180};
  }

  const width = window.innerWidth - margin.left - margin.right,
        height = window.innerHeight - margin.top - margin.bottom;

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

  const path = g.append("g")
    .selectAll("path")
    .data(data.countries)
    .join("path")
      .attr("class", "country-line")
      .attr("stroke", d =>  d.values[d.values.length - 1].moving_closer ? "#00a7c0" : '#f04e33')
      .attr("d", d => line(d.values.slice(d.values.length - 3, d.values.length)));

  const circle = g.append("g")
    .selectAll("circle")
    .data(data.countries)
    .join("circle")
      .attr("class", "country-circle")
      .attr("fill", d =>  d.values[d.values.length - 1].moving_closer ? "#00a7c0" : '#f04e33')
      .attr("cx", d => xScale(d.values[d.values.length - 1][xVar]))
      .attr("cy", d => yScale(d.values[d.values.length - 1][yVar]))
      .attr("r", 5);



})
