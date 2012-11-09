var nodeColor = "#1D91A9";
var selColor = "#FF7905";
var bgColor = "white";
var initialCharge = -300;
var initialLinkDistance = 80;
var networkWidth = 585;
var networkHeight = 525;
var barHeight = 5;
var genreWidth = 200;
var genreHeight = 2850;
var artistWidth = 200;
var artistHeight = 525;
var xList = 50;
var padding = 10;
var textSpacer = 25;
var selection1 = null;
var selection2 = null;
var selected = false;
var sorted = "counts";
var originalNodes, originalLinks;
var data = "json.json";
var linkedByIndex = {};

//
// --- HELPER FUNCTIONS --- 
//

// --- DATA PROCESSING ---

// maps node ids to node objects and returns d3.map of nodes -> ids
// thanks to Jim Vallandingham @ flowingdata.com/2012/08/02/how-to-make-an-interactive-network-visualization/
var mapNodes = function(nodes) {
    var nodesMap = d3.map();
    nodes.forEach(function(n) {
        return nodesMap.set(n.id, n);
    })
    return nodesMap;
}

// make links point to node objects instead of ids
var mapLinks = function(links, nodesMap) {
    links.forEach(function(l) {
        l.source = nodesMap.get(l.source);
        l.target = nodesMap.get(l.target);

        // used to filter out nodes that are not linked to the
        // selected node
        linkedByIndex["" + l.source.id + "," + l.target.id] = 1;
    })
}

// given two nodes a and b, returns true if there is a link
// between them
var neighboring = function(a, b) {
    return linkedByIndex[a.id + "," + b.id] || linkedByIndex[b.id + "," + a.id];
}

// --- MOUSE EVENTS ---

// changes color of selected genre
var selectionColor = function (d) {
    if (selected) { 
        return selection1 == d || selection2 == d ? selColor : null;
    }
}

// highlights genre name, node, and bar during mouseover
// thanks to Guerino1 @ bl.ocks.org/2141479 for the idea
var synchronizedMouseover = function() {
    var selectedElement = d3.select(this);
    var selectorID = selectedElement.attr("index_value");

    var selectedName = d3.selectAll("#name_hover" + selectorID);
    selectedName.style("fill", "black");

    var selectedNode = d3.selectAll("#node_hover" + selectorID);
    selectedNode.style("fill", "black");
    
    var selectedBar = d3.selectAll("#bar_hover" + selectorID);
    selectedBar.style("fill", "black");
}

// removes highlighting from genre name, node, and bar during mouseout
var synchronizedMouseout = function() {
    var selectedElement = d3.select(this);
    var selectorID = selectedElement.attr("index_value");

    var selectedName = d3.selectAll("#name_hover" + selectorID);
    selectedName.style("fill", selectionColor);

    var selectedNode = d3.selectAll("#node_hover" + selectorID);
    selectedNode.style("fill", selectionColor);

    var selectedBar = d3.selectAll("#bar_hover" + selectorID);
    selectedBar.style("fill", null);
}

//
// --- GRAPH FUNCTIONS ---
//

// initialize physics and dimensions of graph
var force = d3.layout.force()
            .charge(initialCharge)
            .linkDistance(initialLinkDistance)
            .gravity(0.4)
            .size([networkWidth - padding, networkHeight - padding]);

// add network graph container to DOM with given width and height
var networkGraph = d3.select(".network").append("svg")
                    .attr("width", networkWidth)
                    .attr("height", networkHeight);

// add artist list container to network graph container
var artistList = d3.select(".artistlist").append("svg")
                    .attr("width", artistWidth)
                    .attr("height", artistHeight);

// add genre list container to DOM 
var genrelist = d3.select(".genrelist").append("svg")
                    .attr("width", genreWidth)
                    .attr("height", genreHeight);

// read in data and create the graph
d3.json(data, function(json) {

    var currentNodes = json.nodes;
    var currentLinks = json.links;

    // map ids to node objects and make links point to those objects
    var nodesMap = mapNodes(currentNodes);
    mapLinks(currentLinks, nodesMap);

    originalNodes = currentNodes;
    originalLinks = currentLinks;

    // sorts genre list by songcount
    var countSorted = function () {
        currentNodes.sort(function (a,b) {
            var asc = a.songcount, bsc = b.songcount;
            return asc > bsc ? -1 : asc < bsc ? 1 : 0;
        })
    }

    // sorts genre list alphabetically
    var alphaSorted = function () {
        currentNodes.sort(function (a,b) {
            var alc = a.genre.toLowerCase(), blc = b.genre.toLowerCase();
            return alc > blc ? 1 : alc < blc ? -1 : 0;
        })
    }

    // sorts genre list by popularity
    var popularitySorted = function () {
        currentNodes.sort(function (a,b) {
            if (a.playcount > 0) {
                var apop = a.playcount / Math.sqrt(a.songcount);
            } else {
                var apop = -1 * a.playcount * Math.sqrt(a.songcount) / a.playcount;
            }
            if (b.playcount > 0) {
                var bpop = b.playcount / Math.sqrt(b.songcount);
            } else {
                var bpop = -1 * b.playcount * Math.sqrt(b.songcount) / b.playcount;
            }
            return apop < bpop ? 1 : apop > bpop ? -1 : 0;
        })
    }

    // given an id, returns the name of the genre
    var getGenre = function (g) {
        genrename = currentNodes.filter(function(n) {
            return n.id == g;
        })
        return genrename[0].genre;
    }

    // returns link to last.fm for a given artist
    var getArtistLink = function (d) {
        return "http://www.last.fm/music/" + d.artist.replace(" ","+");
    }

    // updates selection window
    var showSelection = function() {
        if (selected == true) {
            d3.select(".infotext").style("color",selColor).html(function () { 
                return selection2 == null ? selection1.genre + "<span style='color:" + 
                nodeColor + ";'> + click a second genre</span>" : selection1.genre + " + " + selection2.genre; });
        } else {
            d3.select(".infotext").style("color",nodeColor).text("Click a genre to select it");   
        }
    }

    // shows shared artists
    var showArtists = function () {
        // find shared artists for selection1 and selection2
        // returns an array with one element (list of shared artists)
        var sharedArtists = currentLinks.filter(function(l) {
                return (l.source.id == selection1.id && l.target.id == selection2.id) ||
                        (l.source.id == selection2.id && l.target.id == selection1.id);
            });

        // display list of shared artists
        var artist = artistList.selectAll("text.artist")
                        .data(sharedArtists[0].artists, function(d) { return d.artist; });

        // update current data                
        artist.transition().duration(500)
                .attr("x", 0)
                .attr("y", function (d,i) { return (i * textSpacer) + (padding * 2); });

        artist.enter().append("a")
                .attr("xlink:href", getArtistLink)
                .attr("target","_blank")
            .append("text")
                .attr("class", "artist")
                .attr("x", 0)
                .attr("y", function (d,i) { return (i * textSpacer) + (padding * 2); })
                .text(function (d) { return d.artist; });

        // remove artists not in the current selection
        artist.exit().remove();

    }

    // turns reset button off and on
    var toggleReset = function () {
        d3.select("#reset").style("color",bgColor).style("background",selColor).on("click", function () {
            selected = false;
            selection1 = null;
            selection2 = null;

            // remove all nodes so they can be redrawn over any existing edges
            var node = networkGraph.selectAll("circle.node").data([]);
            node.exit().remove();

            // remove shared artist list
            var artist = artistList.selectAll("text.artist").data([]);
            artist.exit().remove();

            currentNodes = originalNodes;
            currentLinks = originalLinks;
            
            // make button disappear           
            d3.select("#reset").style("color",bgColor).style("background",bgColor);

            // set graph physics back to initial settings
            force.charge(initialCharge).linkDistance(initialLinkDistance);

            restart();
        })
    }

    // responds to mouseclick events on genre name or node
    // by filtering any nodes not connected to the selected node
    var clicked = function (d) {
        
        // first genre clicked
        if (selected == false) {
            selection1 = d;
            selected = true;

            // filter nodes
            currentNodes = currentNodes.filter(function(o) {
                return neighboring(d, o) ? o : null;
            });
            
            // add the currently selected genre to the beginning of the array
            currentNodes.unshift(d);

            // filter links
            currentLinks = currentLinks.filter(function(o) {
                return o.source.id == d.id || o.target.id == d.id;
            });

            toggleReset();

            // recalculate charge and link distance to make smaller graphs fill more space
            force.charge(-1000).linkDistance(200);

            return restart();

        };

        // second genre clicked
        if (selected == true && selection1 != d) {
            selection2 = d;

            // set color for selected nodes and genre names
            d3.selectAll("text.genre").style("fill", selectionColor);
            d3.selectAll("circle.node").style("fill", selectionColor);

            showSelection();

            showArtists();
        };
    }

    // restart is where the graph itself gets made and remade given current data
    var restart = function () {

        // determine how genre list should be sorted
        if (sorted == "counts") {
            countSorted();
        } else if (sorted == "alpha") {
            alphaSorted();
        } else {
            popularitySorted();
        }

        force.nodes(currentNodes)
            .links(currentLinks)
            .start();

        // populate selection window
        showSelection();

        // --- EDGES ---

        // create the edges
        var link = networkGraph.selectAll("line.link")
                    .data(currentLinks, function(d) { return "" + d.source.id + "_" + d.target.id; });
                    
        link.enter().append("line")
            .attr("class", "link")
            .style("stroke-width", function(d) { return d.artistcount * 2; });

        // remove links not in the current selection
        link.exit().remove();

        // --- NODES ---

        // create the nodes
        var node = networkGraph.selectAll("circle.node")
                    .data(currentNodes, function (d) { return d.id; });

        node.enter().append("circle")
            .attr("class", "node")
            .attr("index_value", function(d, i) { return i; })
            .attr("id", function (d,i) { return "node_hover" + i})
            .attr("r", function(d) { return Math.sqrt(d.sharecount * 10); })
            .call(force.drag)
            .on("mouseover", synchronizedMouseover)
            .on("mouseout", synchronizedMouseout)
            .on("click", clicked);

        node.transition().duration(500)
            .style("fill", selectionColor);

        // remove nodes not in the current selection
        node.exit().transition().duration(500)
            .attr("r",0).remove();

        // --- GENRE LIST ---

        // create the genre list from the given data
        var listName = genrelist.selectAll("text.genre")
                        .data(currentNodes, function (d) { return d.id; });
         
        // update current data                
        listName.transition().duration(500)
                .attr("x", xList)
                .attr("y", function (d,i) { return (i * textSpacer) + (padding * 2); })
                .style("fill", selectionColor);
         
        // enter new data                
        listName.enter().append("text")
                .attr("class", "genre")
                .attr("index_value", function(d, i) { return i; })
                .attr("id", function (d,i) { return "name_hover" + i})
                .attr("x", xList)
                .attr("y", function (d,i) { return (i * textSpacer) + (padding * 2); })
                .text(function (d) { return d.genre })
                .on("mouseover", synchronizedMouseover)
                .on("mouseout", synchronizedMouseout)
                .on("click", clicked);

        // remove names not in the current selection
        listName.exit().remove();

        // updates height of genrelist based on number of genres in current list
        genrelist.attr("height", currentNodes.length * textSpacer);

        // --- SONGCOUNT BARS ---
        
        // create the songcount bars for each genre in the list
        var listBar = genrelist.selectAll("rect.genre")
                        .data(currentNodes, function (d) { return d.id; });
                        
        listBar.transition().duration(500)
                .attr("x", function (d) { return xList - Math.sqrt(d.songcount) - padding; })
                .attr("y", function (d,i) { return (i * textSpacer) + (padding * 2) - barHeight; });
                        
        listBar.enter().append("rect")
                .attr("class", "genre")
                .attr("index_value", function(d, i) { return i; })
                .attr("id", function (d,i) { return "bar_hover" + i})
                .attr("x", function (d) { return xList - Math.sqrt(d.songcount) - padding; })
                .attr("y", function (d,i) { return (i * textSpacer) + (padding * 2) - barHeight; })
                .attr("width", function (d) { return Math.sqrt(d.songcount); })
                .attr("height", barHeight)
                .on("mouseover", synchronizedMouseover)
                .on("mouseout", synchronizedMouseout);

        // remove bars not in the current selection
        listBar.exit().remove();
        
        // --- MOUSEOVER EVENTS ---

        // add genre name and shared song count to node mouseover
        node.append("title")
            .text(function(d) { return d.genre + ": " + d.sharecount
                + (d.sharecount > 1 ? " total shared artists" : " total shared artist"); });

        // add shared artist info to edge mouseover
        link.append("title")
            .text(function(d) { return getGenre(d.source.id) + " + " + getGenre(d.target.id) + ": " + 
                d.artistcount + (d.artistcount > 1 ? " shared artists" : " shared artist"); });

        // add songcount to bar mouseover
        listBar.append("title")
            .text(function(d) { return d.songcount + (d.songcount > 1 ? " total songs" : " total song"); });
        
        // add shared song count to genre name mouseover
        listName.append("title")
            .text(function(d) { return d.genre + ": " + d.sharecount
                + (d.sharecount > 1 ? " total shared artists" : " total shared artist"); });


        // compute the layout for nodes and edges
        force.on("tick", function() {
            link.attr("x1", function(d) { return d.source.x; })
                .attr("y1", function(d) { return d.source.y; })
                .attr("x2", function(d) { return d.target.x; })
                .attr("y2", function(d) { return d.target.y; });

            node.attr("cx", function(d) { return d.x; })
                .attr("cy", function(d) { return d.y; });
        });
    };

//
// --- SORTING OPTIONS ---
//

// total songs

d3.selectAll("#counts").on("click", function() {
    sorted = "counts";
    restart();
    
    d3.select("#counts").classed("active", true);
    d3.select("#alpha").classed("active", false);
    d3.select("#popularity").classed("active", false);
});

// alphabetical

d3.selectAll("#alpha").on("click", function() {
    sorted = "alpha";
    restart();

    d3.select("#counts").classed("active", false);
    d3.select("#alpha").classed("active", true);
    d3.select("#popularity").classed("active", false);
});

// popularity

d3.selectAll("#popularity").on("click", function() {
    sorted = "popularity";
    restart();

    d3.select("#counts").classed("active", false);
    d3.select("#alpha").classed("active", false);
    d3.select("#popularity").classed("active", true);
});

restart();

})