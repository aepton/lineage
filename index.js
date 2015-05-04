var PartyGraph = function(options) {
    this.options = options;
    this.xScale = d3.scale.linear()
        .domain([1, this.options.lanes])
        .range([this.options.margin.left, this.options.width - this.options.margin.right]);
    this.yScale = d3.scale.linear()
        .domain([this.options.begin_year, this.options.end_year])
        .range([this.options.margin.top, this.options.height - this.options.margin.bottom]);
}

PartyGraph.prototype.drawResults = function(results) {
    this.svg = d3.select('body').append('svg')
        .attr('width', this.options.width)
        .attr('height', this.options.height)
        .attr('class', 'chart');

    this.text = this.svg.selectAll('text')
        .data(results).enter()
        .append('text');

    var graph = this;
    this.textLabels = this.text
        .attr("x", function(d) { return graph.xScale(parseInt(d['lane'])); })
        .attr("y", function(d) { return graph.yScale(parseInt(d['year'])); })
        .text( function (d) { return d['party-short-name']; });
}


$(document).ready(function() {
    var graph = new PartyGraph({
        lanes: 20,
        begin_year: 1918,
        end_year: 2015,
        margin: {top: 25, bottom: 25, left: 50, right: 75},
        width: $(window).width(),
        height: $(window).height() * 2
    });

    d3.json('greek_parties.json', function(results) {
        graph.drawResults(results);
    });
});