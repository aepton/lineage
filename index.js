d3.selection.prototype.moveToFront = function() {
  return this.each(function(){
    this.parentNode.appendChild(this);
  });
};

var PartyGraph = function(options) {
    this.options = options;
    this.xScale = d3.scale.linear()
        .domain([1, this.options.lanes])
        .range([this.options.margin.left,
                this.options.width - this.options.margin.right]);
    this.years = this.generateYears();
    this.yScale = d3.scale.ordinal()
        .domain(this.years)
        .rangePoints([this.options.margin.top, this.options.height - this.options.margin.bottom]);
}

PartyGraph.prototype.generateYears = function() {
    var graph = this,
        years = [];
    _.each(_.range(graph.options.begin_year, graph.options.end_year + 1), function(year) {
        var valid = true;
        _.each(graph.options.skip_periods, function(period) {
            if (period.begin == year) {
                years.push(String(period.begin) + ' - ' + String(period.end));
            }
            if (year >= period.begin && year <= period.end) {
                valid = false;
            }
        });
        if (valid) {
            years.push(String(year));
        }
    });
    return years;
}

PartyGraph.prototype.drawResults = function(results) {
    var graph = this;
    this.data = results;

    this.svg = d3.select('body').append('svg')
        .attr('width', this.options.width)
        .attr('height', this.options.height)
        .attr('id', 'chart')
        .attr('class', 'chart')
        .style('top', $('#headline').offset()['top'] + $('#headline').height());

    var text = d3.select('body').selectAll('#labels')
        .data([results]).enter()
        .append('div')
        .attr('id', 'labels');

    text = text.selectAll(".party").data(results, function(d) { return d['party-slug'] + '-' + d['year'] });

    textEnter = text.enter().append("div")
      .attr("class", function(d) { return "party party-" + d['party-slug'] + " year-" + d['year']; })
      .text(function(d) { return d['party-short-name']; })
      .on("mouseover", function(d) {
        graph.highlightSuccessors(d);
      })
      .on("mouseout", function() {
        $('.party').removeClass('highlight');
        $('svg').find('.highlight')
            .attr('class', function() {
                this.classList.remove('highlight');
                return this.classList.toString();
            });
      });

    var graph = this,
        svg = document.getElementById('chart'),
        textLabels = text
            .style("left", function(d) {
                return graph.getPositionFromSvg(d).x + $('svg.chart').offset()['left'];
            })
            .style("top", function(d) {
                return graph.getPositionFromSvg(d).y - graph.options.textPadding * 2 + $('svg.chart').offset()['top'];
            })
            .style("width", this.options.laneWidth)
            .html(function (d) { return d['party-short-name']; });

    this.drawCoalitions();
    this.drawConnections();
    this.drawYears();

    $('.party-connect').on("mouseover", function(selected) {
            graph.svg.selectAll('.party-connect')[0]
                .sort(function(a, b) {
                    if ($(a)[0].id === selected.currentTarget.id) {
                        return 1;
                    } else {
                        if ($(b)[0].id === selected.currentTarget.id) {
                            return -1;
                        } else {
                            return 0;
                        }
                    }
                });
        });
}

PartyGraph.prototype.drawCoalitions = function() {
    var graph = this,
        coalitions = {};
    _.each(graph.data, function(party) {
        var boxId = party['coalition-slug'] + party['year'],
            startPt = graph.getPositionFromSvg(party);
        if (party['coalition-slug']) {
            var endPt = $.extend({}, startPt);
            endPt.x += graph.getWidthOfLabelInSvg(party['year'], party['party-slug']);
            endPt.y += graph.getHeightOfLabelInSvg(party['year'], party['party-slug']);
            if (_.keys(coalitions).indexOf(boxId) == -1) {
                coalitions[boxId] = {
                    topLeft: startPt,
                    bottomRight: endPt
                };
            }
            if (endPt.y > coalitions[boxId].bottomRight.y) {
                coalitions[boxId].bottomRight.y = endPt.y;
            }
            if (endPt.x > coalitions[boxId].bottomRight.x) {
                coalitions[boxId].bottomRight.x = endPt.x;
            }

            if (party['coalition-badge']) {
                if (party['coalition-badge'] == 'left') {
                    coalitions[boxId].badge = {
                        x: coalitions[boxId].topLeft.x,
                        y: coalitions[boxId].topLeft.y,
                        name: party['coalition-name']
                    };
                }
            }
        }
    });

    var cboxes = d3.select('body').selectAll('#coalitions')
        .data([_.pairs(coalitions)]).enter()
        .append('div')
        .attr('id', 'coalitions');

    cboxes = cboxes.selectAll(".coalition").data(_.pairs(coalitions), function(d) { return d[0]; });

    cboxEnter = cboxes.enter().append("div")
      .attr("class", "coalition")
      .style("top", function(d) { return d[1].topLeft.y + $('svg.chart').offset()['top'] - graph.options.fontSize })
      .style("left", function(d) { return d[1].topLeft.x + $('svg.chart').offset()['left']})
      .style("width", function(d) { return d[1].bottomRight.x - d[1].topLeft.x })
      .style("height", function(d) { return d[1].bottomRight.y - d[1].topLeft.y });

    cboxBadges = cboxes.enter().append("p")
      .attr("class", "coalition-badge")
      .style("top", function(d) { return d[1].topLeft.y + $('svg.chart').offset()['top'] })
      .style("left", function(d) { return d[1].topLeft.x + $('svg.chart').offset()['left']})
      .style("height", function(d) { return d[1].bottomRight.y - d[1].topLeft.y })
      .style("font-size", function(d) { return d[1].bottomRight.y - d[1].topLeft.y + "px" })
      .html(function(d) { if (d[1].badge) { return d[1].badge.name; }});

    console.log(cboxBadges);
    _.each(cboxBadges[0], function(badge) {
        console.log(badge);
        if (!$(badge).width()) {
            return;
        }
        $(badge).css({
            'left': $(badge).offset()['left'] - $(badge).width() + 'px'
        });
        //badge.attr("left")
    });
}

PartyGraph.prototype.highlightSuccessors = function(party) {
    var graph = this,
        successorSlugs = [],
        successors = [];
    if (party['direct-successor-party-slug']) {
        successorSlugs.push(party['direct-successor-party-slug']);
    }
    _.each(party['indirect-successor-party-slugs'], function(slug) {
        successorSlugs.push(slug);
    });
    _.each(successorSlugs, function(slug) {
        $('svg').find('#' + party['year'] + '-' + party['party-slug'] + '-' + slug)
            .attr('class', function() {
                this.classList.add('highlight');
                return this.classList.toString();
            });
    });
    _.each(this.data, function(candidate) {
        if (successorSlugs.indexOf(candidate['party-slug']) != -1 &&
            parseInt(candidate['year']) > parseInt(party['year'])) {
            successors.push(candidate);
            successorSlugs = _.without(successorSlugs, candidate['party-slug']);
        }
    });
    $('.party.party-' + party['party-slug'] + '.year-' + party['year']).addClass('highlight');
    _.each(successors, function(successor) {
        $('.party.party-' + successor['party-slug'] + '.year-' + successor['year']).addClass('highlight');
        graph.highlightSuccessors(successor);
    });
}

PartyGraph.prototype.getWidthOfLabel = function(year, slug) {
    return $('.party-' + slug + '.year-' + year).width();
}

PartyGraph.prototype.getWidthOfLabelInSvg = function(year, slug) {
    var svg = document.getElementById('chart'),
        topLeftPt = svg.createSVGPoint(),
        topRightPt = svg.createSVGPoint(),
        labelPt = $('.party-' + slug + '.year-' + year)[0].getBoundingClientRect();
    topLeftPt.x = labelPt.left;
    topLeftPt.y = labelPt.top;
    topRightPt.x = labelPt.right;
    topRightPt.y = labelPt.top;
    topLeftPt = topLeftPt.matrixTransform(svg.getScreenCTM().inverse());
    topRightPt = topRightPt.matrixTransform(svg.getScreenCTM().inverse());
    return topRightPt.x - topLeftPt.x;
}

PartyGraph.prototype.getHeightOfLabelInSvg = function(year, slug) {
    var svg = document.getElementById('chart'),
        topLeftPt = svg.createSVGPoint(),
        bottomLeftPt = svg.createSVGPoint(),
        labelPt = $('.party-' + slug + '.year-' + year)[0].getBoundingClientRect();
    topLeftPt.x = labelPt.left;
    topLeftPt.y = labelPt.top;
    bottomLeftPt.x = labelPt.left;
    bottomLeftPt.y = labelPt.bottom;
    topLeftPt = topLeftPt.matrixTransform(svg.getScreenCTM().inverse());
    bottomLeftPt = bottomLeftPt.matrixTransform(svg.getScreenCTM().inverse());
    return bottomLeftPt.y - topLeftPt.y;
}

PartyGraph.prototype.getPositionFromSvg = function(party) {
    var svg = document.getElementById('chart'),
        pt = svg.createSVGPoint();
    pt.x = this.xScale(parseInt(party['lane'])) + $('svg.chart').offset()['left'];
    pt.y = this.yScale(String(party['year'])) + $('svg.chart').offset()['top'];
    pt = pt.matrixTransform(svg.getScreenCTM().inverse());
    return pt;
}

PartyGraph.prototype.getPosition = function(year, slug) {
    var graph = this,
        x,
        y;
    _.each(this.data, function(item) {
        if (item['year'] == year && item['party-slug'] == slug) {
            x = graph.xScale(item['lane']);
            y = graph.yScale(String(item['year']));
        }
    });
    return {x: x + .5 * graph.options.laneWidth, y: y};
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
        if (years.indexOf(String(year)) == -1 && graph.years.indexOf(String(year)) != -1) {
            blankYears.push(String(year));
        }
    });

    var text = this.svg.selectAll('text.year')
        .data(graph.years).enter()
        .append('text')
        .attr('class', 'year');

    var textLabels = text
            .attr("x", 10)
            .attr("y", function(d) { return graph.yScale(String(d)); })
            .attr("class", function(d) {
                var classes = "year";
                if (blankYears.indexOf(d) != -1 || d.indexOf(' - ') != -1) {
                    classes += " blank-year";
                }
                return classes;
            })
            .text( function (d) { return d; });
}

PartyGraph.prototype.connectDirect = function(year, startSlug, endSlug) {
    var graph = this,
        startCoords = this.getPosition(year, startSlug),
        endCoords,
        endYear = null,
        connectionId = year + "-" + startSlug + "-" + endSlug;
    _.each(this.data, function(item) {
        if (item['party-slug'] == endSlug && item['year'] > year && endYear == null) {
            endYear = item['year'];
        }
    });
    endCoords = this.getPosition(endYear, endSlug);

    this.svg.append("line")
        .attr("x1", startCoords.x)
        .attr("y1", startCoords.y + this.getHeightOfLabelInSvg(year, startSlug))
        .attr("x2", endCoords.x)
        .attr("y2", endCoords.y - this.options.textPadding - this.options.fontSize)
        .attr("stroke-width", 0.5)
        .attr("stroke", "black")
        .attr("class", "party-connect party-connect-direct")
        .attr("id", connectionId);
}

PartyGraph.prototype.connectIndirect = function(year, startSlug, endSlug) {
    var graph = this,
        startCoords = this.getPosition(year, startSlug),
        middleCoords,
        endCoords,
        startLaneOffset,
        endYear = null,
        tension = 0.9,
        g = this.svg.append("g"),
        strokeWidth = 0.5,
        strokeColor = "black",
        direction = "right",
        margin = this.getWidthOfLabelInSvg(year, startSlug) * .5,
        connectionId = year + "-" + startSlug + "-" + endSlug;

    _.each(this.data, function(item) {
        if (item['party-slug'] == endSlug && item['year'] > year && endYear == null) {
            endYear = item['year'];
        } else if (item['party-slug'] == startSlug && item['year'] == year) {
            startLaneOffset = parseInt(item['lane']) * 1.5;
        }
    });

    endCoords = this.getPosition(endYear, endSlug);
    middleCoords = {x: endCoords.x, y: startCoords.y};

    if (startCoords.x < endCoords.x) {
        direction = "left";
    } else {
        direction = "right";
        margin *= -1;
    }
    startCoords.x += margin;

    var points = [
            {
                x: startCoords.x,
                y: startCoords.y - this.getHeightOfLabelInSvg(year, startSlug) * .3
            },
            {
                x: middleCoords.x,
                y: middleCoords.y - this.getHeightOfLabelInSvg(year, startSlug) * .3
            },
            {
                x: endCoords.x,
                y: endCoords.y - this.options.textPadding - this.options.fontSize
            }
        ]

    var line = d3.svg.line()
        .interpolate("linear")
        .tension(tension)
        .x(function(d) { return d.x; })
        .y(function(d) { return d.y; });

    g.append("path")
        .attr("class", function(d) { return "party-connect party-connect-indirect" })
        .attr("id", connectionId)
        .attr("d", function(d) { return graph.elbow(points, direction, margin); });
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

PartyGraph.prototype.elbow = function(points, direction, margin) {
    var curve = this.options.laneWidth * 0.3,
        horizontalCurve = curve,
        verticalCurve = curve ,
        largeArc = "0",
        sweep = "1";

    if (Math.abs(points[0].x - points[1].x) < curve) {
        curve -= margin;
        horizontalCurve = curve;
        verticalCurve = curve;
    }

    if (direction == "right") {
        largeArc = "0";
        sweep = "0";
        horizontalCurve *= -1;
    }
    return "M" + String(points[0].x) + "," + String(points[0].y)
        + "L" + String(points[1].x - horizontalCurve) + "," + String(points[1].y)
        + "A" + String(horizontalCurve) + "," + String(verticalCurve) + ",0," + largeArc + "," + sweep + ","
            + String(points[1].x) + "," + String(points[1].y + verticalCurve)
        + "L" + String(points[2].x) + "," + String(points[2].y);
}

$(document).ready(function() {
    var lanes = 20,
        width = $(window).width() * .95,// * 1.1,
        height = $(window).height() * 2,// * 1.5,
        graph = new PartyGraph({
        lanes: lanes,
        begin_year: 1918,
        end_year: 2015,
        skip_periods: [{begin: 1919, end: 1945}, {begin: 1947, end: 1957}],
        margin: {top: 25, bottom: 25, left: 50, right: 75},
        width: width,
        height: height,
        textPadding: 5,
        fontSize: 10,
        laneWidth: width/lanes
    });

    d3.json('partiesv3.json', function(results) {
        graph.drawResults(results);
    });
});