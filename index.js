// Setting up the svg element for D3 to draw in
const width = 800, 
      height = (width * 0.8);

const selectedColor = 'maroon';
const defaultColor = '#063970';

const slider_margin = {top: 10, bottom: 0, left: 20, right: 20}
const slider_width = width;
const slider_height = 70;

const dataTime = d3.range(1700, 1801);
var selectedCity = null;
var selectedCityIsAvailable = false;

const map = d3.select("#map").append("svg")
    .attr("width", width)
    .attr("height", height)
const countryCountainer = map.append('g')
    .attr('id', 'countries')
const cityContainer = map.append('g')
    .attr('id', 'cities')

const playButton = d3.select("#play-button");

const tooltipSvg = map.append('g')
    .attr('id', 'tooltipSvg');
tooltipSvg.append('text')
      .attr('id', 'tooltip-text')
      .attr('fill', 'maroon')
      .attr('text-anchor', 'start');

const tooltip = map.append('g')
  .attr('class', 'tooltip-group')
  .attr('transform', `translate(0,0)`)
  .style('font-size', '14px');
const tooltipLineVertical = tooltip
  .append('line')
    .attr('id', 'tooltip-line-vertical')
    .attr('x1', 0)
    .attr('y1', height)
    .attr('x2', 0)
    .attr('y2', 0)
    .attr('stroke', '#45343D')
    .attr('stroke-dasharray', '16 4')
    .attr('stroke-opacity', 0.3);

const tooltipLineHorizontal = tooltip
  .append('line')
    .attr('id', 'tooltip-line-horizontal')
    .attr('x1', 0)
    .attr('y1', 0)
    .attr('x2', width)
    .attr('y2', 0)
    .attr('stroke', '#45343D')
    .attr('stroke-dasharray', '16 4')
    .attr('stroke-opacity', 0.3);

let minLat = null;
let maxLat = null;
let minLong = null;
let maxLong = null;
let currentScale = null;
let currentTranslate = null;

const sliderTime = d3.sliderBottom()
    .min(d3.min(dataTime))
    .max(d3.max(dataTime))
    .step(1)
    .width(slider_width - (slider_margin.left + slider_margin.right))
    .tickFormat(d => d)
    .default(d3.min(dataTime))
    .on('onchange', val => {
      d3.select('p#value-time').text(val);
      render();
    });

const gTime = d3
    .select('div#slider-time')
    .append('svg')
    .attr('width', slider_width)
    .attr('height', slider_height)
    .append('g')
    .attr('transform', `translate(${slider_margin.left},${slider_margin.top})`);

gTime.call(sliderTime);

d3.select('p#value-time').text(sliderTime.value());

let moving = false;
let timer = null;
let currentValue = d3.min(dataTime);
let targetValue = d3.max(dataTime);

playButton
  .on("click", function() {
    const button = d3.select(this);
    if (button.text() == 'Pause') {
      moving = false;
      clearInterval(timer);
      button.text('Play');
    } else {
      moving = true;
      timer = setInterval(step, 1000);
      button.text('Pause');
    }
  })

const step = () => {
  currentValue = currentValue + 1;
  sliderTime.value(currentValue);
  if (currentValue > targetValue) {
    moving = false;
    currentValue = d3.min(dataTime);
    clearInterval(timer);
    playButton.text('Play');
  }
};

// A projection tells D3 how to orient the GeoJSON features
const europeProjection = d3.geoMercator()
	.center([ 13, 52 ])
  .scale([ width / 1.5 ])
  .translate([ width / 2, height / 2 ])

// The path generator uses the projection to convert the GeoJSON
// geometry to a set of coordinates that D3 can understand
const pathGenerator = d3.geoPath().projection(europeProjection)

// URL to the GeoJSON itself
const geoJsonUrl = 'https://gist.githubusercontent.com/spiker830/3eab0cb407031bf9f2286f98b9d0558a/raw/7edae936285e77be675366550e20f9166bed0ed5/europe_features.json';
const citiesUrl = 'onb-place-time-normalized.csv';

let cities = null;

// Request the GeoJSON
d3.json(geoJsonUrl).then(geojson => {
	// Tell D3 to render a path for each GeoJSON feature
  countryCountainer
    .selectAll('path')
    .data(geojson.features)
    .enter()
    .append('path')
      .attr('d', pathGenerator) // This is where the magic happens
      .attr('stroke', '#ccc') // Color of the lines themselves
      .attr('fill', 'white') // Color uses to fill in the lines
      .attr('fill-opacity', 0)
})

function zoomed(event) {
  const transform = event.transform
  currentScale = transform.k;
  currentTranslate = [transform.x, transform.y];
  countryCountainer.attr('transform', event.transform);
  cityContainer.attr('transform', event.transform);
  tooltipSvg.attr('transform', event.transform);
}

const zoom = d3.zoom()
  .scaleExtent([1, 8])
  .on("zoom", zoomed);

map.call(zoom);

d3.select('#zoom-in').on('click', function(event) {
  zoom.scaleBy(map.transition().duration(750), 1.3);
});

d3.select('#zoom-out').on('click', function(event) {
  zoom.scaleBy(map.transition().duration(750), 1 / 1.3);
});

const cityScale = d3.scaleSqrt()
    .domain([1, 20])
    .range([1, 5]);

d3.csv(citiesUrl).then(data => {
  cities = data.map(city => {
    // city.id = 'id-' + ('x' + city.lat).replace('.', '_') + '-' + ('y' + city.long).replace('.', '_');
    city.id = 'id-' + city.id;
    city.lat = +city.lat;
    city.long = +city.long;
    city.date = +city.date;
    city.n = +city.n;
    return city;
  });
  cityScale.domain([1, d3.max(cities, d => d.n)]);
  minLat = d3.min(cities, d => d.lat);
  maxLat = d3.max(cities, d => d.lat);
  minLong = d3.min(cities, d => d.long);
  maxLong = d3.max(cities, d => d.long);
  const bounds = [europeProjection([minLong, minLat]), europeProjection([maxLong, maxLat])];
  var dx = bounds[1][0] - bounds[0][0],
      dy = bounds[1][1] - bounds[0][1],
      x = (bounds[0][0] + bounds[1][0]) / 2,
      y = (bounds[0][1] + bounds[1][1]) / 2,
      scale = Math.max(1, Math.min(8, 0.9 / Math.max(dx / width, dy / height))),
      translate = [width / 2 - scale * x, height / 2 - scale * y];

  currentScale = scale;
  currentTranslate = translate;
  console.log('currentScale: ' + currentScale);
  console.log('currentTranslate: ' + currentTranslate);

  map.transition()
     .duration(750)
     .call(
       zoom.transform,
       d3.zoomIdentity
         .translate(translate[0], translate[1]).scale(scale)
     );

  render();
});

function render() {
  const selectedCities = cities.filter(d => d.date == sliderTime.value());
  selectedCityIsAvailable = selectedCities.filter(d => d.id == selectedCity).length > 0;
  const bookNr = selectedCities.reduce((sum, d) => {return sum + d.n}, 0);

  d3.select('p#value-time')
    .html(`${sliderTime.value()}: ${bookNr} books published in ${selectedCities.length} locations`);

  d3.select('#city-list').html(cityList(selectedCities));

  cityContainer
    .selectAll('circle.city')
    .data(selectedCities, d => d.id)
    .join('circle')
      .attr('class', 'city')
      .attr('id', d => d.id)
      .attr('cx', d => europeProjection([d.long, d.lat])[0])
      .attr('cy', d => europeProjection([d.long, d.lat])[1])
      .attr('r', d => cityScale(d.n))
      .attr('title', d => d.city + ': ' + d.n)
      .attr('fill', d => {
        return (d.id == selectedCity) ? selectedColor : defaultColor;
      })
      .attr('fill-opacity', 0.5)
      .on('mouseover', (event, d) => {
        const text = `${d.city}: ${d.n} publication` + (d.n == 1 ? '' : 's');
        tooltipSvg.attr('transform', `translate(${event.pageX},${event.pageY})`)
                  .style('visibility', 'visible');
        d3.select('#tooltip-text').text(text);
      })
      .on('click', (event, d) => {
        selectCity(d.id);
      })
      .on('mouseout', (event, d) => {
        if (d.id != selectedCity)
          tooltipSvg.style('visibility', 'hidden');
      })
  ;

  d3.selectAll('td.city').on('click', function() {
    const id = this.attributes['data-id'].value;
    selectCity(id);
  });

  
  if (selectedCity != null) {
    selectedCityIsAvailable = cities.filter(d => d.id == selectedCity).length > 0;
    selectCity(selectedCity);
  }
}

const selectCity = id => {
  if (selectedCity != null) {
    const oldText = d3.select('td.city[data-id=' + selectedCity + ']');
    if (!oldText.empty())
      oldText
        .style('color', null)
        .style('font-weight', null);
    const oldCircle = cityContainer.select('#' + selectedCity);
    if (!oldCircle.empty())
      oldCircle.attr('fill', defaultColor);
  }

  // text in city list
  d3.select('td.city[data-id=' + id + ']')
    .style('color', selectedColor)
    .style('font-weight', 'bolder'); 

  const city = cityContainer.select('#' + id);
  if (!city.empty()) {
    city.attr('fill', selectedColor);

    const d = city.data()[0];
    const offsetX = city.attr('cx') * currentScale + currentTranslate[0];
    const offsetY = city.attr('cy') * currentScale + currentTranslate[1];
 
    const text = `${d.city}: ${d.n} publication` + (d.n == 1 ? '' : 's');
    tooltipSvg.attr('transform', `translate(${offsetX + 10}, ${offsetY - 10})`)
            .style('visibility', 'visible');
    tooltipSvg.select('#tooltip-text').text(text);

    tooltipLineVertical.attr('x1', offsetX).attr('x2', offsetX);
    tooltipLineHorizontal.attr('y1', offsetY).attr('y2', offsetY);

    const places = d.variants.split('|').map(d => '264a_ProvisionActivity_place_ss:"' + d + '"').join(' OR ');
    const query = '008all07_GeneralInformation_date1_ss:"' + d.date + '" AND (' + places + ')';
    d3.select('#variants')
      .html('name variants: ' + d.variants.split('|').map(d => `<span>${d}</span>`).join(' &mdash; ') 
          + ' → ' + '<a href="http://ddb.qa-catalogue.eu/onb/?tab=data&query=' 
                  + encodeURIComponent(query) + '" target="_blank" title="[Search!]">'
                  + '<i class="fa fa-search" aria-hidden="true"></i></a>');
  } else {
    d3.select('#variants').html('');
  }


  selectedCity = id;
}

const cityList = (selectedCities) => {
  const all = selectedCities.map(city => `<tr><td class="city" data-id="${city.id}">${city.city}</td><td class="books">${city.n}</td></tr>`);
  const split_index = (all.length % 4 == 0) ? all.length / 4 : Math.ceil(all.length / 4);
 
  return '<div class="column"><table>' + all.slice(0, split_index).join('') + '</table></div>'
       + '<div class="column"><table>' + all.slice(split_index, split_index*2).join('') + '</table></div>'
       + '<div class="column"><table>' + all.slice(split_index*2, split_index*3).join('') + '</table></div>'
       + '<div class="column"><table>' + all.slice(split_index*3).join('') + '</table></div>'
       ;
}