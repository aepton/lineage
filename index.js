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
    this.data = results;

    this.svg = d3.select('body').append('svg')
        .attr('width', this.options.width)
        .attr('height', this.options.height)
        .attr('class', 'chart');

    this.drawYears();

    var text = this.svg.selectAll('text.party')
        .data(results).enter()
        .append('text')
        .attr('class', 'party');

    var graph = this,
        textLabels = text
            .attr("x", function(d) { return graph.xScale(parseInt(d['lane'])); })
            .attr("y", function(d) { return graph.yScale(parseInt(d['year'])); })
            .text( function (d) { return d['party-short-name']; });

    this.drawConnections();
}

PartyGraph.prototype.getPosition = function(year, slug) {
    var graph = this,
        x,
        y;
    _.each(this.data, function(item) {
        if (item['year'] == year && item['party-slug'] == slug) {
            x = graph.xScale(item['lane']);
            y = graph.yScale(item['year']);
        }
    });
    return {x: x, y: y};
}

PartyGraph.prototype.drawYears = function() {
    var graph = this,
        years = [],
        blankYears = [];

    _.each(this.data, function(item) {
        if (years.indexOf(item['year']) == -1) {
            years.push(item['year']);
        }
    });
    _.each(_.range(graph.options.begin_year, graph.options.end_year), function(year) {
        if (years.indexOf(year) == -1) {
            blankYears.push(year);
        }
    });

    var text = this.svg.selectAll('text.year')
        .data(years).enter()
        .append('text')
        .attr('class', 'year');

    var textLabels = text
            .attr("x", 0)
            .attr("y", function(d, idx) { return graph.yScale(d); })
            .text( function (d) { return d; });

    text = this.svg.selectAll('text.blank-year')
        .data(blankYears).enter()
        .append('text')
        .attr('class', 'blank-year');

    textLabels = text
        .attr("x", 0)
        .attr("y", function(d, idx) { return graph.yScale(d); })
        .text( function (d) { return d; });
}

PartyGraph.prototype.connectDirect = function(year, startSlug, endSlug) {
    var graph = this,
        startCoords = this.getPosition(year, startSlug),
        endCoords,
        endYear = null;
    _.each(this.data, function(item) {
        if (item['party-slug'] == endSlug && item['year'] > year && endYear == null) {
            endYear = item['year'];
        }
    });
    endCoords = this.getPosition(endYear, endSlug);
    this.svg.append("line")
        .attr("x1", startCoords.x + this.options.textPadding)
        .attr("y1", startCoords.y + this.options.textPadding)
        .attr("x2", endCoords.x + this.options.textPadding)
        .attr("y2", endCoords.y - this.options.textPadding - this.options.fontSize)
        .attr("stroke-width", 0.5)
        .attr("stroke", "black");
}

PartyGraph.prototype.connectIndirect = function(year, startSlug, endSlug) {
    var graph = this,
        startCoords = this.getPosition(year, startSlug),
        middleCoords,
        endCoords,
        startLaneOffset,
        endYear = null;

    _.each(this.data, function(item) {
        if (item['party-slug'] == endSlug && item['year'] > year && endYear == null) {
            endYear = item['year'];
        } else if (item['party-slug'] == startSlug && item['year'] == year) {
            startLaneOffset = parseInt(item['lane']) * 1.5;
        }
    });

    endCoords = this.getPosition(endYear, endSlug);
    middleCoords = {x: endCoords.x, y: startCoords.y};
    var g = this.svg.append("g")
        strokeWidth = 0.5,
        strokeColor = "black";

    g.append("line")
        .attr("x1", startCoords.x + this.options.textPadding)
        .attr("y1", startCoords.y + this.options.textPadding)
        .attr("x2", startCoords.x + this.options.textPadding)
        .attr("y2", startCoords.y + this.options.textPadding + startLaneOffset)
        .attr("stroke-width", strokeWidth)
        .attr("stroke", strokeColor);

    g.append("line")
        .attr("x1", startCoords.x + this.options.textPadding)
        .attr("y1", startCoords.y + this.options.textPadding + startLaneOffset)
        .attr("x2", middleCoords.x + this.options.textPadding)
        .attr("y2", middleCoords.y + this.options.textPadding + startLaneOffset)
        .attr("stroke-width", strokeWidth)
        .attr("stroke", strokeColor);

    g.append("line")
        .attr("x1", middleCoords.x + this.options.textPadding)
        .attr("y1", middleCoords.y + this.options.textPadding + startLaneOffset)
        .attr("x2", endCoords.x + this.options.textPadding)
        .attr("y2", endCoords.y - this.options.textPadding - this.options.fontSize)
        .attr("stroke-width", strokeWidth)
        .attr("stroke", strokeColor);
}

PartyGraph.prototype.drawConnections = function() {
    var graph = this;
    _.each(this.data, function(item) {
        if (item['direct-successor-party-slug']) {
            graph.connectDirect(item['year'], item['party-slug'], item['direct-successor-party-slug']);
        }
        _.each(item['indirect-successor-party-slugs'], function(slug) {
            if (slug) {
                graph.connectIndirect(item['year'], item['party-slug'], slug);
            }
        });
    });
}


$(document).ready(function() {
    var graph = new PartyGraph({
        lanes: 20,
        begin_year: 1918,
        end_year: 2015,
        margin: {top: 25, bottom: 25, left: 50, right: 75},
        width: $(window).width(),
        height: $(window).height() * 1.5,
        textPadding: 5,
        fontSize: 10
    });

    d3.json('greek_parties.json', function(results) {
        graph.drawResults(results);
    });
});