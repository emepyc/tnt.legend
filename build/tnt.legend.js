(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
if (typeof tnt === "undefined") {
    module.exports = tnt = {};
}

tnt.legend = require("./index.js");

},{"./index.js":2}],2:[function(require,module,exports){
// if (typeof tnt === "undefined") {
//     module.exports = tnt = {};
// }
// tnt.legend = require("./src/legend.js");

var legend = require("./src/legend.js");
module.exports = exports = legend;

},{"./src/legend.js":16}],3:[function(require,module,exports){
module.exports = require("./src/api.js");

},{"./src/api.js":4}],4:[function(require,module,exports){
var api = function (who) {

    var _methods = function () {
	var m = [];

	m.add_batch = function (obj) {
	    m.unshift(obj);
	};

	m.update = function (method, value) {
	    for (var i=0; i<m.length; i++) {
		for (var p in m[i]) {
		    if (p === method) {
			m[i][p] = value;
			return true;
		    }
		}
	    }
	    return false;
	};

	m.add = function (method, value) {
	    if (m.update (method, value) ) {
	    } else {
		var reg = {};
		reg[method] = value;
		m.add_batch (reg);
	    }
	};

	m.get = function (method) {
	    for (var i=0; i<m.length; i++) {
		for (var p in m[i]) {
		    if (p === method) {
			return m[i][p];
		    }
		}
	    }
	};

	return m;
    };

    var methods    = _methods();
    var api = function () {};

    api.check = function (method, check, msg) {
	if (method instanceof Array) {
	    for (var i=0; i<method.length; i++) {
		api.check(method[i], check, msg);
	    }
	    return;
	}

	if (typeof (method) === 'function') {
	    method.check(check, msg);
	} else {
	    who[method].check(check, msg);
	}
	return api;
    };

    api.transform = function (method, cbak) {
	if (method instanceof Array) {
	    for (var i=0; i<method.length; i++) {
		api.transform (method[i], cbak);
	    }
	    return;
	}

	if (typeof (method) === 'function') {
	    method.transform (cbak);
	} else {
	    who[method].transform(cbak);
	}
	return api;
    };

    var attach_method = function (method, opts) {
	var checks = [];
	var transforms = [];

	var getter = opts.on_getter || function () {
	    return methods.get(method);
	};

	var setter = opts.on_setter || function (x) {
	    for (var i=0; i<transforms.length; i++) {
		x = transforms[i](x);
	    }

	    for (var j=0; j<checks.length; j++) {
		if (!checks[j].check(x)) {
		    var msg = checks[j].msg || 
			("Value " + x + " doesn't seem to be valid for this method");
		    throw (msg);
		}
	    }
	    methods.add(method, x);
	};

	var new_method = function (new_val) {
	    if (!arguments.length) {
		return getter();
	    }
	    setter(new_val);
	    return who; // Return this?
	};
	new_method.check = function (cbak, msg) {
	    if (!arguments.length) {
		return checks;
	    }
	    checks.push ({check : cbak,
			  msg   : msg});
	    return this;
	};
	new_method.transform = function (cbak) {
	    if (!arguments.length) {
		return transforms;
	    }
	    transforms.push(cbak);
	    return this;
	};

	who[method] = new_method;
    };

    var getset = function (param, opts) {
	if (typeof (param) === 'object') {
	    methods.add_batch (param);
	    for (var p in param) {
		attach_method (p, opts);
	    }
	} else {
	    methods.add (param, opts.default_value);
	    attach_method (param, opts);
	}
    };

    api.getset = function (param, def) {
	getset(param, {default_value : def});

	return api;
    };

    api.get = function (param, def) {
	var on_setter = function () {
	    throw ("Method defined only as a getter (you are trying to use it as a setter");
	};

	getset(param, {default_value : def,
		       on_setter : on_setter}
	      );

	return api;
    };

    api.set = function (param, def) {
	var on_getter = function () {
	    throw ("Method defined only as a setter (you are trying to use it as a getter");
	};

	getset(param, {default_value : def,
		       on_getter : on_getter}
	      );

	return api;
    };

    api.method = function (name, cbak) {
	if (typeof (name) === 'object') {
	    for (var p in name) {
		who[p] = name[p];
	    }
	} else {
	    who[name] = cbak;
	}
	return api;
    };

    return api;
    
};

module.exports = exports = api;
},{}],5:[function(require,module,exports){
// if (typeof tnt === "undefined") {
//     module.exports = tnt = {}
// }
// tnt.utils = require("tnt.utils");
// tnt.tooltip = require("tnt.tooltip");
// tnt.board = require("./src/index.js");

module.exports = require("./src/index");

},{"./src/index":9}],6:[function(require,module,exports){
var apijs = require ("tnt.api");
var deferCancel = require ("tnt.utils").defer_cancel;

var board = function() {
    "use strict";
    
    //// Private vars
    var svg;
    var div_id;
    var tracks = [];
    var min_width = 50;
    var height    = 0;    // This is the global height including all the tracks
    var width     = 920;
    var height_offset = 20;
    var loc = {
	species  : undefined,
	chr      : undefined,
        from     : 0,
        to       : 500
    };

    // TODO: We have now background color in the tracks. Can this be removed?
    // It looks like it is used in the too-wide pane etc, but it may not be needed anymore
    var bgColor   = d3.rgb('#F8FBEF'); //#F8FBEF
    var pane; // Draggable pane
    var svg_g;
    var xScale;
    var zoomEventHandler = d3.behavior.zoom();
    var limits = {
	left : 0,
	right : 1000,
	zoom_out : 1000,
	zoom_in  : 100
    };
    var cap_width = 3;
    var dur = 500;
    var drag_allowed = true;

    var exports = {
	ease          : d3.ease("cubic-in-out"),
	extend_canvas : {
	    left : 0,
	    right : 0
	},
	show_frame : true
	// limits        : function () {throw "The limits method should be defined"}	
    };

    // The returned closure / object
    var track_vis = function(div) {
	div_id = d3.select(div).attr("id");

	// The original div is classed with the tnt class
	d3.select(div)
	    .classed("tnt", true);

	// TODO: Move the styling to the scss?
	var browserDiv = d3.select(div)
	    .append("div")
	    .attr("id", "tnt_" + div_id)
	    .style("position", "relative")
	    .classed("tnt_framed", exports.show_frame ? true : false)
	    .style("width", (width + cap_width*2 + exports.extend_canvas.right + exports.extend_canvas.left) + "px")

	var groupDiv = browserDiv
	    .append("div")
	    .attr("class", "tnt_groupDiv");

	// The SVG
	svg = groupDiv
	    .append("svg")
	    .attr("class", "tnt_svg")
	    .attr("width", width)
	    .attr("height", height)
	    .attr("pointer-events", "all");

	svg_g = svg
	    .append("g")
            .attr("transform", "translate(0,20)")
            .append("g")
	    .attr("class", "tnt_g");

	// caps
	svg_g
	    .append("rect")
	    .attr("id", "tnt_" + div_id + "_5pcap")
	    .attr("x", 0)
	    .attr("y", 0)
	    .attr("width", 0)
	    .attr("height", height)
	    .attr("fill", "red");
	svg_g
	    .append("rect")
	    .attr("id", "tnt_" + div_id + "_3pcap")
	    .attr("x", width-cap_width)
	    .attr("y", 0)
	    .attr("width", 0)
	    .attr("height", height)
	    .attr("fill", "red");

	// The Zooming/Panning Pane
	pane = svg_g
	    .append("rect")
	    .attr("class", "tnt_pane")
	    .attr("id", "tnt_" + div_id + "_pane")
	    .attr("width", width)
	    .attr("height", height)
	    .style("fill", bgColor);

	// ** TODO: Wouldn't be better to have these messages by track?
	// var tooWide_text = svg_g
	//     .append("text")
	//     .attr("class", "tnt_wideOK_text")
	//     .attr("id", "tnt_" + div_id + "_tooWide")
	//     .attr("fill", bgColor)
	//     .text("Region too wide");

	// TODO: I don't know if this is the best way (and portable) way
	// of centering the text in the text area
	// var bb = tooWide_text[0][0].getBBox();
	// tooWide_text
	//     .attr("x", ~~(width/2 - bb.width/2))
	//     .attr("y", ~~(height/2 - bb.height/2));
    };

    // API
    var api = apijs (track_vis)
	.getset (exports)
	.getset (limits)
	.getset (loc);

    api.transform (track_vis.extend_canvas, function (val) {
	var prev_val = track_vis.extend_canvas();
	val.left = val.left || prev_val.left;
	val.right = val.right || prev_val.right;
	return val;
    });

    // track_vis always starts on loc.from & loc.to
    api.method ('start', function () {

	// Reset the tracks
	for (var i=0; i<tracks.length; i++) {
	    if (tracks[i].g) {
		tracks[i].display().reset.call(tracks[i]);
	    }
	    _init_track(tracks[i]);
	}

	_place_tracks();

	// The continuation callback
	var cont = function (resp) {
	    limits.right = resp;

	    // zoomEventHandler.xExtent([limits.left, limits.right]);
	    if ((loc.to - loc.from) < limits.zoom_in) {
		if ((loc.from + limits.zoom_in) > limits.zoom_in) {
		    loc.to = limits.right;
		} else {
		    loc.to = loc.from + limits.zoom_in;
		}
	    }
	    plot();

	    for (var i=0; i<tracks.length; i++) {
		_update_track(tracks[i], loc);
	    }
	};

	// If limits.right is a function, we have to call it asynchronously and
	// then starting the plot once we have set the right limit (plot)
	// If not, we assume that it is an objet with new (maybe partially defined)
	// definitions of the limits and we can plot directly
	// TODO: Right now, only right can be called as an async function which is weak
	if (typeof (limits.right) === 'function') {
	    limits.right(cont);
	} else {
	    cont(limits.right);
	}

    });

    api.method ('update', function () {
	for (var i=0; i<tracks.length; i++) {
	    _update_track (tracks[i]);
	}

    });

    var _update_track = function (track, where) {
	if (track.data()) {
	    var track_data = track.data();
	    var data_updater = track_data.update();
	    //var data_updater = track.data().update();
	    data_updater.call(track_data, {
		'loc' : where,
		'on_success' : function () {
		    track.display().update.call(track, xScale);
		}
	    });
	}
    };

    var plot = function() {

	xScale = d3.scale.linear()
	    .domain([loc.from, loc.to])
	    .range([0, width]);

	if (drag_allowed) {
	    svg_g.call( zoomEventHandler
		       .x(xScale)
		       .scaleExtent([(loc.to-loc.from)/(limits.zoom_out-1), (loc.to-loc.from)/limits.zoom_in])
		       .on("zoom", _move)
		     );
	}

    };

    // right/left/zoom pans or zooms the track. These methods are exposed to allow external buttons, etc to interact with the tracks. The argument is the amount of panning/zooming (ie. 1.2 means 20% panning) With left/right only positive numbers are allowed.
    api.method ('move_right', function (factor) {
	if (factor > 0) {
	    _manual_move(factor, 1);
	}
    });

    api.method ('move_left', function (factor) {
	if (factor > 0) {
	    _manual_move(factor, -1);
	}
    });

    api.method ('zoom', function (factor) {
	_manual_move(factor, 0);
    });

    api.method ('find_track_by_id', function (id) {
	for (var i=0; i<tracks.length; i++) {
	    if (tracks[i].id() === id) {
		return tracks[i];
	    }
	}
    });

    api.method ('reorder', function (new_tracks) {
	// TODO: This is defining a new height, but the global height is used to define the size of several
	// parts. We should do this dynamically

	for (var j=0; j<new_tracks.length; j++) {
	    var found = false;
	    for (var i=0; i<tracks.length; i++) {
		if (tracks[i].id() === new_tracks[j].id()) {
		    found = true;
		    tracks.splice(i,1);
		    break;
		}
	    }
	    if (!found) {
		_init_track(new_tracks[j]);
		_update_track(new_tracks[j], {from : loc.from, to : loc.to});
	    }
	}

	for (var x=0; x<tracks.length; x++) {
	    tracks[x].g.remove();
	}

	tracks = new_tracks;
	_place_tracks();

    });

    api.method ('remove_track', function (track) {
	track.g.remove();
    });

    api.method ('add_track', function (track) {
	if (track instanceof Array) {
	    for (var i=0; i<track.length; i++) {
		track_vis.add_track (track[i]);
	    }
	    return track_vis;
	}
	tracks.push(track);
	return track_vis;
    });

    api.method('tracks', function (new_tracks) {
	if (!arguments.length) {
	    return tracks
	}
	tracks = new_tracks;
	return track_vis;
    });

    // 
    api.method ('width', function (w) {
	// TODO: Allow suffixes like "1000px"?
	// TODO: Test wrong formats
	if (!arguments.length) {
	    return width;
	}
	// At least min-width
	if (w < min_width) {
	    w = min_width
	}

	// We are resizing
	if (div_id !== undefined) {
	    d3.select("#tnt_" + div_id).select("svg").attr("width", w);
	    // Resize the zooming/panning pane
	    d3.select("#tnt_" + div_id).style("width", (parseInt(w) + cap_width*2) + "px");
	    d3.select("#tnt_" + div_id + "_pane").attr("width", w);

	    // Replot
	    width = w;
	    plot();
	    for (var i=0; i<tracks.length; i++) {
		tracks[i].g.select("rect").attr("width", w);
		tracks[i].display().reset.call(tracks[i]);
		tracks[i].display().update.call(tracks[i],xScale);
	    }
	    
	} else {
	    width = w;
	}
	
	return track_vis;
    });

    api.method('allow_drag', function(b) {
	if (!arguments.length) {
	    return drag_allowed;
	}
	drag_allowed = b;
	if (drag_allowed) {
	    // When this method is called on the object before starting the simulation, we don't have defined xScale
	    if (xScale !== undefined) {
		svg_g.call( zoomEventHandler.x(xScale)
			   // .xExtent([0, limits.right])
			   .scaleExtent([(loc.to-loc.from)/(limits.zoom_out-1), (loc.to-loc.from)/limits.zoom_in])
			   .on("zoom", _move) );
	    }
	} else {
	    // We create a new dummy scale in x to avoid dragging the previous one
	    // TODO: There may be a cheaper way of doing this?
	    zoomEventHandler.x(d3.scale.linear()).on("zoom", null);
	}
	return track_vis;
    });

    var _place_tracks = function () {
	var h = 0;
	for (var i=0; i<tracks.length; i++) {
	    var track = tracks[i];
	    if (track.g.attr("transform")) {
		track.g
		    .transition()
		    .duration(dur)
		    .attr("transform", "translate(0," + h + ")");
	    } else {
		track.g
		    .attr("transform", "translate(0," + h + ")");
	    }

	    h += track.height();
	}

	// svg
	svg.attr("height", h + height_offset);

	// div
	d3.select("#tnt_" + div_id)
	    .style("height", (h + 10 + height_offset) + "px");

	// caps
	d3.select("#tnt_" + div_id + "_5pcap")
	    .attr("height", h)
	    // .move_to_front()
	    .each(function (d) {
		move_to_front(this);
	    })
	d3.select("#tnt_" + div_id + "_3pcap")
	    .attr("height", h)
	//.move_to_front()
	    .each (function (d) {
		move_to_front(this);
	    });
	

	// pane
	pane
	    .attr("height", h + height_offset);

	// tooWide_text. TODO: Is this still needed?
	// var tooWide_text = d3.select("#tnt_" + div_id + "_tooWide");
	// var bb = tooWide_text[0][0].getBBox();
	// tooWide_text
	//     .attr("y", ~~(h/2) - bb.height/2);

	return track_vis;
    }

    var _init_track = function (track) {
	track.g = svg.select("g").select("g")
	    .append("g")
	    .attr("class", "tnt_track")
	    .attr("height", track.height());

	// Rect for the background color
	track.g
	    .append("rect")
	    .attr("x", 0)
	    .attr("y", 0)
	    .attr("width", track_vis.width())
	    .attr("height", track.height())
	    .style("fill", track.background_color())
	    .style("pointer-events", "none");

	if (track.display()) {
	    track.display().init.call(track, width);
	}
	
	return track_vis;
    };

    var _manual_move = function (factor, direction) {
	var oldDomain = xScale.domain();

	var span = oldDomain[1] - oldDomain[0];
	var offset = (span * factor) - span;

	var newDomain;
	switch (direction) {
	case -1 :
	    newDomain = [(~~oldDomain[0] - offset), ~~(oldDomain[1] - offset)];
	    break;
	case 1 :
	    newDomain = [(~~oldDomain[0] + offset), ~~(oldDomain[1] - offset)];
	    break;
	case 0 :
	    newDomain = [oldDomain[0] - ~~(offset/2), oldDomain[1] + (~~offset/2)];
	}

	var interpolator = d3.interpolateNumber(oldDomain[0], newDomain[0]);
	var ease = exports.ease;

	var x = 0;
	d3.timer(function() {
	    var curr_start = interpolator(ease(x));
	    var curr_end;
	    switch (direction) {
	    case -1 :
		curr_end = curr_start + span;
		break;
	    case 1 :
		curr_end = curr_start + span;
		break;
	    case 0 :
		curr_end = oldDomain[1] + oldDomain[0] - curr_start;
		break;
	    }

	    var currDomain = [curr_start, curr_end];
	    xScale.domain(currDomain);
	    _move(xScale);
	    x+=0.02;
	    return x>1;
	});
    };


    var _move_cbak = function () {
	var currDomain = xScale.domain();
	track_vis.from(~~currDomain[0]);
	track_vis.to(~~currDomain[1]);

	for (var i = 0; i < tracks.length; i++) {
	    var track = tracks[i];
	    _update_track(track, loc);
	}
    };
    // The deferred_cbak is deferred at least this amount of time or re-scheduled if deferred is called before
    var _deferred = deferCancel(_move_cbak, 300);

    // api.method('update', function () {
    // 	_move();
    // });

    var _move = function (new_xScale) {
	if (new_xScale !== undefined && drag_allowed) {
	    zoomEventHandler.x(new_xScale);
	}

	// Show the red bars at the limits
	var domain = xScale.domain();
	if (domain[0] <= 5) {
	    d3.select("#tnt_" + div_id + "_5pcap")
		.attr("width", cap_width)
		.transition()
		.duration(200)
		.attr("width", 0);
	}

	if (domain[1] >= (limits.right)-5) {
	    d3.select("#tnt_" + div_id + "_3pcap")
		.attr("width", cap_width)
		.transition()
		.duration(200)
		.attr("width", 0);
	}


	// Avoid moving past the limits
	if (domain[0] < limits.left) {
	    zoomEventHandler.translate([zoomEventHandler.translate()[0] - xScale(limits.left) + xScale.range()[0], zoomEventHandler.translate()[1]]);
	} else if (domain[1] > limits.right) {
	    zoomEventHandler.translate([zoomEventHandler.translate()[0] - xScale(limits.right) + xScale.range()[1], zoomEventHandler.translate()[1]]);
	}

	_deferred();

	for (var i = 0; i < tracks.length; i++) {
	    var track = tracks[i];
	    track.display().move.call(track,xScale);
	}
    };

    // api.method({
    // 	allow_drag : api_allow_drag,
    // 	width      : api_width,
    // 	add_track  : api_add_track,
    // 	reorder    : api_reorder,
    // 	zoom       : api_zoom,
    // 	left       : api_left,
    // 	right      : api_right,
    // 	start      : api_start
    // });

    // Auxiliar functions
    function move_to_front (elem) {
	elem.parentNode.appendChild(elem);
    }
    
    return track_vis;
};

module.exports = exports = board;

},{"tnt.api":3,"tnt.utils":12}],7:[function(require,module,exports){
var apijs = require ("tnt.api");
// var ensemblRestAPI = require("tnt.ensembl");

// var board = {};
// board.track = {};

var data = function() {
    "use strict";
    var _ = function () {
    };

    // Getters / Setters
    apijs (_)
	.getset ('label', "")
	.getset ('elements', [])
	.getset ('update', function () {});

    return _;
};

// The retrievers. They need to access 'elements'
data.retriever = {};

data.retriever.sync = function() {
    var update_track = function(obj) {
	// "this" is set to the data obj
        this.elements(update_track.retriever()(obj.loc));
        obj.on_success();
    };

    apijs (update_track)
	.getset ('retriever', function () {})

    return update_track;
};

data.retriever.async = function () {
    var url = '';

    // "this" is set to the data obj
    var data_obj = this;
    var update_track = function (obj) {
	d3.json(url, function (err, resp) {
	    data_obj.elements(resp);
	    obj.on_success();
	}); 
    };

    apijs (update_track)
	.getset ('url', '');

    return update_track;
};



// A predefined track for genes
// tnt.track.data.gene = function () {
//     var track = tnt.track.data();
// 	// .index("ID");

//     var updater = tnt.track.retriever.ensembl()
// 	.endpoint("region")
//     // TODO: If success is defined here, means that it can't be user-defined
//     // is that good? enough? API?
//     // UPDATE: Now success is backed up by an array. Still don't know if this is the best option
// 	.success(function(genes) {
// 	    for (var i = 0; i < genes.length; i++) {
// 		if (genes[i].strand === -1) {  
// 		    genes[i].display_label = "<" + genes[i].external_name;
// 		} else {
// 		    genes[i].display_label = genes[i].external_name + ">";
// 		}
// 	    }
// 	});

//     return track.update(updater);
// }

// A predefined track displaying no external data
// it is used for location and axis tracks for example
data.empty = function () {
    var track = data();
    var updater = data.retriever.sync();
    track.update(updater);

    return track;
};

module.exports = exports = data;

},{"tnt.api":3}],8:[function(require,module,exports){
var apijs = require ("tnt.api");
var layout = require("./layout.js");

// FEATURE VIS
// var board = {};
// board.track = {};
var tnt_feature = function () {
    ////// Vars exposed in the API
    var exports = {
	create   : function () {throw "create_elem is not defined in the base feature object"},
	mover    : function () {throw "move_elem is not defined in the base feature object"},
	updater  : function () {},
	on_click : function () {},
	on_mouseover : function () {},
	guider   : function () {},
	index    : undefined,
	layout   : layout.identity(),
	foreground_color : '#000'
    };


    // The returned object
    var feature = {};

    var reset = function () {
    	var track = this;
    	track.g.selectAll(".tnt_elem").remove();
	track.g.selectAll(".tnt_guider").remove();
    };

    var init = function (width) {
	var track = this;
	exports.guider.call(track, width);
    };

    var plot = function (new_elems, track, xScale) {
	new_elems.on("click", exports.on_click);
	new_elems.on("mouseover", exports.on_mouseover);
	// new_elem is a g element where the feature is inserted
	exports.create.call(track, new_elems, xScale);
    };

    var update = function (xScale, field) {
	var track = this;
	var svg_g = track.g;
	var layout = exports.layout;

	var elements = track.data().elements();

	if (field !== undefined) {
	    elements = elements[field];
	}

	layout(elements, xScale);
	var data_elems = layout.elements();

	var vis_sel;
	var vis_elems;
	if (field !== undefined) {
	    vis_sel = svg_g.selectAll(".tnt_elem_" + field);
	} else {
	    vis_sel = svg_g.selectAll(".tnt_elem");
	}

	if (exports.index) { // Indexing by field
	    vis_elems = vis_sel
		.data(data_elems, function (d) {
		    if (d !== undefined) {
			return exports.index(d);
		    }
		})
	} else { // Indexing by position in array
	    vis_elems = vis_sel
		.data(data_elems)
	}

	exports.updater.call(track, vis_elems, xScale);

	var new_elem = vis_elems
	    .enter();

	new_elem
	    .append("g")
	    .attr("class", "tnt_elem")
	    .classed("tnt_elem_" + field, field)
	    .call(feature.plot, track, xScale);

	vis_elems
	    .exit()
	    .remove();
    };

    var move = function (xScale, field) {
	var track = this;
	var svg_g = track.g;
	var elems;
	// TODO: Is selecting the elements to move too slow?
	// It would be nice to profile
	if (field !== undefined) {
	    elems = svg_g.selectAll(".tnt_elem_" + field);
	} else {
	    elems = svg_g.selectAll(".tnt_elem");
	}

	exports.mover.call(this, elems, xScale);
    };

    var move_to_front = function (field) {
	if (field !== undefined) {
	    var track = this;
	    var svg_g = track.g;
	    svg_g.selectAll(".tnt_elem_" + field).move_to_front();
	}
    };

    // API
    apijs (feature)
	.getset (exports)
	.method ({
	    reset  : reset,
	    plot   : plot,
	    update : update,
	    move   : move,
	    init   : init,
	    move_to_front : move_to_front
	});

    return feature;
};

tnt_feature.composite = function () {
    var displays = {};
    var display_order = [];

    var features = {};

    var reset = function () {
	var track = this;
	for (var i=0; i<displays.length; i++) {
	    displays[i].reset.call(track);
	}
    };

    var init = function (width) {
	var track = this;
 	for (var display in displays) {
	    if (displays.hasOwnProperty(display)) {
		displays[display].init.call(track, width);
	    }
	}
    };

    var update = function (xScale) {
	var track = this;
	for (var i=0; i<display_order.length; i++) {
	    displays[display_order[i]].update.call(track, xScale, display_order[i]);
	    displays[display_order[i]].move_to_front.call(track, display_order[i]);
	}
	// for (var display in displays) {
	//     if (displays.hasOwnProperty(display)) {
	// 	displays[display].update.call(track, xScale, display);
	//     }
	// }
    };

    var move = function (xScale) {
	var track = this;
	for (var display in displays) {
	    if (displays.hasOwnProperty(display)) {
		displays[display].move.call(track, xScale, display);
	    }
	}
    };

    var add = function (key, display) {
	displays[key] = display;
	display_order.push(key);
	return features;
    };

    // API
    apijs (features)
	.method ({
	    reset  : reset,
	    update : update,
	    move   : move,
	    init   : init,
	    add    : add
	});


    return features;
};

tnt_feature.sequence = function () {
    // 'Inherit' from tnt.track.feature
    var feature = tnt_feature();

    var config = {
	fontsize : 10,
	sequence : function (d) {
	    return d.sequence
	}
    };

    var api = apijs (feature)
	.getset (config);


    feature.create (function (new_nts, xScale) {
	var track = this;

	new_nts
	    .append("text")
	    .attr("fill", track.background_color())
	    .style('font-size', config.fontsize + "px")
	    .attr("x", function (d) {
		return xScale (d.pos);
	    })
	    .attr("y", function (d) {
		return ~~(track.height() / 2) + 5; 
	    })
	    .text(config.sequence)
	    .transition()
	    .duration(500)
	    .attr('fill', feature.foreground_color());
    });

    feature.mover (function (nts, xScale) {
	nts.select ("text")
	    .attr("x", function (d) {
		return xScale(d.pos);
	    });
    });

    return feature;
};

tnt_feature.area = function () {
    var feature = tnt_feature.line();
    var line = tnt_feature.line();

    var area = d3.svg.area()
	.interpolate(line.interpolate())
	.tension(feature.tension());

    var data_points;

    var line_create = feature.create(); // We 'save' line creation
    feature.create (function (points, xScale) {
	var track = this;

	if (data_points !== undefined) {
//	     return;
	    track.g.select("path").remove();
	}

	line_create.call(track, points, xScale);

	area
	    .x(line.x())
	    .y1(line.y())
	    .y0(track.height());

	data_points = points.data();
	points.remove();

	track.g
	    .append("path")
	    .attr("class", "tnt_area")
	    .classed("tnt_elem", true)
	    .datum(data_points)
	    .attr("d", area)
	    .attr("fill", d3.rgb(feature.foreground_color()).brighter());
	
    });

    var line_mover = feature.mover();
    feature.mover (function (path, xScale) {
	var track = this;
	line_mover.call(track, path, xScale);

	area.x(line.x());
	track.g
	    .select(".tnt_area")
	    .datum(data_points)
	    .attr("d", area);
    });

    return feature;

};

tnt_feature.line = function () {
    var feature = tnt_feature();

    var x = function (d) {
	return d.pos;
    };
    var y = function (d) {
	return d.val;
    };
    var tension = 0.7;
    var yScale = d3.scale.linear();
    var line = d3.svg.line()
	.interpolate("basis");

    // line getter. TODO: Setter?
    feature.line = function () {
	return line;
    };

    feature.x = function (cbak) {
	if (!arguments.length) {
	    return x;
	}
	x = cbak;
	return feature;
    };

    feature.y = function (cbak) {
	if (!arguments.length) {
	    return y;
	}
	y = cbak;
	return feature;
    };

    feature.tension = function (t) {
	if (!arguments.length) {
	    return tension;
	}
	tension = t;
	return feature;
    };

    var data_points;

    // For now, create is a one-off event
    // TODO: Make it work with partial paths, ie. creating and displaying only the path that is being displayed
    feature.create (function (points, xScale) {
	var track = this;

	if (data_points !== undefined) {
	    // return;
	    track.g.select("path").remove();
	}

	line
	    .tension(tension)
	    .x(function (d) {return xScale(x(d))})
	    .y(function (d) {return track.height() - yScale(y(d))})

	data_points = points.data();
	points.remove();

	yScale
	    .domain([0, 1])
	    // .domain([0, d3.max(data_points, function (d) {
	    // 	return y(d);
	    // })])
	    .range([0, track.height() - 2]);
	
	track.g
	    .append("path")
	    .attr("class", "tnt_elem")
	    .attr("d", line(data_points))
	    .style("stroke", feature.foreground_color())
	    .style("stroke-width", 4)
	    .style("fill", "none");

    });

    feature.mover (function (path, xScale) {
	var track = this;

	line.x(function (d) {
	    return xScale(x(d))
	});
	track.g.select("path")
	    .attr("d", line(data_points));
    });

    return feature;
};

tnt_feature.conservation = function () {
    // 'Inherit' from feature.area
    var feature = tnt_feature.area();

    var area_create = feature.create(); // We 'save' area creation
    feature.create  (function (points, xScale) {
	var track = this;

	area_create.call(track, d3.select(points[0][0]), xScale)
    });

    return feature;
};

tnt_feature.ensembl = function () {
    // 'Inherit' from board.track.feature
    var feature = tnt_feature();

    var foreground_color2 = "#7FFF00";
    var foreground_color3 = "#00BB00";

    feature.guider (function (width) {
	var track = this;
	var height_offset = ~~(track.height() - (track.height()  * .8)) / 2;

	track.g
	    .append("line")
	    .attr("class", "tnt_guider")
	    .attr("x1", 0)
	    .attr("x2", width)
	    .attr("y1", height_offset)
	    .attr("y2", height_offset)
	    .style("stroke", feature.foreground_color())
	    .style("stroke-width", 1);

	track.g
	    .append("line")
	    .attr("class", "tnt_guider")
	    .attr("x1", 0)
	    .attr("x2", width)
	    .attr("y1", track.height() - height_offset)
	    .attr("y2", track.height() - height_offset)
	    .style("stroke", feature.foreground_color())
	    .style("stroke-width", 1);

    });

    feature.create (function (new_elems, xScale) {
	var track = this;

	var height_offset = ~~(track.height() - (track.height()  * .8)) / 2;

	new_elems
	    .append("rect")
	    .attr("x", function (d) {
		return xScale (d.start);
	    })
	    .attr("y", height_offset)
// 	    .attr("rx", 3)
// 	    .attr("ry", 3)
	    .attr("width", function (d) {
		return (xScale(d.end) - xScale(d.start));
	    })
	    .attr("height", track.height() - ~~(height_offset * 2))
	    .attr("fill", track.background_color())
	    .transition()
	    .duration(500)
	    .attr("fill", function (d) { 
		if (d.type === 'high') {
		    return d3.rgb(feature.foreground_color());
		}
		if (d.type === 'low') {
		    return d3.rgb(feature.foreground_color2());
		}
		return d3.rgb(feature.foreground_color3());
	    });
    });

    feature.updater (function (blocks, xScale) {
	blocks
	    .select("rect")
	    .attr("width", function (d) {
		return (xScale(d.end) - xScale(d.start))
	    });
    });

    feature.mover (function (blocks, xScale) {
	blocks
	    .select("rect")
	    .attr("x", function (d) {
		return xScale(d.start);
	    })
	    .attr("width", function (d) {
		return (xScale(d.end) - xScale(d.start));
	    });
    });

    feature.foreground_color2 = function (col) {
	if (!arguments.length) {
	    return foreground_color2;
	}
	foreground_color2 = col;
	return feature;
    };

    feature.foreground_color3 = function (col) {
	if (!arguments.length) {
	    return foreground_color3;
	}
	foreground_color3 = col;
	return feature;
    };

    return feature;
};

tnt_feature.vline = function () {
    // 'Inherit' from feature
    var feature = tnt_feature();

    feature.create (function (new_elems, xScale) {
	var track = this;
	new_elems
	    .append ("line")
	    .attr("x1", function (d) {
		// TODO: Should use the index value?
		return xScale(feature.index()(d))
	    })
	    .attr("x2", function (d) {
		return xScale(feature.index()(d))
	    })
	    .attr("y1", 0)
	    .attr("y2", track.height())
	    .attr("stroke", feature.foreground_color())
	    .attr("stroke-width", 1);
    });

    feature.mover (function (vlines, xScale) {
	vlines
	    .select("line")
	    .attr("x1", function (d) {
		return xScale(feature.index()(d));
	    })
	    .attr("x2", function (d) {
		return xScale(feature.index()(d));
	    });
    });

    return feature;

};

tnt_feature.block = function () {
    // 'Inherit' from board.track.feature
    var feature = tnt_feature();

    apijs(feature)
	.getset('from', function (d) {
	    return d.start;
	})
	.getset('to', function (d) {
	    return d.end;
	});

    feature.create(function (new_elems, xScale) {
	var track = this;
	new_elems
	    .append("rect")
	    .attr("x", function (d, i) {
		// TODO: start, end should be adjustable via the tracks API
		return xScale(feature.from()(d, i));
	    })
	    .attr("y", 0)
	    .attr("width", function (d, i) {
		return (xScale(feature.to()(d, i)) - xScale(feature.from()(d, i)));
	    })
	    .attr("height", track.height())
	    .attr("fill", track.background_color())
	    .transition()
	    .duration(500)
	    .attr("fill", function (d) {
		if (d.color === undefined) {
		    return feature.foreground_color();
		} else {
		    return d.color;
		}
	    });
    });

    feature.updater(function (elems, xScale) {
	elems
	    .select("rect")
	    .attr("width", function (d) {
		return (xScale(d.end) - xScale(d.start));
	    });
    });

    feature.mover(function (blocks, xScale) {
	blocks
	    .select("rect")
	    .attr("x", function (d) {
		return xScale(d.start);
	    })
	    .attr("width", function (d) {
		return (xScale(d.end) - xScale(d.start));
	    });
    });

    return feature;

};

tnt_feature.axis = function () {
    var xAxis;
    var orientation = "top";

    // Axis doesn't inherit from feature
    var feature = {};
    feature.reset = function () {
	xAxis = undefined;
	var track = this;
	track.g.selectAll("rect").remove();
	track.g.selectAll(".tick").remove();
    };
    feature.plot = function () {};
    feature.move = function () {
	var track = this;
	var svg_g = track.g;
	svg_g.call(xAxis);
    }
    
    feature.init = function () {};

    feature.update = function (xScale) {
	// Create Axis if it doesn't exist
	if (xAxis === undefined) {
	    xAxis = d3.svg.axis()
		.scale(xScale)
		.orient(orientation);
	}

	var track = this;
	var svg_g = track.g;
	svg_g.call(xAxis);
    };

    feature.orientation = function (pos) {
	if (!arguments.length) {
	    return orientation;
	}
	orientation = pos;
	return feature;
    };

    return feature;
};

tnt_feature.location = function () {
    var row;

    var feature = {};
    feature.reset = function () {};
    feature.plot = function () {};
    feature.init = function () {};
    feature.move = function(xScale) {
	var domain = xScale.domain();
	row.select("text")
	    .text("Location: " + ~~domain[0] + "-" + ~~domain[1]);
    };

    feature.update = function (xScale) {
	var track = this;
	var svg_g = track.g;
	var domain = xScale.domain();
	if (row === undefined) {
	    row = svg_g;
	    row
		.append("text")
		.text("Location: " + ~~domain[0] + "-" + ~~domain[1]);
	}
    };

    return feature;
};

module.exports = exports = tnt_feature;

},{"./layout.js":10,"tnt.api":3}],9:[function(require,module,exports){
var board = require ("./board.js");
board.track = require ("./track");
board.track.data = require ("./data.js");
board.track.layout = require ("./layout.js");
board.track.feature = require ("./feature.js");

module.exports = exports = board;

},{"./board.js":6,"./data.js":7,"./feature.js":8,"./layout.js":10,"./track":11}],10:[function(require,module,exports){
var apijs = require ("tnt.api");

// var board = {};
// board.track = {};
layout = {};

layout.identity = function () {
    // vars exposed in the API:
    var elements;

    // The returned closure / object
    var l = function (new_elements) {
	elements = new_elements;
    }

    var api = apijs (l)
	.method ({
	    height   : function () {},
	    elements : function () {
		return elements;
	    }
	});

    return l;
};

module.exports = exports = layout;

},{"tnt.api":3}],11:[function(require,module,exports){
var apijs = require ("tnt.api");
var iterator = require("tnt.utils").iterator;

//var board = {};

var track = function () {
    "use strict";

    var read_conf = {
	// Unique ID for this track
	id : track.id()
    };

    var display;

    var conf = {
	// foreground_color : d3.rgb('#000000'),
	background_color : d3.rgb('#CCCCCC'),
	height           : 250,
	// data is the object (normally a tnt.track.data object) used to retrieve and update data for the track
	data             : track.data.empty()
    };

    // The returned object / closure
    var _ = function() {
    };

    // API
    var api = apijs (_)
	.getset (conf)
	.get (read_conf);

    // TODO: This means that height should be defined before display
    // we shouldn't rely on this
    _.display = function (new_plotter) {
	if (!arguments.length) {
	    return display;
	}
	display = new_plotter;
	if (typeof (display) === 'function') {
	    display.layout && display.layout().height(conf.height);	    
	} else {
	    for (var key in display) {
		if (display.hasOwnProperty(key)) {
		    display[key].layout && display[key].layout().height(conf.height);
		}
	    }
	}

	return _;
    };

    return _;

};

track.id = iterator(1);

module.exports = exports = track;

},{"tnt.api":3,"tnt.utils":12}],12:[function(require,module,exports){
module.exports = require("./src/index.js");

},{"./src/index.js":13}],13:[function(require,module,exports){
// require('fs').readdirSync(__dirname + '/').forEach(function(file) {
//     if (file.match(/.+\.js/g) !== null && file !== __filename) {
// 	var name = file.replace('.js', '');
// 	module.exports[name] = require('./' + file);
//     }
// });

// Same as
var utils = require("./utils.js");
utils.reduce = require("./reduce.js");
module.exports = exports = utils;

},{"./reduce.js":14,"./utils.js":15}],14:[function(require,module,exports){
var reduce = function () {
    var smooth = 5;
    var value = 'val';
    var redundant = function (a, b) {
	if (a < b) {
	    return ((b-a) <= (b * 0.2));
	}
	return ((a-b) <= (a * 0.2));
    };
    var perform_reduce = function (arr) {return arr;};

    var reduce = function (arr) {
	if (!arr.length) {
	    return arr;
	}
	var smoothed = perform_smooth(arr);
	var reduced  = perform_reduce(smoothed);
	return reduced;
    };

    var median = function (v, arr) {
	arr.sort(function (a, b) {
	    return a[value] - b[value];
	});
	if (arr.length % 2) {
	    v[value] = arr[~~(arr.length / 2)][value];	    
	} else {
	    var n = ~~(arr.length / 2) - 1;
	    v[value] = (arr[n][value] + arr[n+1][value]) / 2;
	}

	return v;
    };

    var clone = function (source) {
	var target = {};
	for (var prop in source) {
	    if (source.hasOwnProperty(prop)) {
		target[prop] = source[prop];
	    }
	}
	return target;
    };

    var perform_smooth = function (arr) {
	if (smooth === 0) { // no smooth
	    return arr;
	}
	var smooth_arr = [];
	for (var i=0; i<arr.length; i++) {
	    var low = (i < smooth) ? 0 : (i - smooth);
	    var high = (i > (arr.length - smooth)) ? arr.length : (i + smooth);
	    smooth_arr[i] = median(clone(arr[i]), arr.slice(low,high+1));
	}
	return smooth_arr;
    };

    reduce.reducer = function (cbak) {
	if (!arguments.length) {
	    return perform_reduce;
	}
	perform_reduce = cbak;
	return reduce;
    };

    reduce.redundant = function (cbak) {
	if (!arguments.length) {
	    return redundant;
	}
	redundant = cbak;
	return reduce;
    };

    reduce.value = function (val) {
	if (!arguments.length) {
	    return value;
	}
	value = val;
	return reduce;
    };

    reduce.smooth = function (val) {
	if (!arguments.length) {
	    return smooth;
	}
	smooth = val;
	return reduce;
    };

    return reduce;
};

var block = function () {
    var red = reduce()
	.value('start');

    var value2 = 'end';

    var join = function (obj1, obj2) {
        return {
            'object' : {
                'start' : obj1.object[red.value()],
                'end'   : obj2[value2]
            },
            'value'  : obj2[value2]
        };
    };

    // var join = function (obj1, obj2) { return obj1 };

    red.reducer( function (arr) {
	var value = red.value();
	var redundant = red.redundant();
	var reduced_arr = [];
	var curr = {
	    'object' : arr[0],
	    'value'  : arr[0][value2]
	};
	for (var i=1; i<arr.length; i++) {
	    if (redundant (arr[i][value], curr.value)) {
		curr = join(curr, arr[i]);
		continue;
	    }
	    reduced_arr.push (curr.object);
	    curr.object = arr[i];
	    curr.value = arr[i].end;
	}
	reduced_arr.push(curr.object);

	// reduced_arr.push(arr[arr.length-1]);
	return reduced_arr;
    });

    reduce.join = function (cbak) {
	if (!arguments.length) {
	    return join;
	}
	join = cbak;
	return red;
    };

    reduce.value2 = function (field) {
	if (!arguments.length) {
	    return value2;
	}
	value2 = field;
	return red;
    };

    return red;
};

var line = function () {
    var red = reduce();

    red.reducer ( function (arr) {
	var redundant = red.redundant();
	var value = red.value();
	var reduced_arr = [];
	var curr = arr[0];
	for (var i=1; i<arr.length-1; i++) {
	    if (redundant (arr[i][value], curr[value])) {
		continue;
	    }
	    reduced_arr.push (curr);
	    curr = arr[i];
	}
	reduced_arr.push(curr);
	reduced_arr.push(arr[arr.length-1]);
	return reduced_arr;
    });

    return red;

};

module.exports = reduce;
module.exports.line = line;
module.exports.block = block;


},{}],15:[function(require,module,exports){

module.exports = {
    iterator : function(init_val) {
	var i = init_val || 0;
	var iter = function () {
	    return i++;
	};
	return iter;
    },

    script_path : function (script_name) { // script_name is the filename
	var script_scaped = script_name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
	var script_re = new RegExp(script_scaped + '$');
	var script_re_sub = new RegExp('(.*)' + script_scaped + '$');

	// TODO: This requires phantom.js or a similar headless webkit to work (document)
	var scripts = document.getElementsByTagName('script');
	var path = "";  // Default to current path
	if(scripts !== undefined) {
            for(var i in scripts) {
		if(scripts[i].src && scripts[i].src.match(script_re)) {
                    return scripts[i].src.replace(script_re_sub, '$1');
		}
            }
	}
	return path;
    },

    defer_cancel : function (cbak, time) {
	var tick;

	var defer_cancel = function () {
	    clearTimeout(tick);
	    tick = setTimeout(cbak, time);
	};

	return defer_cancel;
    }
};

},{}],16:[function(require,module,exports){
var apijs = require ("tnt.api");
var board = require ("tnt.board");
var iterator = require("tnt.utils").iterator;

var tnt_legend = function (div) {

    d3.select(div)
	.attr("class", "tnt_framed");

    var opts = {
	row_height : 20,
	width      : 140,
	fontsize   : 12
    };

    var id = iterator(1);
    var legend_cols = [];

    var _ = function () {
	for (var i=0; i<legend_cols.length; i++) {
	    var col = legend_cols[i];
	    col.board(col.div);
	    col.board.start();
	}
    };

    var api = apijs (_)
	.getset(opts);

    api.method ('add_column', function () {
	var div_id = d3.select(div)
	    .style("display", "table")
	    .attr("id");

	var new_div = d3.select(div)
	    .append("div")
	    .attr("id", div_id + "_" + id())
	    .style("display", "table-cell");

	var new_board = board()
	    .right(2)
	    .from (1)
	    .to (2)
	    .allow_drag (false)
	    .show_frame (false)
	    .width (opts.width);

	new_board.add_row = new_board.add_track;

	legend_cols.push ({
	    'div' : new_div.node(),
	    'board' : new_board
	});

	return new_board;
    });

    api.method ('header', function (text) {
	var feature = board.track.feature();

	feature.create (function (g, xScale) {
	    var track = this;
	    g
		.append("text")
		.attr("fill", "black")
		.attr("font-size", track.fontsize())
		.attr("x", xScale(1))
		.attr("y", ~~track.height()/2)
		.attr("font-weight", "bold")
		.text(track.text());
	});

	var track = legend_track()
	    .display (feature);

	return track;
    });

    api.method ('text', function () {
	var track = legend_track()
	    .deploy (function () {
		var g = this;
		d3.select(g)
		    .append("text")
		    .attr("x", 0)
		    .attr("y", ~~(track.height() / 2) + 4)
		    .attr("fill", track.color())
		    .attr("font-size", track.fontsize())
		    .text(track.feature_text());
	    });

	apijs (track)
	    .getset ('feature_text', '');
	
	return track;
    });

    api.method ('hline', function () {
	var track = legend_track()
	    .deploy (function () {
		var g = this;
		d3.select(g)
		    .append("line")
		    .attr("x1", 0)
		    .attr("x2", track.feature_width())
		    .attr("y1", ~~(track.height()/2))
		    .attr("y2", ~~(track.height()/2))
		    .attr("stroke-width", 2)
		    .attr("stroke", track.color());
	    });

	return track;

    });

    api.method ('vline', function () {
	var track = legend_track()
	    .deploy (function () {
		var g = this;
		d3.select(g)
		    .append("line")
		    .attr("stroke", track.color())
		    .attr("stroke-width", 2)
		    .attr("x1", 5)
		    .attr("x2", 5)
		    .attr("y1", 0)
		    .attr("y2", track.height());
	    });

	return track;
    });

    api.method ('square', function () {
	var track = legend_track()
	    .deploy (function () {
		var w_h = ~~(track.height()*0.8);
		var g = this;
		d3.select(g)
		    .append("rect")
		    .attr("x", 0)
		    .attr("y", track.height() - w_h)
		    .attr("width", w_h)
		    .attr("height", w_h)
		    .attr("fill", track.color());
	    });

	return track;
    });

    api.method ('circle', function () {
	var feature = board.track.feature()
	feature.create (function (g, xScale) {
	    var track = this;
	    var rad = ~~(track.height()/2);
	    g
		.append("circle")
		.attr("cx", rad)
		.attr("cy", ~~(rad/2))
		.attr("r", rad-2)
		.attr("fill", track.color());
	    g
		.append("text")
		.attr("fill", "black")
		.attr("font-size", track.fontsize())
		.attr("x", 40)
		.attr("y", ~~(track.height()/2 + 4))
		.text(track.text());
	});

	var track = legend_track()
	    .display (feature);

	return track;
    });

    api.method ('gradient', function () {
	var feature = board.track.feature()
	feature.create (function (g, xScale) {
	    var grad_width = 100;
	    var track = this;
	    var gradient = g
		.append("linearGradient")
		.attr("x1", "0%")
		.attr("x2", "100%")
		.attr("y1", "0%")
		.attr("y2", "0%")
		.attr("id", d3.select(div).attr("id") + "_gradient");

	    gradient
		.append("stop")
		.attr("offset", "0%")
		.attr("stop-color", track.color1())
		.attr("stop-opacity", 1);

	    gradient
		.append("stop")
		.attr("offset", "100%")
		.attr("stop-color", track.color2())
		.attr("stop-opacity", 1);

	    var scale = d3.scale.linear()
		.domain([track.from(), track.to()])
		.range([0,grad_width]);
	    var axis = d3.svg.axis().scale(scale).tickSize(0).ticks(3);
	    var grad_g = g
		.append("g")
		.attr("transform", "translate(5,0)");

	    var axis_g = g
		.append("g")
		.attr("transform", "translate(5," + (track.height()-10) + ")")
		.call(axis);

	    grad_g
		.append("rect")
		.attr("x", 0)
		.attr("y", 0)
		.attr("width", grad_width)
		.attr("height", ~~(track.height()-10))
		.attr("fill", "url(#" + d3.select(div).attr("id") + "_gradient)");

	    grad_g
		.append("text")
		.attr("fill", "black")
		.attr("font-size", track.fontsize())
		.attr("x", 110)
		.attr("y", ~~(track.height()/2))
		.text(track.text());
	});

	// the general track
	var track = legend_track()
	    .display (feature);
	track.color = undefined;
	var api = apijs(track);
	api
	    .getset ("color1", "yellow")
	    .getset ("color2", "red")
	    .getset ("from", 0)
	    .getset ("to", 100)

	return track;
    });


    api.method ('range', function () {
	var feature = board.track.feature()
	feature.create (function (g, xScale) {
	    var track = this;
	    var grad_width = 100;
	    var gradient = g
		.append("linearGradient")
		.attr("x1", "0%")
		.attr("x2", "100%")
		.attr("y1", "0%")
		.attr("y2", "0%")
		.attr("id", d3.select(div).attr("id") + "_range");
	    gradient
		.append("stop")
		.attr("offset", "0%")
		.attr("stop-color", track.color1())
		.attr("stop-opacity", 1);
	    gradient
		.append("stop")
		.attr("offset", "100%")
		.attr("stop-color", track.color2())
		.attr("stop-opacity", 1);

	    var scale = d3.scale.linear()
		.domain([track.from(), track.to()])
		.range([0, grad_width]);

	    var brush = d3.svg.brush()
		.x(scale)
		.extent([track.from(), track.to()])
		.on("brushstart", brushstart)
		.on("brush", brushmove)
		.on("brushend", brushend);

	    var brushg = g
		.append("g")
		.attr("transform", "translate(5,5)")
		.call (brush);

	    brushg.selectAll(".resize").append("line")
		.attr("x1", 0)
		.attr("y1", 0)
		.attr("x2", 0)
		.attr("y2", (track.height()/2 - 2))
		.style("stroke", "black")
		.style("stroke-width", 2);

	    brushg.selectAll(".resize").append("path")
		.attr("d", "M0,0L-3,-4L3,-4L0,0")
		.attr("fill", "black");

	    brushg.selectAll ("rect")
		.classed("tnt_legend_range", true)
		.attr("height", track.height()/2 - 2)
		.attr("fill", "url(#" + d3.select(div).attr("id") + "_range)");

	    brushg
		.append("rect")
		.attr("class", "tnt_legend_range_pre")
		.attr("x", 0)
		.attr("y", 0)
		.attr("height", track.height()/2 - 2)
		.attr("fill", track.color1());

	    brushg
		.append("rect")
		.attr("class", "tnt_legend_range_post")
		.attr("y", 0)
		.attr("height", track.height()/2 - 2)
		.attr("fill", track.color2());

	    brushstart();
	    brushmove();

	    var axis = d3.svg.axis().scale(scale).tickSize(0).ticks(3);
	    var axis_g = g
		.append("g")
		.attr("transform", "translate(5," + (track.height()-10) + ")")
		.call(axis);

	    g
		.append("text")
		.attr("fill", "black")
		.attr("font-size", track.fontsize())
		.attr("x", 115)
		.attr("y", ~~(track.height()/2 + 3))
		.text(track.text());

	    function brushstart () {
	    }
	    function brushmove () {
		console.log(brush.extent());
		brushg.selectAll (".tnt_legend_rect")
		    .attr("fill", "url(#" + d3.select(div).attr("id") + "_range)");
		brushg.selectAll (".tnt_legend_range_pre")
		    .attr("width", scale(brush.extent()[0])-1)
		brushg.selectAll (".tnt_legend_range_post")
		    .attr("x", scale(brush.extent()[1])+1)
		    .attr("width",  grad_width - scale(brush.extent()[1]));
		track.on_change().call(brush);
	    }
	    function brushend () {
		console.log(brush.extent());
	    }

	});

	var track = legend_track()
	    .display (feature);
	track.color = undefined;
	var api = apijs(track);
	api
	    .getset ("color1", "yellow")
	    .getset ("color2", "red")
	    .getset ("from", 0)
	    .getset ("to", 100)
	    .getset ("on_change", function (){});

	return track;
    });


    api.method ('empty', function (color, desc) {
	var track = board.track()
	    .height(opts.row_height)
	    .background_color("white")
	    .data(null)
	    .display(null);

	return track;
    });

    var legend_track = function () {
	var feature = board.track.feature();
	feature.create (function (g, xScale) {
	    var track = this;
	    // feature
	    var feature_g = g
		.append("g");
	    
	    track.deploy().call(feature_g.node());

	    // label
	    g
		.append("g")
		.attr("transform", "translate(" + (track.feature_width() + 5) + ", 0)")
		.append("text")
		.attr("fill", "black")
		.attr("x", 0)
		.attr("y", ~~(track.height()/2) + 4) // TODO: Don't hardcode the 4
		.attr("font-size", track.fontsize())
		.text(track.text());
	});

	var track = board.track();

	var api = apijs (track)
	    .getset ('color', 'black')
	    .getset ('text', '')
	    .getset ('height', opts.row_height)
	    .getset ('fontsize', opts.fontsize)
	    .getset ('feature_width', 40)
	    .getset ('deploy', function () {
		throw ('deploy is not defined in the legend base class');
	    });

	track
	    .height (track.height())
	    .background_color ("white")
	    .data (board.track.data()
		   .update(
		       board.track.data.retriever.sync()
			   .retriever (function () {
			       return [{}];
			   })
		       )
		  )
	    .display (feature);

	return track;
    };

    return _;
};

module.exports = exports = tnt_legend;

},{"tnt.api":3,"tnt.board":5,"tnt.utils":12}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQubGVnZW5kL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQubGVnZW5kL2Zha2VfNWQyYzQwNWIuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50LmxlZ2VuZC9pbmRleC5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQubGVnZW5kL25vZGVfbW9kdWxlcy90bnQuYXBpL2luZGV4LmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5sZWdlbmQvbm9kZV9tb2R1bGVzL3RudC5hcGkvc3JjL2FwaS5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQubGVnZW5kL25vZGVfbW9kdWxlcy90bnQuYm9hcmQvaW5kZXguanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50LmxlZ2VuZC9ub2RlX21vZHVsZXMvdG50LmJvYXJkL3NyYy9ib2FyZC5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQubGVnZW5kL25vZGVfbW9kdWxlcy90bnQuYm9hcmQvc3JjL2RhdGEuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50LmxlZ2VuZC9ub2RlX21vZHVsZXMvdG50LmJvYXJkL3NyYy9mZWF0dXJlLmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5sZWdlbmQvbm9kZV9tb2R1bGVzL3RudC5ib2FyZC9zcmMvaW5kZXguanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50LmxlZ2VuZC9ub2RlX21vZHVsZXMvdG50LmJvYXJkL3NyYy9sYXlvdXQuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50LmxlZ2VuZC9ub2RlX21vZHVsZXMvdG50LmJvYXJkL3NyYy90cmFjay5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQubGVnZW5kL25vZGVfbW9kdWxlcy90bnQudXRpbHMvaW5kZXguanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50LmxlZ2VuZC9ub2RlX21vZHVsZXMvdG50LnV0aWxzL3NyYy9pbmRleC5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQubGVnZW5kL25vZGVfbW9kdWxlcy90bnQudXRpbHMvc3JjL3JlZHVjZS5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQubGVnZW5kL25vZGVfbW9kdWxlcy90bnQudXRpbHMvc3JjL3V0aWxzLmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5sZWdlbmQvc3JjL2xlZ2VuZC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JpQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNEQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJpZiAodHlwZW9mIHRudCA9PT0gXCJ1bmRlZmluZWRcIikge1xuICAgIG1vZHVsZS5leHBvcnRzID0gdG50ID0ge307XG59XG5cbnRudC5sZWdlbmQgPSByZXF1aXJlKFwiLi9pbmRleC5qc1wiKTtcbiIsIi8vIGlmICh0eXBlb2YgdG50ID09PSBcInVuZGVmaW5lZFwiKSB7XG4vLyAgICAgbW9kdWxlLmV4cG9ydHMgPSB0bnQgPSB7fTtcbi8vIH1cbi8vIHRudC5sZWdlbmQgPSByZXF1aXJlKFwiLi9zcmMvbGVnZW5kLmpzXCIpO1xuXG52YXIgbGVnZW5kID0gcmVxdWlyZShcIi4vc3JjL2xlZ2VuZC5qc1wiKTtcbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IGxlZ2VuZDtcbiIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcIi4vc3JjL2FwaS5qc1wiKTtcbiIsInZhciBhcGkgPSBmdW5jdGlvbiAod2hvKSB7XG5cbiAgICB2YXIgX21ldGhvZHMgPSBmdW5jdGlvbiAoKSB7XG5cdHZhciBtID0gW107XG5cblx0bS5hZGRfYmF0Y2ggPSBmdW5jdGlvbiAob2JqKSB7XG5cdCAgICBtLnVuc2hpZnQob2JqKTtcblx0fTtcblxuXHRtLnVwZGF0ZSA9IGZ1bmN0aW9uIChtZXRob2QsIHZhbHVlKSB7XG5cdCAgICBmb3IgKHZhciBpPTA7IGk8bS5sZW5ndGg7IGkrKykge1xuXHRcdGZvciAodmFyIHAgaW4gbVtpXSkge1xuXHRcdCAgICBpZiAocCA9PT0gbWV0aG9kKSB7XG5cdFx0XHRtW2ldW3BdID0gdmFsdWU7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHQgICAgfVxuXHRcdH1cblx0ICAgIH1cblx0ICAgIHJldHVybiBmYWxzZTtcblx0fTtcblxuXHRtLmFkZCA9IGZ1bmN0aW9uIChtZXRob2QsIHZhbHVlKSB7XG5cdCAgICBpZiAobS51cGRhdGUgKG1ldGhvZCwgdmFsdWUpICkge1xuXHQgICAgfSBlbHNlIHtcblx0XHR2YXIgcmVnID0ge307XG5cdFx0cmVnW21ldGhvZF0gPSB2YWx1ZTtcblx0XHRtLmFkZF9iYXRjaCAocmVnKTtcblx0ICAgIH1cblx0fTtcblxuXHRtLmdldCA9IGZ1bmN0aW9uIChtZXRob2QpIHtcblx0ICAgIGZvciAodmFyIGk9MDsgaTxtLmxlbmd0aDsgaSsrKSB7XG5cdFx0Zm9yICh2YXIgcCBpbiBtW2ldKSB7XG5cdFx0ICAgIGlmIChwID09PSBtZXRob2QpIHtcblx0XHRcdHJldHVybiBtW2ldW3BdO1xuXHRcdCAgICB9XG5cdFx0fVxuXHQgICAgfVxuXHR9O1xuXG5cdHJldHVybiBtO1xuICAgIH07XG5cbiAgICB2YXIgbWV0aG9kcyAgICA9IF9tZXRob2RzKCk7XG4gICAgdmFyIGFwaSA9IGZ1bmN0aW9uICgpIHt9O1xuXG4gICAgYXBpLmNoZWNrID0gZnVuY3Rpb24gKG1ldGhvZCwgY2hlY2ssIG1zZykge1xuXHRpZiAobWV0aG9kIGluc3RhbmNlb2YgQXJyYXkpIHtcblx0ICAgIGZvciAodmFyIGk9MDsgaTxtZXRob2QubGVuZ3RoOyBpKyspIHtcblx0XHRhcGkuY2hlY2sobWV0aG9kW2ldLCBjaGVjaywgbXNnKTtcblx0ICAgIH1cblx0ICAgIHJldHVybjtcblx0fVxuXG5cdGlmICh0eXBlb2YgKG1ldGhvZCkgPT09ICdmdW5jdGlvbicpIHtcblx0ICAgIG1ldGhvZC5jaGVjayhjaGVjaywgbXNnKTtcblx0fSBlbHNlIHtcblx0ICAgIHdob1ttZXRob2RdLmNoZWNrKGNoZWNrLCBtc2cpO1xuXHR9XG5cdHJldHVybiBhcGk7XG4gICAgfTtcblxuICAgIGFwaS50cmFuc2Zvcm0gPSBmdW5jdGlvbiAobWV0aG9kLCBjYmFrKSB7XG5cdGlmIChtZXRob2QgaW5zdGFuY2VvZiBBcnJheSkge1xuXHQgICAgZm9yICh2YXIgaT0wOyBpPG1ldGhvZC5sZW5ndGg7IGkrKykge1xuXHRcdGFwaS50cmFuc2Zvcm0gKG1ldGhvZFtpXSwgY2Jhayk7XG5cdCAgICB9XG5cdCAgICByZXR1cm47XG5cdH1cblxuXHRpZiAodHlwZW9mIChtZXRob2QpID09PSAnZnVuY3Rpb24nKSB7XG5cdCAgICBtZXRob2QudHJhbnNmb3JtIChjYmFrKTtcblx0fSBlbHNlIHtcblx0ICAgIHdob1ttZXRob2RdLnRyYW5zZm9ybShjYmFrKTtcblx0fVxuXHRyZXR1cm4gYXBpO1xuICAgIH07XG5cbiAgICB2YXIgYXR0YWNoX21ldGhvZCA9IGZ1bmN0aW9uIChtZXRob2QsIG9wdHMpIHtcblx0dmFyIGNoZWNrcyA9IFtdO1xuXHR2YXIgdHJhbnNmb3JtcyA9IFtdO1xuXG5cdHZhciBnZXR0ZXIgPSBvcHRzLm9uX2dldHRlciB8fCBmdW5jdGlvbiAoKSB7XG5cdCAgICByZXR1cm4gbWV0aG9kcy5nZXQobWV0aG9kKTtcblx0fTtcblxuXHR2YXIgc2V0dGVyID0gb3B0cy5vbl9zZXR0ZXIgfHwgZnVuY3Rpb24gKHgpIHtcblx0ICAgIGZvciAodmFyIGk9MDsgaTx0cmFuc2Zvcm1zLmxlbmd0aDsgaSsrKSB7XG5cdFx0eCA9IHRyYW5zZm9ybXNbaV0oeCk7XG5cdCAgICB9XG5cblx0ICAgIGZvciAodmFyIGo9MDsgajxjaGVja3MubGVuZ3RoOyBqKyspIHtcblx0XHRpZiAoIWNoZWNrc1tqXS5jaGVjayh4KSkge1xuXHRcdCAgICB2YXIgbXNnID0gY2hlY2tzW2pdLm1zZyB8fCBcblx0XHRcdChcIlZhbHVlIFwiICsgeCArIFwiIGRvZXNuJ3Qgc2VlbSB0byBiZSB2YWxpZCBmb3IgdGhpcyBtZXRob2RcIik7XG5cdFx0ICAgIHRocm93IChtc2cpO1xuXHRcdH1cblx0ICAgIH1cblx0ICAgIG1ldGhvZHMuYWRkKG1ldGhvZCwgeCk7XG5cdH07XG5cblx0dmFyIG5ld19tZXRob2QgPSBmdW5jdGlvbiAobmV3X3ZhbCkge1xuXHQgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG5cdFx0cmV0dXJuIGdldHRlcigpO1xuXHQgICAgfVxuXHQgICAgc2V0dGVyKG5ld192YWwpO1xuXHQgICAgcmV0dXJuIHdobzsgLy8gUmV0dXJuIHRoaXM/XG5cdH07XG5cdG5ld19tZXRob2QuY2hlY2sgPSBmdW5jdGlvbiAoY2JhaywgbXNnKSB7XG5cdCAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0XHRyZXR1cm4gY2hlY2tzO1xuXHQgICAgfVxuXHQgICAgY2hlY2tzLnB1c2ggKHtjaGVjayA6IGNiYWssXG5cdFx0XHQgIG1zZyAgIDogbXNnfSk7XG5cdCAgICByZXR1cm4gdGhpcztcblx0fTtcblx0bmV3X21ldGhvZC50cmFuc2Zvcm0gPSBmdW5jdGlvbiAoY2Jhaykge1xuXHQgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG5cdFx0cmV0dXJuIHRyYW5zZm9ybXM7XG5cdCAgICB9XG5cdCAgICB0cmFuc2Zvcm1zLnB1c2goY2Jhayk7XG5cdCAgICByZXR1cm4gdGhpcztcblx0fTtcblxuXHR3aG9bbWV0aG9kXSA9IG5ld19tZXRob2Q7XG4gICAgfTtcblxuICAgIHZhciBnZXRzZXQgPSBmdW5jdGlvbiAocGFyYW0sIG9wdHMpIHtcblx0aWYgKHR5cGVvZiAocGFyYW0pID09PSAnb2JqZWN0Jykge1xuXHQgICAgbWV0aG9kcy5hZGRfYmF0Y2ggKHBhcmFtKTtcblx0ICAgIGZvciAodmFyIHAgaW4gcGFyYW0pIHtcblx0XHRhdHRhY2hfbWV0aG9kIChwLCBvcHRzKTtcblx0ICAgIH1cblx0fSBlbHNlIHtcblx0ICAgIG1ldGhvZHMuYWRkIChwYXJhbSwgb3B0cy5kZWZhdWx0X3ZhbHVlKTtcblx0ICAgIGF0dGFjaF9tZXRob2QgKHBhcmFtLCBvcHRzKTtcblx0fVxuICAgIH07XG5cbiAgICBhcGkuZ2V0c2V0ID0gZnVuY3Rpb24gKHBhcmFtLCBkZWYpIHtcblx0Z2V0c2V0KHBhcmFtLCB7ZGVmYXVsdF92YWx1ZSA6IGRlZn0pO1xuXG5cdHJldHVybiBhcGk7XG4gICAgfTtcblxuICAgIGFwaS5nZXQgPSBmdW5jdGlvbiAocGFyYW0sIGRlZikge1xuXHR2YXIgb25fc2V0dGVyID0gZnVuY3Rpb24gKCkge1xuXHQgICAgdGhyb3cgKFwiTWV0aG9kIGRlZmluZWQgb25seSBhcyBhIGdldHRlciAoeW91IGFyZSB0cnlpbmcgdG8gdXNlIGl0IGFzIGEgc2V0dGVyXCIpO1xuXHR9O1xuXG5cdGdldHNldChwYXJhbSwge2RlZmF1bHRfdmFsdWUgOiBkZWYsXG5cdFx0ICAgICAgIG9uX3NldHRlciA6IG9uX3NldHRlcn1cblx0ICAgICAgKTtcblxuXHRyZXR1cm4gYXBpO1xuICAgIH07XG5cbiAgICBhcGkuc2V0ID0gZnVuY3Rpb24gKHBhcmFtLCBkZWYpIHtcblx0dmFyIG9uX2dldHRlciA9IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRocm93IChcIk1ldGhvZCBkZWZpbmVkIG9ubHkgYXMgYSBzZXR0ZXIgKHlvdSBhcmUgdHJ5aW5nIHRvIHVzZSBpdCBhcyBhIGdldHRlclwiKTtcblx0fTtcblxuXHRnZXRzZXQocGFyYW0sIHtkZWZhdWx0X3ZhbHVlIDogZGVmLFxuXHRcdCAgICAgICBvbl9nZXR0ZXIgOiBvbl9nZXR0ZXJ9XG5cdCAgICAgICk7XG5cblx0cmV0dXJuIGFwaTtcbiAgICB9O1xuXG4gICAgYXBpLm1ldGhvZCA9IGZ1bmN0aW9uIChuYW1lLCBjYmFrKSB7XG5cdGlmICh0eXBlb2YgKG5hbWUpID09PSAnb2JqZWN0Jykge1xuXHQgICAgZm9yICh2YXIgcCBpbiBuYW1lKSB7XG5cdFx0d2hvW3BdID0gbmFtZVtwXTtcblx0ICAgIH1cblx0fSBlbHNlIHtcblx0ICAgIHdob1tuYW1lXSA9IGNiYWs7XG5cdH1cblx0cmV0dXJuIGFwaTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIGFwaTtcbiAgICBcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IGFwaTsiLCIvLyBpZiAodHlwZW9mIHRudCA9PT0gXCJ1bmRlZmluZWRcIikge1xuLy8gICAgIG1vZHVsZS5leHBvcnRzID0gdG50ID0ge31cbi8vIH1cbi8vIHRudC51dGlscyA9IHJlcXVpcmUoXCJ0bnQudXRpbHNcIik7XG4vLyB0bnQudG9vbHRpcCA9IHJlcXVpcmUoXCJ0bnQudG9vbHRpcFwiKTtcbi8vIHRudC5ib2FyZCA9IHJlcXVpcmUoXCIuL3NyYy9pbmRleC5qc1wiKTtcblxubW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiLi9zcmMvaW5kZXhcIik7XG4iLCJ2YXIgYXBpanMgPSByZXF1aXJlIChcInRudC5hcGlcIik7XG52YXIgZGVmZXJDYW5jZWwgPSByZXF1aXJlIChcInRudC51dGlsc1wiKS5kZWZlcl9jYW5jZWw7XG5cbnZhciBib2FyZCA9IGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIFxuICAgIC8vLy8gUHJpdmF0ZSB2YXJzXG4gICAgdmFyIHN2ZztcbiAgICB2YXIgZGl2X2lkO1xuICAgIHZhciB0cmFja3MgPSBbXTtcbiAgICB2YXIgbWluX3dpZHRoID0gNTA7XG4gICAgdmFyIGhlaWdodCAgICA9IDA7ICAgIC8vIFRoaXMgaXMgdGhlIGdsb2JhbCBoZWlnaHQgaW5jbHVkaW5nIGFsbCB0aGUgdHJhY2tzXG4gICAgdmFyIHdpZHRoICAgICA9IDkyMDtcbiAgICB2YXIgaGVpZ2h0X29mZnNldCA9IDIwO1xuICAgIHZhciBsb2MgPSB7XG5cdHNwZWNpZXMgIDogdW5kZWZpbmVkLFxuXHRjaHIgICAgICA6IHVuZGVmaW5lZCxcbiAgICAgICAgZnJvbSAgICAgOiAwLFxuICAgICAgICB0byAgICAgICA6IDUwMFxuICAgIH07XG5cbiAgICAvLyBUT0RPOiBXZSBoYXZlIG5vdyBiYWNrZ3JvdW5kIGNvbG9yIGluIHRoZSB0cmFja3MuIENhbiB0aGlzIGJlIHJlbW92ZWQ/XG4gICAgLy8gSXQgbG9va3MgbGlrZSBpdCBpcyB1c2VkIGluIHRoZSB0b28td2lkZSBwYW5lIGV0YywgYnV0IGl0IG1heSBub3QgYmUgbmVlZGVkIGFueW1vcmVcbiAgICB2YXIgYmdDb2xvciAgID0gZDMucmdiKCcjRjhGQkVGJyk7IC8vI0Y4RkJFRlxuICAgIHZhciBwYW5lOyAvLyBEcmFnZ2FibGUgcGFuZVxuICAgIHZhciBzdmdfZztcbiAgICB2YXIgeFNjYWxlO1xuICAgIHZhciB6b29tRXZlbnRIYW5kbGVyID0gZDMuYmVoYXZpb3Iuem9vbSgpO1xuICAgIHZhciBsaW1pdHMgPSB7XG5cdGxlZnQgOiAwLFxuXHRyaWdodCA6IDEwMDAsXG5cdHpvb21fb3V0IDogMTAwMCxcblx0em9vbV9pbiAgOiAxMDBcbiAgICB9O1xuICAgIHZhciBjYXBfd2lkdGggPSAzO1xuICAgIHZhciBkdXIgPSA1MDA7XG4gICAgdmFyIGRyYWdfYWxsb3dlZCA9IHRydWU7XG5cbiAgICB2YXIgZXhwb3J0cyA9IHtcblx0ZWFzZSAgICAgICAgICA6IGQzLmVhc2UoXCJjdWJpYy1pbi1vdXRcIiksXG5cdGV4dGVuZF9jYW52YXMgOiB7XG5cdCAgICBsZWZ0IDogMCxcblx0ICAgIHJpZ2h0IDogMFxuXHR9LFxuXHRzaG93X2ZyYW1lIDogdHJ1ZVxuXHQvLyBsaW1pdHMgICAgICAgIDogZnVuY3Rpb24gKCkge3Rocm93IFwiVGhlIGxpbWl0cyBtZXRob2Qgc2hvdWxkIGJlIGRlZmluZWRcIn1cdFxuICAgIH07XG5cbiAgICAvLyBUaGUgcmV0dXJuZWQgY2xvc3VyZSAvIG9iamVjdFxuICAgIHZhciB0cmFja192aXMgPSBmdW5jdGlvbihkaXYpIHtcblx0ZGl2X2lkID0gZDMuc2VsZWN0KGRpdikuYXR0cihcImlkXCIpO1xuXG5cdC8vIFRoZSBvcmlnaW5hbCBkaXYgaXMgY2xhc3NlZCB3aXRoIHRoZSB0bnQgY2xhc3Ncblx0ZDMuc2VsZWN0KGRpdilcblx0ICAgIC5jbGFzc2VkKFwidG50XCIsIHRydWUpO1xuXG5cdC8vIFRPRE86IE1vdmUgdGhlIHN0eWxpbmcgdG8gdGhlIHNjc3M/XG5cdHZhciBicm93c2VyRGl2ID0gZDMuc2VsZWN0KGRpdilcblx0ICAgIC5hcHBlbmQoXCJkaXZcIilcblx0ICAgIC5hdHRyKFwiaWRcIiwgXCJ0bnRfXCIgKyBkaXZfaWQpXG5cdCAgICAuc3R5bGUoXCJwb3NpdGlvblwiLCBcInJlbGF0aXZlXCIpXG5cdCAgICAuY2xhc3NlZChcInRudF9mcmFtZWRcIiwgZXhwb3J0cy5zaG93X2ZyYW1lID8gdHJ1ZSA6IGZhbHNlKVxuXHQgICAgLnN0eWxlKFwid2lkdGhcIiwgKHdpZHRoICsgY2FwX3dpZHRoKjIgKyBleHBvcnRzLmV4dGVuZF9jYW52YXMucmlnaHQgKyBleHBvcnRzLmV4dGVuZF9jYW52YXMubGVmdCkgKyBcInB4XCIpXG5cblx0dmFyIGdyb3VwRGl2ID0gYnJvd3NlckRpdlxuXHQgICAgLmFwcGVuZChcImRpdlwiKVxuXHQgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF9ncm91cERpdlwiKTtcblxuXHQvLyBUaGUgU1ZHXG5cdHN2ZyA9IGdyb3VwRGl2XG5cdCAgICAuYXBwZW5kKFwic3ZnXCIpXG5cdCAgICAuYXR0cihcImNsYXNzXCIsIFwidG50X3N2Z1wiKVxuXHQgICAgLmF0dHIoXCJ3aWR0aFwiLCB3aWR0aClcblx0ICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGhlaWdodClcblx0ICAgIC5hdHRyKFwicG9pbnRlci1ldmVudHNcIiwgXCJhbGxcIik7XG5cblx0c3ZnX2cgPSBzdmdcblx0ICAgIC5hcHBlbmQoXCJnXCIpXG4gICAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZSgwLDIwKVwiKVxuICAgICAgICAgICAgLmFwcGVuZChcImdcIilcblx0ICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfZ1wiKTtcblxuXHQvLyBjYXBzXG5cdHN2Z19nXG5cdCAgICAuYXBwZW5kKFwicmVjdFwiKVxuXHQgICAgLmF0dHIoXCJpZFwiLCBcInRudF9cIiArIGRpdl9pZCArIFwiXzVwY2FwXCIpXG5cdCAgICAuYXR0cihcInhcIiwgMClcblx0ICAgIC5hdHRyKFwieVwiLCAwKVxuXHQgICAgLmF0dHIoXCJ3aWR0aFwiLCAwKVxuXHQgICAgLmF0dHIoXCJoZWlnaHRcIiwgaGVpZ2h0KVxuXHQgICAgLmF0dHIoXCJmaWxsXCIsIFwicmVkXCIpO1xuXHRzdmdfZ1xuXHQgICAgLmFwcGVuZChcInJlY3RcIilcblx0ICAgIC5hdHRyKFwiaWRcIiwgXCJ0bnRfXCIgKyBkaXZfaWQgKyBcIl8zcGNhcFwiKVxuXHQgICAgLmF0dHIoXCJ4XCIsIHdpZHRoLWNhcF93aWR0aClcblx0ICAgIC5hdHRyKFwieVwiLCAwKVxuXHQgICAgLmF0dHIoXCJ3aWR0aFwiLCAwKVxuXHQgICAgLmF0dHIoXCJoZWlnaHRcIiwgaGVpZ2h0KVxuXHQgICAgLmF0dHIoXCJmaWxsXCIsIFwicmVkXCIpO1xuXG5cdC8vIFRoZSBab29taW5nL1Bhbm5pbmcgUGFuZVxuXHRwYW5lID0gc3ZnX2dcblx0ICAgIC5hcHBlbmQoXCJyZWN0XCIpXG5cdCAgICAuYXR0cihcImNsYXNzXCIsIFwidG50X3BhbmVcIilcblx0ICAgIC5hdHRyKFwiaWRcIiwgXCJ0bnRfXCIgKyBkaXZfaWQgKyBcIl9wYW5lXCIpXG5cdCAgICAuYXR0cihcIndpZHRoXCIsIHdpZHRoKVxuXHQgICAgLmF0dHIoXCJoZWlnaHRcIiwgaGVpZ2h0KVxuXHQgICAgLnN0eWxlKFwiZmlsbFwiLCBiZ0NvbG9yKTtcblxuXHQvLyAqKiBUT0RPOiBXb3VsZG4ndCBiZSBiZXR0ZXIgdG8gaGF2ZSB0aGVzZSBtZXNzYWdlcyBieSB0cmFjaz9cblx0Ly8gdmFyIHRvb1dpZGVfdGV4dCA9IHN2Z19nXG5cdC8vICAgICAuYXBwZW5kKFwidGV4dFwiKVxuXHQvLyAgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF93aWRlT0tfdGV4dFwiKVxuXHQvLyAgICAgLmF0dHIoXCJpZFwiLCBcInRudF9cIiArIGRpdl9pZCArIFwiX3Rvb1dpZGVcIilcblx0Ly8gICAgIC5hdHRyKFwiZmlsbFwiLCBiZ0NvbG9yKVxuXHQvLyAgICAgLnRleHQoXCJSZWdpb24gdG9vIHdpZGVcIik7XG5cblx0Ly8gVE9ETzogSSBkb24ndCBrbm93IGlmIHRoaXMgaXMgdGhlIGJlc3Qgd2F5IChhbmQgcG9ydGFibGUpIHdheVxuXHQvLyBvZiBjZW50ZXJpbmcgdGhlIHRleHQgaW4gdGhlIHRleHQgYXJlYVxuXHQvLyB2YXIgYmIgPSB0b29XaWRlX3RleHRbMF1bMF0uZ2V0QkJveCgpO1xuXHQvLyB0b29XaWRlX3RleHRcblx0Ly8gICAgIC5hdHRyKFwieFwiLCB+fih3aWR0aC8yIC0gYmIud2lkdGgvMikpXG5cdC8vICAgICAuYXR0cihcInlcIiwgfn4oaGVpZ2h0LzIgLSBiYi5oZWlnaHQvMikpO1xuICAgIH07XG5cbiAgICAvLyBBUElcbiAgICB2YXIgYXBpID0gYXBpanMgKHRyYWNrX3Zpcylcblx0LmdldHNldCAoZXhwb3J0cylcblx0LmdldHNldCAobGltaXRzKVxuXHQuZ2V0c2V0IChsb2MpO1xuXG4gICAgYXBpLnRyYW5zZm9ybSAodHJhY2tfdmlzLmV4dGVuZF9jYW52YXMsIGZ1bmN0aW9uICh2YWwpIHtcblx0dmFyIHByZXZfdmFsID0gdHJhY2tfdmlzLmV4dGVuZF9jYW52YXMoKTtcblx0dmFsLmxlZnQgPSB2YWwubGVmdCB8fCBwcmV2X3ZhbC5sZWZ0O1xuXHR2YWwucmlnaHQgPSB2YWwucmlnaHQgfHwgcHJldl92YWwucmlnaHQ7XG5cdHJldHVybiB2YWw7XG4gICAgfSk7XG5cbiAgICAvLyB0cmFja192aXMgYWx3YXlzIHN0YXJ0cyBvbiBsb2MuZnJvbSAmIGxvYy50b1xuICAgIGFwaS5tZXRob2QgKCdzdGFydCcsIGZ1bmN0aW9uICgpIHtcblxuXHQvLyBSZXNldCB0aGUgdHJhY2tzXG5cdGZvciAodmFyIGk9MDsgaTx0cmFja3MubGVuZ3RoOyBpKyspIHtcblx0ICAgIGlmICh0cmFja3NbaV0uZykge1xuXHRcdHRyYWNrc1tpXS5kaXNwbGF5KCkucmVzZXQuY2FsbCh0cmFja3NbaV0pO1xuXHQgICAgfVxuXHQgICAgX2luaXRfdHJhY2sodHJhY2tzW2ldKTtcblx0fVxuXG5cdF9wbGFjZV90cmFja3MoKTtcblxuXHQvLyBUaGUgY29udGludWF0aW9uIGNhbGxiYWNrXG5cdHZhciBjb250ID0gZnVuY3Rpb24gKHJlc3ApIHtcblx0ICAgIGxpbWl0cy5yaWdodCA9IHJlc3A7XG5cblx0ICAgIC8vIHpvb21FdmVudEhhbmRsZXIueEV4dGVudChbbGltaXRzLmxlZnQsIGxpbWl0cy5yaWdodF0pO1xuXHQgICAgaWYgKChsb2MudG8gLSBsb2MuZnJvbSkgPCBsaW1pdHMuem9vbV9pbikge1xuXHRcdGlmICgobG9jLmZyb20gKyBsaW1pdHMuem9vbV9pbikgPiBsaW1pdHMuem9vbV9pbikge1xuXHRcdCAgICBsb2MudG8gPSBsaW1pdHMucmlnaHQ7XG5cdFx0fSBlbHNlIHtcblx0XHQgICAgbG9jLnRvID0gbG9jLmZyb20gKyBsaW1pdHMuem9vbV9pbjtcblx0XHR9XG5cdCAgICB9XG5cdCAgICBwbG90KCk7XG5cblx0ICAgIGZvciAodmFyIGk9MDsgaTx0cmFja3MubGVuZ3RoOyBpKyspIHtcblx0XHRfdXBkYXRlX3RyYWNrKHRyYWNrc1tpXSwgbG9jKTtcblx0ICAgIH1cblx0fTtcblxuXHQvLyBJZiBsaW1pdHMucmlnaHQgaXMgYSBmdW5jdGlvbiwgd2UgaGF2ZSB0byBjYWxsIGl0IGFzeW5jaHJvbm91c2x5IGFuZFxuXHQvLyB0aGVuIHN0YXJ0aW5nIHRoZSBwbG90IG9uY2Ugd2UgaGF2ZSBzZXQgdGhlIHJpZ2h0IGxpbWl0IChwbG90KVxuXHQvLyBJZiBub3QsIHdlIGFzc3VtZSB0aGF0IGl0IGlzIGFuIG9iamV0IHdpdGggbmV3IChtYXliZSBwYXJ0aWFsbHkgZGVmaW5lZClcblx0Ly8gZGVmaW5pdGlvbnMgb2YgdGhlIGxpbWl0cyBhbmQgd2UgY2FuIHBsb3QgZGlyZWN0bHlcblx0Ly8gVE9ETzogUmlnaHQgbm93LCBvbmx5IHJpZ2h0IGNhbiBiZSBjYWxsZWQgYXMgYW4gYXN5bmMgZnVuY3Rpb24gd2hpY2ggaXMgd2Vha1xuXHRpZiAodHlwZW9mIChsaW1pdHMucmlnaHQpID09PSAnZnVuY3Rpb24nKSB7XG5cdCAgICBsaW1pdHMucmlnaHQoY29udCk7XG5cdH0gZWxzZSB7XG5cdCAgICBjb250KGxpbWl0cy5yaWdodCk7XG5cdH1cblxuICAgIH0pO1xuXG4gICAgYXBpLm1ldGhvZCAoJ3VwZGF0ZScsIGZ1bmN0aW9uICgpIHtcblx0Zm9yICh2YXIgaT0wOyBpPHRyYWNrcy5sZW5ndGg7IGkrKykge1xuXHQgICAgX3VwZGF0ZV90cmFjayAodHJhY2tzW2ldKTtcblx0fVxuXG4gICAgfSk7XG5cbiAgICB2YXIgX3VwZGF0ZV90cmFjayA9IGZ1bmN0aW9uICh0cmFjaywgd2hlcmUpIHtcblx0aWYgKHRyYWNrLmRhdGEoKSkge1xuXHQgICAgdmFyIHRyYWNrX2RhdGEgPSB0cmFjay5kYXRhKCk7XG5cdCAgICB2YXIgZGF0YV91cGRhdGVyID0gdHJhY2tfZGF0YS51cGRhdGUoKTtcblx0ICAgIC8vdmFyIGRhdGFfdXBkYXRlciA9IHRyYWNrLmRhdGEoKS51cGRhdGUoKTtcblx0ICAgIGRhdGFfdXBkYXRlci5jYWxsKHRyYWNrX2RhdGEsIHtcblx0XHQnbG9jJyA6IHdoZXJlLFxuXHRcdCdvbl9zdWNjZXNzJyA6IGZ1bmN0aW9uICgpIHtcblx0XHQgICAgdHJhY2suZGlzcGxheSgpLnVwZGF0ZS5jYWxsKHRyYWNrLCB4U2NhbGUpO1xuXHRcdH1cblx0ICAgIH0pO1xuXHR9XG4gICAgfTtcblxuICAgIHZhciBwbG90ID0gZnVuY3Rpb24oKSB7XG5cblx0eFNjYWxlID0gZDMuc2NhbGUubGluZWFyKClcblx0ICAgIC5kb21haW4oW2xvYy5mcm9tLCBsb2MudG9dKVxuXHQgICAgLnJhbmdlKFswLCB3aWR0aF0pO1xuXG5cdGlmIChkcmFnX2FsbG93ZWQpIHtcblx0ICAgIHN2Z19nLmNhbGwoIHpvb21FdmVudEhhbmRsZXJcblx0XHQgICAgICAgLngoeFNjYWxlKVxuXHRcdCAgICAgICAuc2NhbGVFeHRlbnQoWyhsb2MudG8tbG9jLmZyb20pLyhsaW1pdHMuem9vbV9vdXQtMSksIChsb2MudG8tbG9jLmZyb20pL2xpbWl0cy56b29tX2luXSlcblx0XHQgICAgICAgLm9uKFwiem9vbVwiLCBfbW92ZSlcblx0XHQgICAgICk7XG5cdH1cblxuICAgIH07XG5cbiAgICAvLyByaWdodC9sZWZ0L3pvb20gcGFucyBvciB6b29tcyB0aGUgdHJhY2suIFRoZXNlIG1ldGhvZHMgYXJlIGV4cG9zZWQgdG8gYWxsb3cgZXh0ZXJuYWwgYnV0dG9ucywgZXRjIHRvIGludGVyYWN0IHdpdGggdGhlIHRyYWNrcy4gVGhlIGFyZ3VtZW50IGlzIHRoZSBhbW91bnQgb2YgcGFubmluZy96b29taW5nIChpZS4gMS4yIG1lYW5zIDIwJSBwYW5uaW5nKSBXaXRoIGxlZnQvcmlnaHQgb25seSBwb3NpdGl2ZSBudW1iZXJzIGFyZSBhbGxvd2VkLlxuICAgIGFwaS5tZXRob2QgKCdtb3ZlX3JpZ2h0JywgZnVuY3Rpb24gKGZhY3Rvcikge1xuXHRpZiAoZmFjdG9yID4gMCkge1xuXHQgICAgX21hbnVhbF9tb3ZlKGZhY3RvciwgMSk7XG5cdH1cbiAgICB9KTtcblxuICAgIGFwaS5tZXRob2QgKCdtb3ZlX2xlZnQnLCBmdW5jdGlvbiAoZmFjdG9yKSB7XG5cdGlmIChmYWN0b3IgPiAwKSB7XG5cdCAgICBfbWFudWFsX21vdmUoZmFjdG9yLCAtMSk7XG5cdH1cbiAgICB9KTtcblxuICAgIGFwaS5tZXRob2QgKCd6b29tJywgZnVuY3Rpb24gKGZhY3Rvcikge1xuXHRfbWFudWFsX21vdmUoZmFjdG9yLCAwKTtcbiAgICB9KTtcblxuICAgIGFwaS5tZXRob2QgKCdmaW5kX3RyYWNrX2J5X2lkJywgZnVuY3Rpb24gKGlkKSB7XG5cdGZvciAodmFyIGk9MDsgaTx0cmFja3MubGVuZ3RoOyBpKyspIHtcblx0ICAgIGlmICh0cmFja3NbaV0uaWQoKSA9PT0gaWQpIHtcblx0XHRyZXR1cm4gdHJhY2tzW2ldO1xuXHQgICAgfVxuXHR9XG4gICAgfSk7XG5cbiAgICBhcGkubWV0aG9kICgncmVvcmRlcicsIGZ1bmN0aW9uIChuZXdfdHJhY2tzKSB7XG5cdC8vIFRPRE86IFRoaXMgaXMgZGVmaW5pbmcgYSBuZXcgaGVpZ2h0LCBidXQgdGhlIGdsb2JhbCBoZWlnaHQgaXMgdXNlZCB0byBkZWZpbmUgdGhlIHNpemUgb2Ygc2V2ZXJhbFxuXHQvLyBwYXJ0cy4gV2Ugc2hvdWxkIGRvIHRoaXMgZHluYW1pY2FsbHlcblxuXHRmb3IgKHZhciBqPTA7IGo8bmV3X3RyYWNrcy5sZW5ndGg7IGorKykge1xuXHQgICAgdmFyIGZvdW5kID0gZmFsc2U7XG5cdCAgICBmb3IgKHZhciBpPTA7IGk8dHJhY2tzLmxlbmd0aDsgaSsrKSB7XG5cdFx0aWYgKHRyYWNrc1tpXS5pZCgpID09PSBuZXdfdHJhY2tzW2pdLmlkKCkpIHtcblx0XHQgICAgZm91bmQgPSB0cnVlO1xuXHRcdCAgICB0cmFja3Muc3BsaWNlKGksMSk7XG5cdFx0ICAgIGJyZWFrO1xuXHRcdH1cblx0ICAgIH1cblx0ICAgIGlmICghZm91bmQpIHtcblx0XHRfaW5pdF90cmFjayhuZXdfdHJhY2tzW2pdKTtcblx0XHRfdXBkYXRlX3RyYWNrKG5ld190cmFja3Nbal0sIHtmcm9tIDogbG9jLmZyb20sIHRvIDogbG9jLnRvfSk7XG5cdCAgICB9XG5cdH1cblxuXHRmb3IgKHZhciB4PTA7IHg8dHJhY2tzLmxlbmd0aDsgeCsrKSB7XG5cdCAgICB0cmFja3NbeF0uZy5yZW1vdmUoKTtcblx0fVxuXG5cdHRyYWNrcyA9IG5ld190cmFja3M7XG5cdF9wbGFjZV90cmFja3MoKTtcblxuICAgIH0pO1xuXG4gICAgYXBpLm1ldGhvZCAoJ3JlbW92ZV90cmFjaycsIGZ1bmN0aW9uICh0cmFjaykge1xuXHR0cmFjay5nLnJlbW92ZSgpO1xuICAgIH0pO1xuXG4gICAgYXBpLm1ldGhvZCAoJ2FkZF90cmFjaycsIGZ1bmN0aW9uICh0cmFjaykge1xuXHRpZiAodHJhY2sgaW5zdGFuY2VvZiBBcnJheSkge1xuXHQgICAgZm9yICh2YXIgaT0wOyBpPHRyYWNrLmxlbmd0aDsgaSsrKSB7XG5cdFx0dHJhY2tfdmlzLmFkZF90cmFjayAodHJhY2tbaV0pO1xuXHQgICAgfVxuXHQgICAgcmV0dXJuIHRyYWNrX3Zpcztcblx0fVxuXHR0cmFja3MucHVzaCh0cmFjayk7XG5cdHJldHVybiB0cmFja192aXM7XG4gICAgfSk7XG5cbiAgICBhcGkubWV0aG9kKCd0cmFja3MnLCBmdW5jdGlvbiAobmV3X3RyYWNrcykge1xuXHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0ICAgIHJldHVybiB0cmFja3Ncblx0fVxuXHR0cmFja3MgPSBuZXdfdHJhY2tzO1xuXHRyZXR1cm4gdHJhY2tfdmlzO1xuICAgIH0pO1xuXG4gICAgLy8gXG4gICAgYXBpLm1ldGhvZCAoJ3dpZHRoJywgZnVuY3Rpb24gKHcpIHtcblx0Ly8gVE9ETzogQWxsb3cgc3VmZml4ZXMgbGlrZSBcIjEwMDBweFwiP1xuXHQvLyBUT0RPOiBUZXN0IHdyb25nIGZvcm1hdHNcblx0aWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG5cdCAgICByZXR1cm4gd2lkdGg7XG5cdH1cblx0Ly8gQXQgbGVhc3QgbWluLXdpZHRoXG5cdGlmICh3IDwgbWluX3dpZHRoKSB7XG5cdCAgICB3ID0gbWluX3dpZHRoXG5cdH1cblxuXHQvLyBXZSBhcmUgcmVzaXppbmdcblx0aWYgKGRpdl9pZCAhPT0gdW5kZWZpbmVkKSB7XG5cdCAgICBkMy5zZWxlY3QoXCIjdG50X1wiICsgZGl2X2lkKS5zZWxlY3QoXCJzdmdcIikuYXR0cihcIndpZHRoXCIsIHcpO1xuXHQgICAgLy8gUmVzaXplIHRoZSB6b29taW5nL3Bhbm5pbmcgcGFuZVxuXHQgICAgZDMuc2VsZWN0KFwiI3RudF9cIiArIGRpdl9pZCkuc3R5bGUoXCJ3aWR0aFwiLCAocGFyc2VJbnQodykgKyBjYXBfd2lkdGgqMikgKyBcInB4XCIpO1xuXHQgICAgZDMuc2VsZWN0KFwiI3RudF9cIiArIGRpdl9pZCArIFwiX3BhbmVcIikuYXR0cihcIndpZHRoXCIsIHcpO1xuXG5cdCAgICAvLyBSZXBsb3Rcblx0ICAgIHdpZHRoID0gdztcblx0ICAgIHBsb3QoKTtcblx0ICAgIGZvciAodmFyIGk9MDsgaTx0cmFja3MubGVuZ3RoOyBpKyspIHtcblx0XHR0cmFja3NbaV0uZy5zZWxlY3QoXCJyZWN0XCIpLmF0dHIoXCJ3aWR0aFwiLCB3KTtcblx0XHR0cmFja3NbaV0uZGlzcGxheSgpLnJlc2V0LmNhbGwodHJhY2tzW2ldKTtcblx0XHR0cmFja3NbaV0uZGlzcGxheSgpLnVwZGF0ZS5jYWxsKHRyYWNrc1tpXSx4U2NhbGUpO1xuXHQgICAgfVxuXHQgICAgXG5cdH0gZWxzZSB7XG5cdCAgICB3aWR0aCA9IHc7XG5cdH1cblx0XG5cdHJldHVybiB0cmFja192aXM7XG4gICAgfSk7XG5cbiAgICBhcGkubWV0aG9kKCdhbGxvd19kcmFnJywgZnVuY3Rpb24oYikge1xuXHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0ICAgIHJldHVybiBkcmFnX2FsbG93ZWQ7XG5cdH1cblx0ZHJhZ19hbGxvd2VkID0gYjtcblx0aWYgKGRyYWdfYWxsb3dlZCkge1xuXHQgICAgLy8gV2hlbiB0aGlzIG1ldGhvZCBpcyBjYWxsZWQgb24gdGhlIG9iamVjdCBiZWZvcmUgc3RhcnRpbmcgdGhlIHNpbXVsYXRpb24sIHdlIGRvbid0IGhhdmUgZGVmaW5lZCB4U2NhbGVcblx0ICAgIGlmICh4U2NhbGUgIT09IHVuZGVmaW5lZCkge1xuXHRcdHN2Z19nLmNhbGwoIHpvb21FdmVudEhhbmRsZXIueCh4U2NhbGUpXG5cdFx0XHQgICAvLyAueEV4dGVudChbMCwgbGltaXRzLnJpZ2h0XSlcblx0XHRcdCAgIC5zY2FsZUV4dGVudChbKGxvYy50by1sb2MuZnJvbSkvKGxpbWl0cy56b29tX291dC0xKSwgKGxvYy50by1sb2MuZnJvbSkvbGltaXRzLnpvb21faW5dKVxuXHRcdFx0ICAgLm9uKFwiem9vbVwiLCBfbW92ZSkgKTtcblx0ICAgIH1cblx0fSBlbHNlIHtcblx0ICAgIC8vIFdlIGNyZWF0ZSBhIG5ldyBkdW1teSBzY2FsZSBpbiB4IHRvIGF2b2lkIGRyYWdnaW5nIHRoZSBwcmV2aW91cyBvbmVcblx0ICAgIC8vIFRPRE86IFRoZXJlIG1heSBiZSBhIGNoZWFwZXIgd2F5IG9mIGRvaW5nIHRoaXM/XG5cdCAgICB6b29tRXZlbnRIYW5kbGVyLngoZDMuc2NhbGUubGluZWFyKCkpLm9uKFwiem9vbVwiLCBudWxsKTtcblx0fVxuXHRyZXR1cm4gdHJhY2tfdmlzO1xuICAgIH0pO1xuXG4gICAgdmFyIF9wbGFjZV90cmFja3MgPSBmdW5jdGlvbiAoKSB7XG5cdHZhciBoID0gMDtcblx0Zm9yICh2YXIgaT0wOyBpPHRyYWNrcy5sZW5ndGg7IGkrKykge1xuXHQgICAgdmFyIHRyYWNrID0gdHJhY2tzW2ldO1xuXHQgICAgaWYgKHRyYWNrLmcuYXR0cihcInRyYW5zZm9ybVwiKSkge1xuXHRcdHRyYWNrLmdcblx0XHQgICAgLnRyYW5zaXRpb24oKVxuXHRcdCAgICAuZHVyYXRpb24oZHVyKVxuXHRcdCAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZSgwLFwiICsgaCArIFwiKVwiKTtcblx0ICAgIH0gZWxzZSB7XG5cdFx0dHJhY2suZ1xuXHRcdCAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZSgwLFwiICsgaCArIFwiKVwiKTtcblx0ICAgIH1cblxuXHQgICAgaCArPSB0cmFjay5oZWlnaHQoKTtcblx0fVxuXG5cdC8vIHN2Z1xuXHRzdmcuYXR0cihcImhlaWdodFwiLCBoICsgaGVpZ2h0X29mZnNldCk7XG5cblx0Ly8gZGl2XG5cdGQzLnNlbGVjdChcIiN0bnRfXCIgKyBkaXZfaWQpXG5cdCAgICAuc3R5bGUoXCJoZWlnaHRcIiwgKGggKyAxMCArIGhlaWdodF9vZmZzZXQpICsgXCJweFwiKTtcblxuXHQvLyBjYXBzXG5cdGQzLnNlbGVjdChcIiN0bnRfXCIgKyBkaXZfaWQgKyBcIl81cGNhcFwiKVxuXHQgICAgLmF0dHIoXCJoZWlnaHRcIiwgaClcblx0ICAgIC8vIC5tb3ZlX3RvX2Zyb250KClcblx0ICAgIC5lYWNoKGZ1bmN0aW9uIChkKSB7XG5cdFx0bW92ZV90b19mcm9udCh0aGlzKTtcblx0ICAgIH0pXG5cdGQzLnNlbGVjdChcIiN0bnRfXCIgKyBkaXZfaWQgKyBcIl8zcGNhcFwiKVxuXHQgICAgLmF0dHIoXCJoZWlnaHRcIiwgaClcblx0Ly8ubW92ZV90b19mcm9udCgpXG5cdCAgICAuZWFjaCAoZnVuY3Rpb24gKGQpIHtcblx0XHRtb3ZlX3RvX2Zyb250KHRoaXMpO1xuXHQgICAgfSk7XG5cdFxuXG5cdC8vIHBhbmVcblx0cGFuZVxuXHQgICAgLmF0dHIoXCJoZWlnaHRcIiwgaCArIGhlaWdodF9vZmZzZXQpO1xuXG5cdC8vIHRvb1dpZGVfdGV4dC4gVE9ETzogSXMgdGhpcyBzdGlsbCBuZWVkZWQ/XG5cdC8vIHZhciB0b29XaWRlX3RleHQgPSBkMy5zZWxlY3QoXCIjdG50X1wiICsgZGl2X2lkICsgXCJfdG9vV2lkZVwiKTtcblx0Ly8gdmFyIGJiID0gdG9vV2lkZV90ZXh0WzBdWzBdLmdldEJCb3goKTtcblx0Ly8gdG9vV2lkZV90ZXh0XG5cdC8vICAgICAuYXR0cihcInlcIiwgfn4oaC8yKSAtIGJiLmhlaWdodC8yKTtcblxuXHRyZXR1cm4gdHJhY2tfdmlzO1xuICAgIH1cblxuICAgIHZhciBfaW5pdF90cmFjayA9IGZ1bmN0aW9uICh0cmFjaykge1xuXHR0cmFjay5nID0gc3ZnLnNlbGVjdChcImdcIikuc2VsZWN0KFwiZ1wiKVxuXHQgICAgLmFwcGVuZChcImdcIilcblx0ICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfdHJhY2tcIilcblx0ICAgIC5hdHRyKFwiaGVpZ2h0XCIsIHRyYWNrLmhlaWdodCgpKTtcblxuXHQvLyBSZWN0IGZvciB0aGUgYmFja2dyb3VuZCBjb2xvclxuXHR0cmFjay5nXG5cdCAgICAuYXBwZW5kKFwicmVjdFwiKVxuXHQgICAgLmF0dHIoXCJ4XCIsIDApXG5cdCAgICAuYXR0cihcInlcIiwgMClcblx0ICAgIC5hdHRyKFwid2lkdGhcIiwgdHJhY2tfdmlzLndpZHRoKCkpXG5cdCAgICAuYXR0cihcImhlaWdodFwiLCB0cmFjay5oZWlnaHQoKSlcblx0ICAgIC5zdHlsZShcImZpbGxcIiwgdHJhY2suYmFja2dyb3VuZF9jb2xvcigpKVxuXHQgICAgLnN0eWxlKFwicG9pbnRlci1ldmVudHNcIiwgXCJub25lXCIpO1xuXG5cdGlmICh0cmFjay5kaXNwbGF5KCkpIHtcblx0ICAgIHRyYWNrLmRpc3BsYXkoKS5pbml0LmNhbGwodHJhY2ssIHdpZHRoKTtcblx0fVxuXHRcblx0cmV0dXJuIHRyYWNrX3ZpcztcbiAgICB9O1xuXG4gICAgdmFyIF9tYW51YWxfbW92ZSA9IGZ1bmN0aW9uIChmYWN0b3IsIGRpcmVjdGlvbikge1xuXHR2YXIgb2xkRG9tYWluID0geFNjYWxlLmRvbWFpbigpO1xuXG5cdHZhciBzcGFuID0gb2xkRG9tYWluWzFdIC0gb2xkRG9tYWluWzBdO1xuXHR2YXIgb2Zmc2V0ID0gKHNwYW4gKiBmYWN0b3IpIC0gc3BhbjtcblxuXHR2YXIgbmV3RG9tYWluO1xuXHRzd2l0Y2ggKGRpcmVjdGlvbikge1xuXHRjYXNlIC0xIDpcblx0ICAgIG5ld0RvbWFpbiA9IFsofn5vbGREb21haW5bMF0gLSBvZmZzZXQpLCB+fihvbGREb21haW5bMV0gLSBvZmZzZXQpXTtcblx0ICAgIGJyZWFrO1xuXHRjYXNlIDEgOlxuXHQgICAgbmV3RG9tYWluID0gWyh+fm9sZERvbWFpblswXSArIG9mZnNldCksIH5+KG9sZERvbWFpblsxXSAtIG9mZnNldCldO1xuXHQgICAgYnJlYWs7XG5cdGNhc2UgMCA6XG5cdCAgICBuZXdEb21haW4gPSBbb2xkRG9tYWluWzBdIC0gfn4ob2Zmc2V0LzIpLCBvbGREb21haW5bMV0gKyAofn5vZmZzZXQvMildO1xuXHR9XG5cblx0dmFyIGludGVycG9sYXRvciA9IGQzLmludGVycG9sYXRlTnVtYmVyKG9sZERvbWFpblswXSwgbmV3RG9tYWluWzBdKTtcblx0dmFyIGVhc2UgPSBleHBvcnRzLmVhc2U7XG5cblx0dmFyIHggPSAwO1xuXHRkMy50aW1lcihmdW5jdGlvbigpIHtcblx0ICAgIHZhciBjdXJyX3N0YXJ0ID0gaW50ZXJwb2xhdG9yKGVhc2UoeCkpO1xuXHQgICAgdmFyIGN1cnJfZW5kO1xuXHQgICAgc3dpdGNoIChkaXJlY3Rpb24pIHtcblx0ICAgIGNhc2UgLTEgOlxuXHRcdGN1cnJfZW5kID0gY3Vycl9zdGFydCArIHNwYW47XG5cdFx0YnJlYWs7XG5cdCAgICBjYXNlIDEgOlxuXHRcdGN1cnJfZW5kID0gY3Vycl9zdGFydCArIHNwYW47XG5cdFx0YnJlYWs7XG5cdCAgICBjYXNlIDAgOlxuXHRcdGN1cnJfZW5kID0gb2xkRG9tYWluWzFdICsgb2xkRG9tYWluWzBdIC0gY3Vycl9zdGFydDtcblx0XHRicmVhaztcblx0ICAgIH1cblxuXHQgICAgdmFyIGN1cnJEb21haW4gPSBbY3Vycl9zdGFydCwgY3Vycl9lbmRdO1xuXHQgICAgeFNjYWxlLmRvbWFpbihjdXJyRG9tYWluKTtcblx0ICAgIF9tb3ZlKHhTY2FsZSk7XG5cdCAgICB4Kz0wLjAyO1xuXHQgICAgcmV0dXJuIHg+MTtcblx0fSk7XG4gICAgfTtcblxuXG4gICAgdmFyIF9tb3ZlX2NiYWsgPSBmdW5jdGlvbiAoKSB7XG5cdHZhciBjdXJyRG9tYWluID0geFNjYWxlLmRvbWFpbigpO1xuXHR0cmFja192aXMuZnJvbSh+fmN1cnJEb21haW5bMF0pO1xuXHR0cmFja192aXMudG8ofn5jdXJyRG9tYWluWzFdKTtcblxuXHRmb3IgKHZhciBpID0gMDsgaSA8IHRyYWNrcy5sZW5ndGg7IGkrKykge1xuXHQgICAgdmFyIHRyYWNrID0gdHJhY2tzW2ldO1xuXHQgICAgX3VwZGF0ZV90cmFjayh0cmFjaywgbG9jKTtcblx0fVxuICAgIH07XG4gICAgLy8gVGhlIGRlZmVycmVkX2NiYWsgaXMgZGVmZXJyZWQgYXQgbGVhc3QgdGhpcyBhbW91bnQgb2YgdGltZSBvciByZS1zY2hlZHVsZWQgaWYgZGVmZXJyZWQgaXMgY2FsbGVkIGJlZm9yZVxuICAgIHZhciBfZGVmZXJyZWQgPSBkZWZlckNhbmNlbChfbW92ZV9jYmFrLCAzMDApO1xuXG4gICAgLy8gYXBpLm1ldGhvZCgndXBkYXRlJywgZnVuY3Rpb24gKCkge1xuICAgIC8vIFx0X21vdmUoKTtcbiAgICAvLyB9KTtcblxuICAgIHZhciBfbW92ZSA9IGZ1bmN0aW9uIChuZXdfeFNjYWxlKSB7XG5cdGlmIChuZXdfeFNjYWxlICE9PSB1bmRlZmluZWQgJiYgZHJhZ19hbGxvd2VkKSB7XG5cdCAgICB6b29tRXZlbnRIYW5kbGVyLngobmV3X3hTY2FsZSk7XG5cdH1cblxuXHQvLyBTaG93IHRoZSByZWQgYmFycyBhdCB0aGUgbGltaXRzXG5cdHZhciBkb21haW4gPSB4U2NhbGUuZG9tYWluKCk7XG5cdGlmIChkb21haW5bMF0gPD0gNSkge1xuXHQgICAgZDMuc2VsZWN0KFwiI3RudF9cIiArIGRpdl9pZCArIFwiXzVwY2FwXCIpXG5cdFx0LmF0dHIoXCJ3aWR0aFwiLCBjYXBfd2lkdGgpXG5cdFx0LnRyYW5zaXRpb24oKVxuXHRcdC5kdXJhdGlvbigyMDApXG5cdFx0LmF0dHIoXCJ3aWR0aFwiLCAwKTtcblx0fVxuXG5cdGlmIChkb21haW5bMV0gPj0gKGxpbWl0cy5yaWdodCktNSkge1xuXHQgICAgZDMuc2VsZWN0KFwiI3RudF9cIiArIGRpdl9pZCArIFwiXzNwY2FwXCIpXG5cdFx0LmF0dHIoXCJ3aWR0aFwiLCBjYXBfd2lkdGgpXG5cdFx0LnRyYW5zaXRpb24oKVxuXHRcdC5kdXJhdGlvbigyMDApXG5cdFx0LmF0dHIoXCJ3aWR0aFwiLCAwKTtcblx0fVxuXG5cblx0Ly8gQXZvaWQgbW92aW5nIHBhc3QgdGhlIGxpbWl0c1xuXHRpZiAoZG9tYWluWzBdIDwgbGltaXRzLmxlZnQpIHtcblx0ICAgIHpvb21FdmVudEhhbmRsZXIudHJhbnNsYXRlKFt6b29tRXZlbnRIYW5kbGVyLnRyYW5zbGF0ZSgpWzBdIC0geFNjYWxlKGxpbWl0cy5sZWZ0KSArIHhTY2FsZS5yYW5nZSgpWzBdLCB6b29tRXZlbnRIYW5kbGVyLnRyYW5zbGF0ZSgpWzFdXSk7XG5cdH0gZWxzZSBpZiAoZG9tYWluWzFdID4gbGltaXRzLnJpZ2h0KSB7XG5cdCAgICB6b29tRXZlbnRIYW5kbGVyLnRyYW5zbGF0ZShbem9vbUV2ZW50SGFuZGxlci50cmFuc2xhdGUoKVswXSAtIHhTY2FsZShsaW1pdHMucmlnaHQpICsgeFNjYWxlLnJhbmdlKClbMV0sIHpvb21FdmVudEhhbmRsZXIudHJhbnNsYXRlKClbMV1dKTtcblx0fVxuXG5cdF9kZWZlcnJlZCgpO1xuXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgdHJhY2tzLmxlbmd0aDsgaSsrKSB7XG5cdCAgICB2YXIgdHJhY2sgPSB0cmFja3NbaV07XG5cdCAgICB0cmFjay5kaXNwbGF5KCkubW92ZS5jYWxsKHRyYWNrLHhTY2FsZSk7XG5cdH1cbiAgICB9O1xuXG4gICAgLy8gYXBpLm1ldGhvZCh7XG4gICAgLy8gXHRhbGxvd19kcmFnIDogYXBpX2FsbG93X2RyYWcsXG4gICAgLy8gXHR3aWR0aCAgICAgIDogYXBpX3dpZHRoLFxuICAgIC8vIFx0YWRkX3RyYWNrICA6IGFwaV9hZGRfdHJhY2ssXG4gICAgLy8gXHRyZW9yZGVyICAgIDogYXBpX3Jlb3JkZXIsXG4gICAgLy8gXHR6b29tICAgICAgIDogYXBpX3pvb20sXG4gICAgLy8gXHRsZWZ0ICAgICAgIDogYXBpX2xlZnQsXG4gICAgLy8gXHRyaWdodCAgICAgIDogYXBpX3JpZ2h0LFxuICAgIC8vIFx0c3RhcnQgICAgICA6IGFwaV9zdGFydFxuICAgIC8vIH0pO1xuXG4gICAgLy8gQXV4aWxpYXIgZnVuY3Rpb25zXG4gICAgZnVuY3Rpb24gbW92ZV90b19mcm9udCAoZWxlbSkge1xuXHRlbGVtLnBhcmVudE5vZGUuYXBwZW5kQ2hpbGQoZWxlbSk7XG4gICAgfVxuICAgIFxuICAgIHJldHVybiB0cmFja192aXM7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSBib2FyZDtcbiIsInZhciBhcGlqcyA9IHJlcXVpcmUgKFwidG50LmFwaVwiKTtcbi8vIHZhciBlbnNlbWJsUmVzdEFQSSA9IHJlcXVpcmUoXCJ0bnQuZW5zZW1ibFwiKTtcblxuLy8gdmFyIGJvYXJkID0ge307XG4vLyBib2FyZC50cmFjayA9IHt9O1xuXG52YXIgZGF0YSA9IGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIHZhciBfID0gZnVuY3Rpb24gKCkge1xuICAgIH07XG5cbiAgICAvLyBHZXR0ZXJzIC8gU2V0dGVyc1xuICAgIGFwaWpzIChfKVxuXHQuZ2V0c2V0ICgnbGFiZWwnLCBcIlwiKVxuXHQuZ2V0c2V0ICgnZWxlbWVudHMnLCBbXSlcblx0LmdldHNldCAoJ3VwZGF0ZScsIGZ1bmN0aW9uICgpIHt9KTtcblxuICAgIHJldHVybiBfO1xufTtcblxuLy8gVGhlIHJldHJpZXZlcnMuIFRoZXkgbmVlZCB0byBhY2Nlc3MgJ2VsZW1lbnRzJ1xuZGF0YS5yZXRyaWV2ZXIgPSB7fTtcblxuZGF0YS5yZXRyaWV2ZXIuc3luYyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB1cGRhdGVfdHJhY2sgPSBmdW5jdGlvbihvYmopIHtcblx0Ly8gXCJ0aGlzXCIgaXMgc2V0IHRvIHRoZSBkYXRhIG9ialxuICAgICAgICB0aGlzLmVsZW1lbnRzKHVwZGF0ZV90cmFjay5yZXRyaWV2ZXIoKShvYmoubG9jKSk7XG4gICAgICAgIG9iai5vbl9zdWNjZXNzKCk7XG4gICAgfTtcblxuICAgIGFwaWpzICh1cGRhdGVfdHJhY2spXG5cdC5nZXRzZXQgKCdyZXRyaWV2ZXInLCBmdW5jdGlvbiAoKSB7fSlcblxuICAgIHJldHVybiB1cGRhdGVfdHJhY2s7XG59O1xuXG5kYXRhLnJldHJpZXZlci5hc3luYyA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgdXJsID0gJyc7XG5cbiAgICAvLyBcInRoaXNcIiBpcyBzZXQgdG8gdGhlIGRhdGEgb2JqXG4gICAgdmFyIGRhdGFfb2JqID0gdGhpcztcbiAgICB2YXIgdXBkYXRlX3RyYWNrID0gZnVuY3Rpb24gKG9iaikge1xuXHRkMy5qc29uKHVybCwgZnVuY3Rpb24gKGVyciwgcmVzcCkge1xuXHQgICAgZGF0YV9vYmouZWxlbWVudHMocmVzcCk7XG5cdCAgICBvYmoub25fc3VjY2VzcygpO1xuXHR9KTsgXG4gICAgfTtcblxuICAgIGFwaWpzICh1cGRhdGVfdHJhY2spXG5cdC5nZXRzZXQgKCd1cmwnLCAnJyk7XG5cbiAgICByZXR1cm4gdXBkYXRlX3RyYWNrO1xufTtcblxuXG5cbi8vIEEgcHJlZGVmaW5lZCB0cmFjayBmb3IgZ2VuZXNcbi8vIHRudC50cmFjay5kYXRhLmdlbmUgPSBmdW5jdGlvbiAoKSB7XG4vLyAgICAgdmFyIHRyYWNrID0gdG50LnRyYWNrLmRhdGEoKTtcbi8vIFx0Ly8gLmluZGV4KFwiSURcIik7XG5cbi8vICAgICB2YXIgdXBkYXRlciA9IHRudC50cmFjay5yZXRyaWV2ZXIuZW5zZW1ibCgpXG4vLyBcdC5lbmRwb2ludChcInJlZ2lvblwiKVxuLy8gICAgIC8vIFRPRE86IElmIHN1Y2Nlc3MgaXMgZGVmaW5lZCBoZXJlLCBtZWFucyB0aGF0IGl0IGNhbid0IGJlIHVzZXItZGVmaW5lZFxuLy8gICAgIC8vIGlzIHRoYXQgZ29vZD8gZW5vdWdoPyBBUEk/XG4vLyAgICAgLy8gVVBEQVRFOiBOb3cgc3VjY2VzcyBpcyBiYWNrZWQgdXAgYnkgYW4gYXJyYXkuIFN0aWxsIGRvbid0IGtub3cgaWYgdGhpcyBpcyB0aGUgYmVzdCBvcHRpb25cbi8vIFx0LnN1Y2Nlc3MoZnVuY3Rpb24oZ2VuZXMpIHtcbi8vIFx0ICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZ2VuZXMubGVuZ3RoOyBpKyspIHtcbi8vIFx0XHRpZiAoZ2VuZXNbaV0uc3RyYW5kID09PSAtMSkgeyAgXG4vLyBcdFx0ICAgIGdlbmVzW2ldLmRpc3BsYXlfbGFiZWwgPSBcIjxcIiArIGdlbmVzW2ldLmV4dGVybmFsX25hbWU7XG4vLyBcdFx0fSBlbHNlIHtcbi8vIFx0XHQgICAgZ2VuZXNbaV0uZGlzcGxheV9sYWJlbCA9IGdlbmVzW2ldLmV4dGVybmFsX25hbWUgKyBcIj5cIjtcbi8vIFx0XHR9XG4vLyBcdCAgICB9XG4vLyBcdH0pO1xuXG4vLyAgICAgcmV0dXJuIHRyYWNrLnVwZGF0ZSh1cGRhdGVyKTtcbi8vIH1cblxuLy8gQSBwcmVkZWZpbmVkIHRyYWNrIGRpc3BsYXlpbmcgbm8gZXh0ZXJuYWwgZGF0YVxuLy8gaXQgaXMgdXNlZCBmb3IgbG9jYXRpb24gYW5kIGF4aXMgdHJhY2tzIGZvciBleGFtcGxlXG5kYXRhLmVtcHR5ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciB0cmFjayA9IGRhdGEoKTtcbiAgICB2YXIgdXBkYXRlciA9IGRhdGEucmV0cmlldmVyLnN5bmMoKTtcbiAgICB0cmFjay51cGRhdGUodXBkYXRlcik7XG5cbiAgICByZXR1cm4gdHJhY2s7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSBkYXRhO1xuIiwidmFyIGFwaWpzID0gcmVxdWlyZSAoXCJ0bnQuYXBpXCIpO1xudmFyIGxheW91dCA9IHJlcXVpcmUoXCIuL2xheW91dC5qc1wiKTtcblxuLy8gRkVBVFVSRSBWSVNcbi8vIHZhciBib2FyZCA9IHt9O1xuLy8gYm9hcmQudHJhY2sgPSB7fTtcbnZhciB0bnRfZmVhdHVyZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLy8vLy8gVmFycyBleHBvc2VkIGluIHRoZSBBUElcbiAgICB2YXIgZXhwb3J0cyA9IHtcblx0Y3JlYXRlICAgOiBmdW5jdGlvbiAoKSB7dGhyb3cgXCJjcmVhdGVfZWxlbSBpcyBub3QgZGVmaW5lZCBpbiB0aGUgYmFzZSBmZWF0dXJlIG9iamVjdFwifSxcblx0bW92ZXIgICAgOiBmdW5jdGlvbiAoKSB7dGhyb3cgXCJtb3ZlX2VsZW0gaXMgbm90IGRlZmluZWQgaW4gdGhlIGJhc2UgZmVhdHVyZSBvYmplY3RcIn0sXG5cdHVwZGF0ZXIgIDogZnVuY3Rpb24gKCkge30sXG5cdG9uX2NsaWNrIDogZnVuY3Rpb24gKCkge30sXG5cdG9uX21vdXNlb3ZlciA6IGZ1bmN0aW9uICgpIHt9LFxuXHRndWlkZXIgICA6IGZ1bmN0aW9uICgpIHt9LFxuXHRpbmRleCAgICA6IHVuZGVmaW5lZCxcblx0bGF5b3V0ICAgOiBsYXlvdXQuaWRlbnRpdHkoKSxcblx0Zm9yZWdyb3VuZF9jb2xvciA6ICcjMDAwJ1xuICAgIH07XG5cblxuICAgIC8vIFRoZSByZXR1cm5lZCBvYmplY3RcbiAgICB2YXIgZmVhdHVyZSA9IHt9O1xuXG4gICAgdmFyIHJlc2V0ID0gZnVuY3Rpb24gKCkge1xuICAgIFx0dmFyIHRyYWNrID0gdGhpcztcbiAgICBcdHRyYWNrLmcuc2VsZWN0QWxsKFwiLnRudF9lbGVtXCIpLnJlbW92ZSgpO1xuXHR0cmFjay5nLnNlbGVjdEFsbChcIi50bnRfZ3VpZGVyXCIpLnJlbW92ZSgpO1xuICAgIH07XG5cbiAgICB2YXIgaW5pdCA9IGZ1bmN0aW9uICh3aWR0aCkge1xuXHR2YXIgdHJhY2sgPSB0aGlzO1xuXHRleHBvcnRzLmd1aWRlci5jYWxsKHRyYWNrLCB3aWR0aCk7XG4gICAgfTtcblxuICAgIHZhciBwbG90ID0gZnVuY3Rpb24gKG5ld19lbGVtcywgdHJhY2ssIHhTY2FsZSkge1xuXHRuZXdfZWxlbXMub24oXCJjbGlja1wiLCBleHBvcnRzLm9uX2NsaWNrKTtcblx0bmV3X2VsZW1zLm9uKFwibW91c2VvdmVyXCIsIGV4cG9ydHMub25fbW91c2VvdmVyKTtcblx0Ly8gbmV3X2VsZW0gaXMgYSBnIGVsZW1lbnQgd2hlcmUgdGhlIGZlYXR1cmUgaXMgaW5zZXJ0ZWRcblx0ZXhwb3J0cy5jcmVhdGUuY2FsbCh0cmFjaywgbmV3X2VsZW1zLCB4U2NhbGUpO1xuICAgIH07XG5cbiAgICB2YXIgdXBkYXRlID0gZnVuY3Rpb24gKHhTY2FsZSwgZmllbGQpIHtcblx0dmFyIHRyYWNrID0gdGhpcztcblx0dmFyIHN2Z19nID0gdHJhY2suZztcblx0dmFyIGxheW91dCA9IGV4cG9ydHMubGF5b3V0O1xuXG5cdHZhciBlbGVtZW50cyA9IHRyYWNrLmRhdGEoKS5lbGVtZW50cygpO1xuXG5cdGlmIChmaWVsZCAhPT0gdW5kZWZpbmVkKSB7XG5cdCAgICBlbGVtZW50cyA9IGVsZW1lbnRzW2ZpZWxkXTtcblx0fVxuXG5cdGxheW91dChlbGVtZW50cywgeFNjYWxlKTtcblx0dmFyIGRhdGFfZWxlbXMgPSBsYXlvdXQuZWxlbWVudHMoKTtcblxuXHR2YXIgdmlzX3NlbDtcblx0dmFyIHZpc19lbGVtcztcblx0aWYgKGZpZWxkICE9PSB1bmRlZmluZWQpIHtcblx0ICAgIHZpc19zZWwgPSBzdmdfZy5zZWxlY3RBbGwoXCIudG50X2VsZW1fXCIgKyBmaWVsZCk7XG5cdH0gZWxzZSB7XG5cdCAgICB2aXNfc2VsID0gc3ZnX2cuc2VsZWN0QWxsKFwiLnRudF9lbGVtXCIpO1xuXHR9XG5cblx0aWYgKGV4cG9ydHMuaW5kZXgpIHsgLy8gSW5kZXhpbmcgYnkgZmllbGRcblx0ICAgIHZpc19lbGVtcyA9IHZpc19zZWxcblx0XHQuZGF0YShkYXRhX2VsZW1zLCBmdW5jdGlvbiAoZCkge1xuXHRcdCAgICBpZiAoZCAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRyZXR1cm4gZXhwb3J0cy5pbmRleChkKTtcblx0XHQgICAgfVxuXHRcdH0pXG5cdH0gZWxzZSB7IC8vIEluZGV4aW5nIGJ5IHBvc2l0aW9uIGluIGFycmF5XG5cdCAgICB2aXNfZWxlbXMgPSB2aXNfc2VsXG5cdFx0LmRhdGEoZGF0YV9lbGVtcylcblx0fVxuXG5cdGV4cG9ydHMudXBkYXRlci5jYWxsKHRyYWNrLCB2aXNfZWxlbXMsIHhTY2FsZSk7XG5cblx0dmFyIG5ld19lbGVtID0gdmlzX2VsZW1zXG5cdCAgICAuZW50ZXIoKTtcblxuXHRuZXdfZWxlbVxuXHQgICAgLmFwcGVuZChcImdcIilcblx0ICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfZWxlbVwiKVxuXHQgICAgLmNsYXNzZWQoXCJ0bnRfZWxlbV9cIiArIGZpZWxkLCBmaWVsZClcblx0ICAgIC5jYWxsKGZlYXR1cmUucGxvdCwgdHJhY2ssIHhTY2FsZSk7XG5cblx0dmlzX2VsZW1zXG5cdCAgICAuZXhpdCgpXG5cdCAgICAucmVtb3ZlKCk7XG4gICAgfTtcblxuICAgIHZhciBtb3ZlID0gZnVuY3Rpb24gKHhTY2FsZSwgZmllbGQpIHtcblx0dmFyIHRyYWNrID0gdGhpcztcblx0dmFyIHN2Z19nID0gdHJhY2suZztcblx0dmFyIGVsZW1zO1xuXHQvLyBUT0RPOiBJcyBzZWxlY3RpbmcgdGhlIGVsZW1lbnRzIHRvIG1vdmUgdG9vIHNsb3c/XG5cdC8vIEl0IHdvdWxkIGJlIG5pY2UgdG8gcHJvZmlsZVxuXHRpZiAoZmllbGQgIT09IHVuZGVmaW5lZCkge1xuXHQgICAgZWxlbXMgPSBzdmdfZy5zZWxlY3RBbGwoXCIudG50X2VsZW1fXCIgKyBmaWVsZCk7XG5cdH0gZWxzZSB7XG5cdCAgICBlbGVtcyA9IHN2Z19nLnNlbGVjdEFsbChcIi50bnRfZWxlbVwiKTtcblx0fVxuXG5cdGV4cG9ydHMubW92ZXIuY2FsbCh0aGlzLCBlbGVtcywgeFNjYWxlKTtcbiAgICB9O1xuXG4gICAgdmFyIG1vdmVfdG9fZnJvbnQgPSBmdW5jdGlvbiAoZmllbGQpIHtcblx0aWYgKGZpZWxkICE9PSB1bmRlZmluZWQpIHtcblx0ICAgIHZhciB0cmFjayA9IHRoaXM7XG5cdCAgICB2YXIgc3ZnX2cgPSB0cmFjay5nO1xuXHQgICAgc3ZnX2cuc2VsZWN0QWxsKFwiLnRudF9lbGVtX1wiICsgZmllbGQpLm1vdmVfdG9fZnJvbnQoKTtcblx0fVxuICAgIH07XG5cbiAgICAvLyBBUElcbiAgICBhcGlqcyAoZmVhdHVyZSlcblx0LmdldHNldCAoZXhwb3J0cylcblx0Lm1ldGhvZCAoe1xuXHQgICAgcmVzZXQgIDogcmVzZXQsXG5cdCAgICBwbG90ICAgOiBwbG90LFxuXHQgICAgdXBkYXRlIDogdXBkYXRlLFxuXHQgICAgbW92ZSAgIDogbW92ZSxcblx0ICAgIGluaXQgICA6IGluaXQsXG5cdCAgICBtb3ZlX3RvX2Zyb250IDogbW92ZV90b19mcm9udFxuXHR9KTtcblxuICAgIHJldHVybiBmZWF0dXJlO1xufTtcblxudG50X2ZlYXR1cmUuY29tcG9zaXRlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBkaXNwbGF5cyA9IHt9O1xuICAgIHZhciBkaXNwbGF5X29yZGVyID0gW107XG5cbiAgICB2YXIgZmVhdHVyZXMgPSB7fTtcblxuICAgIHZhciByZXNldCA9IGZ1bmN0aW9uICgpIHtcblx0dmFyIHRyYWNrID0gdGhpcztcblx0Zm9yICh2YXIgaT0wOyBpPGRpc3BsYXlzLmxlbmd0aDsgaSsrKSB7XG5cdCAgICBkaXNwbGF5c1tpXS5yZXNldC5jYWxsKHRyYWNrKTtcblx0fVxuICAgIH07XG5cbiAgICB2YXIgaW5pdCA9IGZ1bmN0aW9uICh3aWR0aCkge1xuXHR2YXIgdHJhY2sgPSB0aGlzO1xuIFx0Zm9yICh2YXIgZGlzcGxheSBpbiBkaXNwbGF5cykge1xuXHQgICAgaWYgKGRpc3BsYXlzLmhhc093blByb3BlcnR5KGRpc3BsYXkpKSB7XG5cdFx0ZGlzcGxheXNbZGlzcGxheV0uaW5pdC5jYWxsKHRyYWNrLCB3aWR0aCk7XG5cdCAgICB9XG5cdH1cbiAgICB9O1xuXG4gICAgdmFyIHVwZGF0ZSA9IGZ1bmN0aW9uICh4U2NhbGUpIHtcblx0dmFyIHRyYWNrID0gdGhpcztcblx0Zm9yICh2YXIgaT0wOyBpPGRpc3BsYXlfb3JkZXIubGVuZ3RoOyBpKyspIHtcblx0ICAgIGRpc3BsYXlzW2Rpc3BsYXlfb3JkZXJbaV1dLnVwZGF0ZS5jYWxsKHRyYWNrLCB4U2NhbGUsIGRpc3BsYXlfb3JkZXJbaV0pO1xuXHQgICAgZGlzcGxheXNbZGlzcGxheV9vcmRlcltpXV0ubW92ZV90b19mcm9udC5jYWxsKHRyYWNrLCBkaXNwbGF5X29yZGVyW2ldKTtcblx0fVxuXHQvLyBmb3IgKHZhciBkaXNwbGF5IGluIGRpc3BsYXlzKSB7XG5cdC8vICAgICBpZiAoZGlzcGxheXMuaGFzT3duUHJvcGVydHkoZGlzcGxheSkpIHtcblx0Ly8gXHRkaXNwbGF5c1tkaXNwbGF5XS51cGRhdGUuY2FsbCh0cmFjaywgeFNjYWxlLCBkaXNwbGF5KTtcblx0Ly8gICAgIH1cblx0Ly8gfVxuICAgIH07XG5cbiAgICB2YXIgbW92ZSA9IGZ1bmN0aW9uICh4U2NhbGUpIHtcblx0dmFyIHRyYWNrID0gdGhpcztcblx0Zm9yICh2YXIgZGlzcGxheSBpbiBkaXNwbGF5cykge1xuXHQgICAgaWYgKGRpc3BsYXlzLmhhc093blByb3BlcnR5KGRpc3BsYXkpKSB7XG5cdFx0ZGlzcGxheXNbZGlzcGxheV0ubW92ZS5jYWxsKHRyYWNrLCB4U2NhbGUsIGRpc3BsYXkpO1xuXHQgICAgfVxuXHR9XG4gICAgfTtcblxuICAgIHZhciBhZGQgPSBmdW5jdGlvbiAoa2V5LCBkaXNwbGF5KSB7XG5cdGRpc3BsYXlzW2tleV0gPSBkaXNwbGF5O1xuXHRkaXNwbGF5X29yZGVyLnB1c2goa2V5KTtcblx0cmV0dXJuIGZlYXR1cmVzO1xuICAgIH07XG5cbiAgICAvLyBBUElcbiAgICBhcGlqcyAoZmVhdHVyZXMpXG5cdC5tZXRob2QgKHtcblx0ICAgIHJlc2V0ICA6IHJlc2V0LFxuXHQgICAgdXBkYXRlIDogdXBkYXRlLFxuXHQgICAgbW92ZSAgIDogbW92ZSxcblx0ICAgIGluaXQgICA6IGluaXQsXG5cdCAgICBhZGQgICAgOiBhZGRcblx0fSk7XG5cblxuICAgIHJldHVybiBmZWF0dXJlcztcbn07XG5cbnRudF9mZWF0dXJlLnNlcXVlbmNlID0gZnVuY3Rpb24gKCkge1xuICAgIC8vICdJbmhlcml0JyBmcm9tIHRudC50cmFjay5mZWF0dXJlXG4gICAgdmFyIGZlYXR1cmUgPSB0bnRfZmVhdHVyZSgpO1xuXG4gICAgdmFyIGNvbmZpZyA9IHtcblx0Zm9udHNpemUgOiAxMCxcblx0c2VxdWVuY2UgOiBmdW5jdGlvbiAoZCkge1xuXHQgICAgcmV0dXJuIGQuc2VxdWVuY2Vcblx0fVxuICAgIH07XG5cbiAgICB2YXIgYXBpID0gYXBpanMgKGZlYXR1cmUpXG5cdC5nZXRzZXQgKGNvbmZpZyk7XG5cblxuICAgIGZlYXR1cmUuY3JlYXRlIChmdW5jdGlvbiAobmV3X250cywgeFNjYWxlKSB7XG5cdHZhciB0cmFjayA9IHRoaXM7XG5cblx0bmV3X250c1xuXHQgICAgLmFwcGVuZChcInRleHRcIilcblx0ICAgIC5hdHRyKFwiZmlsbFwiLCB0cmFjay5iYWNrZ3JvdW5kX2NvbG9yKCkpXG5cdCAgICAuc3R5bGUoJ2ZvbnQtc2l6ZScsIGNvbmZpZy5mb250c2l6ZSArIFwicHhcIilcblx0ICAgIC5hdHRyKFwieFwiLCBmdW5jdGlvbiAoZCkge1xuXHRcdHJldHVybiB4U2NhbGUgKGQucG9zKTtcblx0ICAgIH0pXG5cdCAgICAuYXR0cihcInlcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHRyZXR1cm4gfn4odHJhY2suaGVpZ2h0KCkgLyAyKSArIDU7IFxuXHQgICAgfSlcblx0ICAgIC50ZXh0KGNvbmZpZy5zZXF1ZW5jZSlcblx0ICAgIC50cmFuc2l0aW9uKClcblx0ICAgIC5kdXJhdGlvbig1MDApXG5cdCAgICAuYXR0cignZmlsbCcsIGZlYXR1cmUuZm9yZWdyb3VuZF9jb2xvcigpKTtcbiAgICB9KTtcblxuICAgIGZlYXR1cmUubW92ZXIgKGZ1bmN0aW9uIChudHMsIHhTY2FsZSkge1xuXHRudHMuc2VsZWN0IChcInRleHRcIilcblx0ICAgIC5hdHRyKFwieFwiLCBmdW5jdGlvbiAoZCkge1xuXHRcdHJldHVybiB4U2NhbGUoZC5wb3MpO1xuXHQgICAgfSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZmVhdHVyZTtcbn07XG5cbnRudF9mZWF0dXJlLmFyZWEgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGZlYXR1cmUgPSB0bnRfZmVhdHVyZS5saW5lKCk7XG4gICAgdmFyIGxpbmUgPSB0bnRfZmVhdHVyZS5saW5lKCk7XG5cbiAgICB2YXIgYXJlYSA9IGQzLnN2Zy5hcmVhKClcblx0LmludGVycG9sYXRlKGxpbmUuaW50ZXJwb2xhdGUoKSlcblx0LnRlbnNpb24oZmVhdHVyZS50ZW5zaW9uKCkpO1xuXG4gICAgdmFyIGRhdGFfcG9pbnRzO1xuXG4gICAgdmFyIGxpbmVfY3JlYXRlID0gZmVhdHVyZS5jcmVhdGUoKTsgLy8gV2UgJ3NhdmUnIGxpbmUgY3JlYXRpb25cbiAgICBmZWF0dXJlLmNyZWF0ZSAoZnVuY3Rpb24gKHBvaW50cywgeFNjYWxlKSB7XG5cdHZhciB0cmFjayA9IHRoaXM7XG5cblx0aWYgKGRhdGFfcG9pbnRzICE9PSB1bmRlZmluZWQpIHtcbi8vXHQgICAgIHJldHVybjtcblx0ICAgIHRyYWNrLmcuc2VsZWN0KFwicGF0aFwiKS5yZW1vdmUoKTtcblx0fVxuXG5cdGxpbmVfY3JlYXRlLmNhbGwodHJhY2ssIHBvaW50cywgeFNjYWxlKTtcblxuXHRhcmVhXG5cdCAgICAueChsaW5lLngoKSlcblx0ICAgIC55MShsaW5lLnkoKSlcblx0ICAgIC55MCh0cmFjay5oZWlnaHQoKSk7XG5cblx0ZGF0YV9wb2ludHMgPSBwb2ludHMuZGF0YSgpO1xuXHRwb2ludHMucmVtb3ZlKCk7XG5cblx0dHJhY2suZ1xuXHQgICAgLmFwcGVuZChcInBhdGhcIilcblx0ICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfYXJlYVwiKVxuXHQgICAgLmNsYXNzZWQoXCJ0bnRfZWxlbVwiLCB0cnVlKVxuXHQgICAgLmRhdHVtKGRhdGFfcG9pbnRzKVxuXHQgICAgLmF0dHIoXCJkXCIsIGFyZWEpXG5cdCAgICAuYXR0cihcImZpbGxcIiwgZDMucmdiKGZlYXR1cmUuZm9yZWdyb3VuZF9jb2xvcigpKS5icmlnaHRlcigpKTtcblx0XG4gICAgfSk7XG5cbiAgICB2YXIgbGluZV9tb3ZlciA9IGZlYXR1cmUubW92ZXIoKTtcbiAgICBmZWF0dXJlLm1vdmVyIChmdW5jdGlvbiAocGF0aCwgeFNjYWxlKSB7XG5cdHZhciB0cmFjayA9IHRoaXM7XG5cdGxpbmVfbW92ZXIuY2FsbCh0cmFjaywgcGF0aCwgeFNjYWxlKTtcblxuXHRhcmVhLngobGluZS54KCkpO1xuXHR0cmFjay5nXG5cdCAgICAuc2VsZWN0KFwiLnRudF9hcmVhXCIpXG5cdCAgICAuZGF0dW0oZGF0YV9wb2ludHMpXG5cdCAgICAuYXR0cihcImRcIiwgYXJlYSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZmVhdHVyZTtcblxufTtcblxudG50X2ZlYXR1cmUubGluZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgZmVhdHVyZSA9IHRudF9mZWF0dXJlKCk7XG5cbiAgICB2YXIgeCA9IGZ1bmN0aW9uIChkKSB7XG5cdHJldHVybiBkLnBvcztcbiAgICB9O1xuICAgIHZhciB5ID0gZnVuY3Rpb24gKGQpIHtcblx0cmV0dXJuIGQudmFsO1xuICAgIH07XG4gICAgdmFyIHRlbnNpb24gPSAwLjc7XG4gICAgdmFyIHlTY2FsZSA9IGQzLnNjYWxlLmxpbmVhcigpO1xuICAgIHZhciBsaW5lID0gZDMuc3ZnLmxpbmUoKVxuXHQuaW50ZXJwb2xhdGUoXCJiYXNpc1wiKTtcblxuICAgIC8vIGxpbmUgZ2V0dGVyLiBUT0RPOiBTZXR0ZXI/XG4gICAgZmVhdHVyZS5saW5lID0gZnVuY3Rpb24gKCkge1xuXHRyZXR1cm4gbGluZTtcbiAgICB9O1xuXG4gICAgZmVhdHVyZS54ID0gZnVuY3Rpb24gKGNiYWspIHtcblx0aWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG5cdCAgICByZXR1cm4geDtcblx0fVxuXHR4ID0gY2Jhaztcblx0cmV0dXJuIGZlYXR1cmU7XG4gICAgfTtcblxuICAgIGZlYXR1cmUueSA9IGZ1bmN0aW9uIChjYmFrKSB7XG5cdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHQgICAgcmV0dXJuIHk7XG5cdH1cblx0eSA9IGNiYWs7XG5cdHJldHVybiBmZWF0dXJlO1xuICAgIH07XG5cbiAgICBmZWF0dXJlLnRlbnNpb24gPSBmdW5jdGlvbiAodCkge1xuXHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0ICAgIHJldHVybiB0ZW5zaW9uO1xuXHR9XG5cdHRlbnNpb24gPSB0O1xuXHRyZXR1cm4gZmVhdHVyZTtcbiAgICB9O1xuXG4gICAgdmFyIGRhdGFfcG9pbnRzO1xuXG4gICAgLy8gRm9yIG5vdywgY3JlYXRlIGlzIGEgb25lLW9mZiBldmVudFxuICAgIC8vIFRPRE86IE1ha2UgaXQgd29yayB3aXRoIHBhcnRpYWwgcGF0aHMsIGllLiBjcmVhdGluZyBhbmQgZGlzcGxheWluZyBvbmx5IHRoZSBwYXRoIHRoYXQgaXMgYmVpbmcgZGlzcGxheWVkXG4gICAgZmVhdHVyZS5jcmVhdGUgKGZ1bmN0aW9uIChwb2ludHMsIHhTY2FsZSkge1xuXHR2YXIgdHJhY2sgPSB0aGlzO1xuXG5cdGlmIChkYXRhX3BvaW50cyAhPT0gdW5kZWZpbmVkKSB7XG5cdCAgICAvLyByZXR1cm47XG5cdCAgICB0cmFjay5nLnNlbGVjdChcInBhdGhcIikucmVtb3ZlKCk7XG5cdH1cblxuXHRsaW5lXG5cdCAgICAudGVuc2lvbih0ZW5zaW9uKVxuXHQgICAgLngoZnVuY3Rpb24gKGQpIHtyZXR1cm4geFNjYWxlKHgoZCkpfSlcblx0ICAgIC55KGZ1bmN0aW9uIChkKSB7cmV0dXJuIHRyYWNrLmhlaWdodCgpIC0geVNjYWxlKHkoZCkpfSlcblxuXHRkYXRhX3BvaW50cyA9IHBvaW50cy5kYXRhKCk7XG5cdHBvaW50cy5yZW1vdmUoKTtcblxuXHR5U2NhbGVcblx0ICAgIC5kb21haW4oWzAsIDFdKVxuXHQgICAgLy8gLmRvbWFpbihbMCwgZDMubWF4KGRhdGFfcG9pbnRzLCBmdW5jdGlvbiAoZCkge1xuXHQgICAgLy8gXHRyZXR1cm4geShkKTtcblx0ICAgIC8vIH0pXSlcblx0ICAgIC5yYW5nZShbMCwgdHJhY2suaGVpZ2h0KCkgLSAyXSk7XG5cdFxuXHR0cmFjay5nXG5cdCAgICAuYXBwZW5kKFwicGF0aFwiKVxuXHQgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF9lbGVtXCIpXG5cdCAgICAuYXR0cihcImRcIiwgbGluZShkYXRhX3BvaW50cykpXG5cdCAgICAuc3R5bGUoXCJzdHJva2VcIiwgZmVhdHVyZS5mb3JlZ3JvdW5kX2NvbG9yKCkpXG5cdCAgICAuc3R5bGUoXCJzdHJva2Utd2lkdGhcIiwgNClcblx0ICAgIC5zdHlsZShcImZpbGxcIiwgXCJub25lXCIpO1xuXG4gICAgfSk7XG5cbiAgICBmZWF0dXJlLm1vdmVyIChmdW5jdGlvbiAocGF0aCwgeFNjYWxlKSB7XG5cdHZhciB0cmFjayA9IHRoaXM7XG5cblx0bGluZS54KGZ1bmN0aW9uIChkKSB7XG5cdCAgICByZXR1cm4geFNjYWxlKHgoZCkpXG5cdH0pO1xuXHR0cmFjay5nLnNlbGVjdChcInBhdGhcIilcblx0ICAgIC5hdHRyKFwiZFwiLCBsaW5lKGRhdGFfcG9pbnRzKSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZmVhdHVyZTtcbn07XG5cbnRudF9mZWF0dXJlLmNvbnNlcnZhdGlvbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyAnSW5oZXJpdCcgZnJvbSBmZWF0dXJlLmFyZWFcbiAgICB2YXIgZmVhdHVyZSA9IHRudF9mZWF0dXJlLmFyZWEoKTtcblxuICAgIHZhciBhcmVhX2NyZWF0ZSA9IGZlYXR1cmUuY3JlYXRlKCk7IC8vIFdlICdzYXZlJyBhcmVhIGNyZWF0aW9uXG4gICAgZmVhdHVyZS5jcmVhdGUgIChmdW5jdGlvbiAocG9pbnRzLCB4U2NhbGUpIHtcblx0dmFyIHRyYWNrID0gdGhpcztcblxuXHRhcmVhX2NyZWF0ZS5jYWxsKHRyYWNrLCBkMy5zZWxlY3QocG9pbnRzWzBdWzBdKSwgeFNjYWxlKVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIGZlYXR1cmU7XG59O1xuXG50bnRfZmVhdHVyZS5lbnNlbWJsID0gZnVuY3Rpb24gKCkge1xuICAgIC8vICdJbmhlcml0JyBmcm9tIGJvYXJkLnRyYWNrLmZlYXR1cmVcbiAgICB2YXIgZmVhdHVyZSA9IHRudF9mZWF0dXJlKCk7XG5cbiAgICB2YXIgZm9yZWdyb3VuZF9jb2xvcjIgPSBcIiM3RkZGMDBcIjtcbiAgICB2YXIgZm9yZWdyb3VuZF9jb2xvcjMgPSBcIiMwMEJCMDBcIjtcblxuICAgIGZlYXR1cmUuZ3VpZGVyIChmdW5jdGlvbiAod2lkdGgpIHtcblx0dmFyIHRyYWNrID0gdGhpcztcblx0dmFyIGhlaWdodF9vZmZzZXQgPSB+fih0cmFjay5oZWlnaHQoKSAtICh0cmFjay5oZWlnaHQoKSAgKiAuOCkpIC8gMjtcblxuXHR0cmFjay5nXG5cdCAgICAuYXBwZW5kKFwibGluZVwiKVxuXHQgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF9ndWlkZXJcIilcblx0ICAgIC5hdHRyKFwieDFcIiwgMClcblx0ICAgIC5hdHRyKFwieDJcIiwgd2lkdGgpXG5cdCAgICAuYXR0cihcInkxXCIsIGhlaWdodF9vZmZzZXQpXG5cdCAgICAuYXR0cihcInkyXCIsIGhlaWdodF9vZmZzZXQpXG5cdCAgICAuc3R5bGUoXCJzdHJva2VcIiwgZmVhdHVyZS5mb3JlZ3JvdW5kX2NvbG9yKCkpXG5cdCAgICAuc3R5bGUoXCJzdHJva2Utd2lkdGhcIiwgMSk7XG5cblx0dHJhY2suZ1xuXHQgICAgLmFwcGVuZChcImxpbmVcIilcblx0ICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfZ3VpZGVyXCIpXG5cdCAgICAuYXR0cihcIngxXCIsIDApXG5cdCAgICAuYXR0cihcIngyXCIsIHdpZHRoKVxuXHQgICAgLmF0dHIoXCJ5MVwiLCB0cmFjay5oZWlnaHQoKSAtIGhlaWdodF9vZmZzZXQpXG5cdCAgICAuYXR0cihcInkyXCIsIHRyYWNrLmhlaWdodCgpIC0gaGVpZ2h0X29mZnNldClcblx0ICAgIC5zdHlsZShcInN0cm9rZVwiLCBmZWF0dXJlLmZvcmVncm91bmRfY29sb3IoKSlcblx0ICAgIC5zdHlsZShcInN0cm9rZS13aWR0aFwiLCAxKTtcblxuICAgIH0pO1xuXG4gICAgZmVhdHVyZS5jcmVhdGUgKGZ1bmN0aW9uIChuZXdfZWxlbXMsIHhTY2FsZSkge1xuXHR2YXIgdHJhY2sgPSB0aGlzO1xuXG5cdHZhciBoZWlnaHRfb2Zmc2V0ID0gfn4odHJhY2suaGVpZ2h0KCkgLSAodHJhY2suaGVpZ2h0KCkgICogLjgpKSAvIDI7XG5cblx0bmV3X2VsZW1zXG5cdCAgICAuYXBwZW5kKFwicmVjdFwiKVxuXHQgICAgLmF0dHIoXCJ4XCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0cmV0dXJuIHhTY2FsZSAoZC5zdGFydCk7XG5cdCAgICB9KVxuXHQgICAgLmF0dHIoXCJ5XCIsIGhlaWdodF9vZmZzZXQpXG4vLyBcdCAgICAuYXR0cihcInJ4XCIsIDMpXG4vLyBcdCAgICAuYXR0cihcInJ5XCIsIDMpXG5cdCAgICAuYXR0cihcIndpZHRoXCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0cmV0dXJuICh4U2NhbGUoZC5lbmQpIC0geFNjYWxlKGQuc3RhcnQpKTtcblx0ICAgIH0pXG5cdCAgICAuYXR0cihcImhlaWdodFwiLCB0cmFjay5oZWlnaHQoKSAtIH5+KGhlaWdodF9vZmZzZXQgKiAyKSlcblx0ICAgIC5hdHRyKFwiZmlsbFwiLCB0cmFjay5iYWNrZ3JvdW5kX2NvbG9yKCkpXG5cdCAgICAudHJhbnNpdGlvbigpXG5cdCAgICAuZHVyYXRpb24oNTAwKVxuXHQgICAgLmF0dHIoXCJmaWxsXCIsIGZ1bmN0aW9uIChkKSB7IFxuXHRcdGlmIChkLnR5cGUgPT09ICdoaWdoJykge1xuXHRcdCAgICByZXR1cm4gZDMucmdiKGZlYXR1cmUuZm9yZWdyb3VuZF9jb2xvcigpKTtcblx0XHR9XG5cdFx0aWYgKGQudHlwZSA9PT0gJ2xvdycpIHtcblx0XHQgICAgcmV0dXJuIGQzLnJnYihmZWF0dXJlLmZvcmVncm91bmRfY29sb3IyKCkpO1xuXHRcdH1cblx0XHRyZXR1cm4gZDMucmdiKGZlYXR1cmUuZm9yZWdyb3VuZF9jb2xvcjMoKSk7XG5cdCAgICB9KTtcbiAgICB9KTtcblxuICAgIGZlYXR1cmUudXBkYXRlciAoZnVuY3Rpb24gKGJsb2NrcywgeFNjYWxlKSB7XG5cdGJsb2Nrc1xuXHQgICAgLnNlbGVjdChcInJlY3RcIilcblx0ICAgIC5hdHRyKFwid2lkdGhcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHRyZXR1cm4gKHhTY2FsZShkLmVuZCkgLSB4U2NhbGUoZC5zdGFydCkpXG5cdCAgICB9KTtcbiAgICB9KTtcblxuICAgIGZlYXR1cmUubW92ZXIgKGZ1bmN0aW9uIChibG9ja3MsIHhTY2FsZSkge1xuXHRibG9ja3Ncblx0ICAgIC5zZWxlY3QoXCJyZWN0XCIpXG5cdCAgICAuYXR0cihcInhcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHRyZXR1cm4geFNjYWxlKGQuc3RhcnQpO1xuXHQgICAgfSlcblx0ICAgIC5hdHRyKFwid2lkdGhcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHRyZXR1cm4gKHhTY2FsZShkLmVuZCkgLSB4U2NhbGUoZC5zdGFydCkpO1xuXHQgICAgfSk7XG4gICAgfSk7XG5cbiAgICBmZWF0dXJlLmZvcmVncm91bmRfY29sb3IyID0gZnVuY3Rpb24gKGNvbCkge1xuXHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0ICAgIHJldHVybiBmb3JlZ3JvdW5kX2NvbG9yMjtcblx0fVxuXHRmb3JlZ3JvdW5kX2NvbG9yMiA9IGNvbDtcblx0cmV0dXJuIGZlYXR1cmU7XG4gICAgfTtcblxuICAgIGZlYXR1cmUuZm9yZWdyb3VuZF9jb2xvcjMgPSBmdW5jdGlvbiAoY29sKSB7XG5cdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHQgICAgcmV0dXJuIGZvcmVncm91bmRfY29sb3IzO1xuXHR9XG5cdGZvcmVncm91bmRfY29sb3IzID0gY29sO1xuXHRyZXR1cm4gZmVhdHVyZTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIGZlYXR1cmU7XG59O1xuXG50bnRfZmVhdHVyZS52bGluZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyAnSW5oZXJpdCcgZnJvbSBmZWF0dXJlXG4gICAgdmFyIGZlYXR1cmUgPSB0bnRfZmVhdHVyZSgpO1xuXG4gICAgZmVhdHVyZS5jcmVhdGUgKGZ1bmN0aW9uIChuZXdfZWxlbXMsIHhTY2FsZSkge1xuXHR2YXIgdHJhY2sgPSB0aGlzO1xuXHRuZXdfZWxlbXNcblx0ICAgIC5hcHBlbmQgKFwibGluZVwiKVxuXHQgICAgLmF0dHIoXCJ4MVwiLCBmdW5jdGlvbiAoZCkge1xuXHRcdC8vIFRPRE86IFNob3VsZCB1c2UgdGhlIGluZGV4IHZhbHVlP1xuXHRcdHJldHVybiB4U2NhbGUoZmVhdHVyZS5pbmRleCgpKGQpKVxuXHQgICAgfSlcblx0ICAgIC5hdHRyKFwieDJcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHRyZXR1cm4geFNjYWxlKGZlYXR1cmUuaW5kZXgoKShkKSlcblx0ICAgIH0pXG5cdCAgICAuYXR0cihcInkxXCIsIDApXG5cdCAgICAuYXR0cihcInkyXCIsIHRyYWNrLmhlaWdodCgpKVxuXHQgICAgLmF0dHIoXCJzdHJva2VcIiwgZmVhdHVyZS5mb3JlZ3JvdW5kX2NvbG9yKCkpXG5cdCAgICAuYXR0cihcInN0cm9rZS13aWR0aFwiLCAxKTtcbiAgICB9KTtcblxuICAgIGZlYXR1cmUubW92ZXIgKGZ1bmN0aW9uICh2bGluZXMsIHhTY2FsZSkge1xuXHR2bGluZXNcblx0ICAgIC5zZWxlY3QoXCJsaW5lXCIpXG5cdCAgICAuYXR0cihcIngxXCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0cmV0dXJuIHhTY2FsZShmZWF0dXJlLmluZGV4KCkoZCkpO1xuXHQgICAgfSlcblx0ICAgIC5hdHRyKFwieDJcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHRyZXR1cm4geFNjYWxlKGZlYXR1cmUuaW5kZXgoKShkKSk7XG5cdCAgICB9KTtcbiAgICB9KTtcblxuICAgIHJldHVybiBmZWF0dXJlO1xuXG59O1xuXG50bnRfZmVhdHVyZS5ibG9jayA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyAnSW5oZXJpdCcgZnJvbSBib2FyZC50cmFjay5mZWF0dXJlXG4gICAgdmFyIGZlYXR1cmUgPSB0bnRfZmVhdHVyZSgpO1xuXG4gICAgYXBpanMoZmVhdHVyZSlcblx0LmdldHNldCgnZnJvbScsIGZ1bmN0aW9uIChkKSB7XG5cdCAgICByZXR1cm4gZC5zdGFydDtcblx0fSlcblx0LmdldHNldCgndG8nLCBmdW5jdGlvbiAoZCkge1xuXHQgICAgcmV0dXJuIGQuZW5kO1xuXHR9KTtcblxuICAgIGZlYXR1cmUuY3JlYXRlKGZ1bmN0aW9uIChuZXdfZWxlbXMsIHhTY2FsZSkge1xuXHR2YXIgdHJhY2sgPSB0aGlzO1xuXHRuZXdfZWxlbXNcblx0ICAgIC5hcHBlbmQoXCJyZWN0XCIpXG5cdCAgICAuYXR0cihcInhcIiwgZnVuY3Rpb24gKGQsIGkpIHtcblx0XHQvLyBUT0RPOiBzdGFydCwgZW5kIHNob3VsZCBiZSBhZGp1c3RhYmxlIHZpYSB0aGUgdHJhY2tzIEFQSVxuXHRcdHJldHVybiB4U2NhbGUoZmVhdHVyZS5mcm9tKCkoZCwgaSkpO1xuXHQgICAgfSlcblx0ICAgIC5hdHRyKFwieVwiLCAwKVxuXHQgICAgLmF0dHIoXCJ3aWR0aFwiLCBmdW5jdGlvbiAoZCwgaSkge1xuXHRcdHJldHVybiAoeFNjYWxlKGZlYXR1cmUudG8oKShkLCBpKSkgLSB4U2NhbGUoZmVhdHVyZS5mcm9tKCkoZCwgaSkpKTtcblx0ICAgIH0pXG5cdCAgICAuYXR0cihcImhlaWdodFwiLCB0cmFjay5oZWlnaHQoKSlcblx0ICAgIC5hdHRyKFwiZmlsbFwiLCB0cmFjay5iYWNrZ3JvdW5kX2NvbG9yKCkpXG5cdCAgICAudHJhbnNpdGlvbigpXG5cdCAgICAuZHVyYXRpb24oNTAwKVxuXHQgICAgLmF0dHIoXCJmaWxsXCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0aWYgKGQuY29sb3IgPT09IHVuZGVmaW5lZCkge1xuXHRcdCAgICByZXR1cm4gZmVhdHVyZS5mb3JlZ3JvdW5kX2NvbG9yKCk7XG5cdFx0fSBlbHNlIHtcblx0XHQgICAgcmV0dXJuIGQuY29sb3I7XG5cdFx0fVxuXHQgICAgfSk7XG4gICAgfSk7XG5cbiAgICBmZWF0dXJlLnVwZGF0ZXIoZnVuY3Rpb24gKGVsZW1zLCB4U2NhbGUpIHtcblx0ZWxlbXNcblx0ICAgIC5zZWxlY3QoXCJyZWN0XCIpXG5cdCAgICAuYXR0cihcIndpZHRoXCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0cmV0dXJuICh4U2NhbGUoZC5lbmQpIC0geFNjYWxlKGQuc3RhcnQpKTtcblx0ICAgIH0pO1xuICAgIH0pO1xuXG4gICAgZmVhdHVyZS5tb3ZlcihmdW5jdGlvbiAoYmxvY2tzLCB4U2NhbGUpIHtcblx0YmxvY2tzXG5cdCAgICAuc2VsZWN0KFwicmVjdFwiKVxuXHQgICAgLmF0dHIoXCJ4XCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0cmV0dXJuIHhTY2FsZShkLnN0YXJ0KTtcblx0ICAgIH0pXG5cdCAgICAuYXR0cihcIndpZHRoXCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0cmV0dXJuICh4U2NhbGUoZC5lbmQpIC0geFNjYWxlKGQuc3RhcnQpKTtcblx0ICAgIH0pO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGZlYXR1cmU7XG5cbn07XG5cbnRudF9mZWF0dXJlLmF4aXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHhBeGlzO1xuICAgIHZhciBvcmllbnRhdGlvbiA9IFwidG9wXCI7XG5cbiAgICAvLyBBeGlzIGRvZXNuJ3QgaW5oZXJpdCBmcm9tIGZlYXR1cmVcbiAgICB2YXIgZmVhdHVyZSA9IHt9O1xuICAgIGZlYXR1cmUucmVzZXQgPSBmdW5jdGlvbiAoKSB7XG5cdHhBeGlzID0gdW5kZWZpbmVkO1xuXHR2YXIgdHJhY2sgPSB0aGlzO1xuXHR0cmFjay5nLnNlbGVjdEFsbChcInJlY3RcIikucmVtb3ZlKCk7XG5cdHRyYWNrLmcuc2VsZWN0QWxsKFwiLnRpY2tcIikucmVtb3ZlKCk7XG4gICAgfTtcbiAgICBmZWF0dXJlLnBsb3QgPSBmdW5jdGlvbiAoKSB7fTtcbiAgICBmZWF0dXJlLm1vdmUgPSBmdW5jdGlvbiAoKSB7XG5cdHZhciB0cmFjayA9IHRoaXM7XG5cdHZhciBzdmdfZyA9IHRyYWNrLmc7XG5cdHN2Z19nLmNhbGwoeEF4aXMpO1xuICAgIH1cbiAgICBcbiAgICBmZWF0dXJlLmluaXQgPSBmdW5jdGlvbiAoKSB7fTtcblxuICAgIGZlYXR1cmUudXBkYXRlID0gZnVuY3Rpb24gKHhTY2FsZSkge1xuXHQvLyBDcmVhdGUgQXhpcyBpZiBpdCBkb2Vzbid0IGV4aXN0XG5cdGlmICh4QXhpcyA9PT0gdW5kZWZpbmVkKSB7XG5cdCAgICB4QXhpcyA9IGQzLnN2Zy5heGlzKClcblx0XHQuc2NhbGUoeFNjYWxlKVxuXHRcdC5vcmllbnQob3JpZW50YXRpb24pO1xuXHR9XG5cblx0dmFyIHRyYWNrID0gdGhpcztcblx0dmFyIHN2Z19nID0gdHJhY2suZztcblx0c3ZnX2cuY2FsbCh4QXhpcyk7XG4gICAgfTtcblxuICAgIGZlYXR1cmUub3JpZW50YXRpb24gPSBmdW5jdGlvbiAocG9zKSB7XG5cdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHQgICAgcmV0dXJuIG9yaWVudGF0aW9uO1xuXHR9XG5cdG9yaWVudGF0aW9uID0gcG9zO1xuXHRyZXR1cm4gZmVhdHVyZTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIGZlYXR1cmU7XG59O1xuXG50bnRfZmVhdHVyZS5sb2NhdGlvbiA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcm93O1xuXG4gICAgdmFyIGZlYXR1cmUgPSB7fTtcbiAgICBmZWF0dXJlLnJlc2V0ID0gZnVuY3Rpb24gKCkge307XG4gICAgZmVhdHVyZS5wbG90ID0gZnVuY3Rpb24gKCkge307XG4gICAgZmVhdHVyZS5pbml0ID0gZnVuY3Rpb24gKCkge307XG4gICAgZmVhdHVyZS5tb3ZlID0gZnVuY3Rpb24oeFNjYWxlKSB7XG5cdHZhciBkb21haW4gPSB4U2NhbGUuZG9tYWluKCk7XG5cdHJvdy5zZWxlY3QoXCJ0ZXh0XCIpXG5cdCAgICAudGV4dChcIkxvY2F0aW9uOiBcIiArIH5+ZG9tYWluWzBdICsgXCItXCIgKyB+fmRvbWFpblsxXSk7XG4gICAgfTtcblxuICAgIGZlYXR1cmUudXBkYXRlID0gZnVuY3Rpb24gKHhTY2FsZSkge1xuXHR2YXIgdHJhY2sgPSB0aGlzO1xuXHR2YXIgc3ZnX2cgPSB0cmFjay5nO1xuXHR2YXIgZG9tYWluID0geFNjYWxlLmRvbWFpbigpO1xuXHRpZiAocm93ID09PSB1bmRlZmluZWQpIHtcblx0ICAgIHJvdyA9IHN2Z19nO1xuXHQgICAgcm93XG5cdFx0LmFwcGVuZChcInRleHRcIilcblx0XHQudGV4dChcIkxvY2F0aW9uOiBcIiArIH5+ZG9tYWluWzBdICsgXCItXCIgKyB+fmRvbWFpblsxXSk7XG5cdH1cbiAgICB9O1xuXG4gICAgcmV0dXJuIGZlYXR1cmU7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSB0bnRfZmVhdHVyZTtcbiIsInZhciBib2FyZCA9IHJlcXVpcmUgKFwiLi9ib2FyZC5qc1wiKTtcbmJvYXJkLnRyYWNrID0gcmVxdWlyZSAoXCIuL3RyYWNrXCIpO1xuYm9hcmQudHJhY2suZGF0YSA9IHJlcXVpcmUgKFwiLi9kYXRhLmpzXCIpO1xuYm9hcmQudHJhY2subGF5b3V0ID0gcmVxdWlyZSAoXCIuL2xheW91dC5qc1wiKTtcbmJvYXJkLnRyYWNrLmZlYXR1cmUgPSByZXF1aXJlIChcIi4vZmVhdHVyZS5qc1wiKTtcblxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gYm9hcmQ7XG4iLCJ2YXIgYXBpanMgPSByZXF1aXJlIChcInRudC5hcGlcIik7XG5cbi8vIHZhciBib2FyZCA9IHt9O1xuLy8gYm9hcmQudHJhY2sgPSB7fTtcbmxheW91dCA9IHt9O1xuXG5sYXlvdXQuaWRlbnRpdHkgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gdmFycyBleHBvc2VkIGluIHRoZSBBUEk6XG4gICAgdmFyIGVsZW1lbnRzO1xuXG4gICAgLy8gVGhlIHJldHVybmVkIGNsb3N1cmUgLyBvYmplY3RcbiAgICB2YXIgbCA9IGZ1bmN0aW9uIChuZXdfZWxlbWVudHMpIHtcblx0ZWxlbWVudHMgPSBuZXdfZWxlbWVudHM7XG4gICAgfVxuXG4gICAgdmFyIGFwaSA9IGFwaWpzIChsKVxuXHQubWV0aG9kICh7XG5cdCAgICBoZWlnaHQgICA6IGZ1bmN0aW9uICgpIHt9LFxuXHQgICAgZWxlbWVudHMgOiBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIGVsZW1lbnRzO1xuXHQgICAgfVxuXHR9KTtcblxuICAgIHJldHVybiBsO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gbGF5b3V0O1xuIiwidmFyIGFwaWpzID0gcmVxdWlyZSAoXCJ0bnQuYXBpXCIpO1xudmFyIGl0ZXJhdG9yID0gcmVxdWlyZShcInRudC51dGlsc1wiKS5pdGVyYXRvcjtcblxuLy92YXIgYm9hcmQgPSB7fTtcblxudmFyIHRyYWNrID0gZnVuY3Rpb24gKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG4gICAgdmFyIHJlYWRfY29uZiA9IHtcblx0Ly8gVW5pcXVlIElEIGZvciB0aGlzIHRyYWNrXG5cdGlkIDogdHJhY2suaWQoKVxuICAgIH07XG5cbiAgICB2YXIgZGlzcGxheTtcblxuICAgIHZhciBjb25mID0ge1xuXHQvLyBmb3JlZ3JvdW5kX2NvbG9yIDogZDMucmdiKCcjMDAwMDAwJyksXG5cdGJhY2tncm91bmRfY29sb3IgOiBkMy5yZ2IoJyNDQ0NDQ0MnKSxcblx0aGVpZ2h0ICAgICAgICAgICA6IDI1MCxcblx0Ly8gZGF0YSBpcyB0aGUgb2JqZWN0IChub3JtYWxseSBhIHRudC50cmFjay5kYXRhIG9iamVjdCkgdXNlZCB0byByZXRyaWV2ZSBhbmQgdXBkYXRlIGRhdGEgZm9yIHRoZSB0cmFja1xuXHRkYXRhICAgICAgICAgICAgIDogdHJhY2suZGF0YS5lbXB0eSgpXG4gICAgfTtcblxuICAgIC8vIFRoZSByZXR1cm5lZCBvYmplY3QgLyBjbG9zdXJlXG4gICAgdmFyIF8gPSBmdW5jdGlvbigpIHtcbiAgICB9O1xuXG4gICAgLy8gQVBJXG4gICAgdmFyIGFwaSA9IGFwaWpzIChfKVxuXHQuZ2V0c2V0IChjb25mKVxuXHQuZ2V0IChyZWFkX2NvbmYpO1xuXG4gICAgLy8gVE9ETzogVGhpcyBtZWFucyB0aGF0IGhlaWdodCBzaG91bGQgYmUgZGVmaW5lZCBiZWZvcmUgZGlzcGxheVxuICAgIC8vIHdlIHNob3VsZG4ndCByZWx5IG9uIHRoaXNcbiAgICBfLmRpc3BsYXkgPSBmdW5jdGlvbiAobmV3X3Bsb3R0ZXIpIHtcblx0aWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG5cdCAgICByZXR1cm4gZGlzcGxheTtcblx0fVxuXHRkaXNwbGF5ID0gbmV3X3Bsb3R0ZXI7XG5cdGlmICh0eXBlb2YgKGRpc3BsYXkpID09PSAnZnVuY3Rpb24nKSB7XG5cdCAgICBkaXNwbGF5LmxheW91dCAmJiBkaXNwbGF5LmxheW91dCgpLmhlaWdodChjb25mLmhlaWdodCk7XHQgICAgXG5cdH0gZWxzZSB7XG5cdCAgICBmb3IgKHZhciBrZXkgaW4gZGlzcGxheSkge1xuXHRcdGlmIChkaXNwbGF5Lmhhc093blByb3BlcnR5KGtleSkpIHtcblx0XHQgICAgZGlzcGxheVtrZXldLmxheW91dCAmJiBkaXNwbGF5W2tleV0ubGF5b3V0KCkuaGVpZ2h0KGNvbmYuaGVpZ2h0KTtcblx0XHR9XG5cdCAgICB9XG5cdH1cblxuXHRyZXR1cm4gXztcbiAgICB9O1xuXG4gICAgcmV0dXJuIF87XG5cbn07XG5cbnRyYWNrLmlkID0gaXRlcmF0b3IoMSk7XG5cbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IHRyYWNrO1xuIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiLi9zcmMvaW5kZXguanNcIik7XG4iLCIvLyByZXF1aXJlKCdmcycpLnJlYWRkaXJTeW5jKF9fZGlybmFtZSArICcvJykuZm9yRWFjaChmdW5jdGlvbihmaWxlKSB7XG4vLyAgICAgaWYgKGZpbGUubWF0Y2goLy4rXFwuanMvZykgIT09IG51bGwgJiYgZmlsZSAhPT0gX19maWxlbmFtZSkge1xuLy8gXHR2YXIgbmFtZSA9IGZpbGUucmVwbGFjZSgnLmpzJywgJycpO1xuLy8gXHRtb2R1bGUuZXhwb3J0c1tuYW1lXSA9IHJlcXVpcmUoJy4vJyArIGZpbGUpO1xuLy8gICAgIH1cbi8vIH0pO1xuXG4vLyBTYW1lIGFzXG52YXIgdXRpbHMgPSByZXF1aXJlKFwiLi91dGlscy5qc1wiKTtcbnV0aWxzLnJlZHVjZSA9IHJlcXVpcmUoXCIuL3JlZHVjZS5qc1wiKTtcbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IHV0aWxzO1xuIiwidmFyIHJlZHVjZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc21vb3RoID0gNTtcbiAgICB2YXIgdmFsdWUgPSAndmFsJztcbiAgICB2YXIgcmVkdW5kYW50ID0gZnVuY3Rpb24gKGEsIGIpIHtcblx0aWYgKGEgPCBiKSB7XG5cdCAgICByZXR1cm4gKChiLWEpIDw9IChiICogMC4yKSk7XG5cdH1cblx0cmV0dXJuICgoYS1iKSA8PSAoYSAqIDAuMikpO1xuICAgIH07XG4gICAgdmFyIHBlcmZvcm1fcmVkdWNlID0gZnVuY3Rpb24gKGFycikge3JldHVybiBhcnI7fTtcblxuICAgIHZhciByZWR1Y2UgPSBmdW5jdGlvbiAoYXJyKSB7XG5cdGlmICghYXJyLmxlbmd0aCkge1xuXHQgICAgcmV0dXJuIGFycjtcblx0fVxuXHR2YXIgc21vb3RoZWQgPSBwZXJmb3JtX3Ntb290aChhcnIpO1xuXHR2YXIgcmVkdWNlZCAgPSBwZXJmb3JtX3JlZHVjZShzbW9vdGhlZCk7XG5cdHJldHVybiByZWR1Y2VkO1xuICAgIH07XG5cbiAgICB2YXIgbWVkaWFuID0gZnVuY3Rpb24gKHYsIGFycikge1xuXHRhcnIuc29ydChmdW5jdGlvbiAoYSwgYikge1xuXHQgICAgcmV0dXJuIGFbdmFsdWVdIC0gYlt2YWx1ZV07XG5cdH0pO1xuXHRpZiAoYXJyLmxlbmd0aCAlIDIpIHtcblx0ICAgIHZbdmFsdWVdID0gYXJyW35+KGFyci5sZW5ndGggLyAyKV1bdmFsdWVdO1x0ICAgIFxuXHR9IGVsc2Uge1xuXHQgICAgdmFyIG4gPSB+fihhcnIubGVuZ3RoIC8gMikgLSAxO1xuXHQgICAgdlt2YWx1ZV0gPSAoYXJyW25dW3ZhbHVlXSArIGFycltuKzFdW3ZhbHVlXSkgLyAyO1xuXHR9XG5cblx0cmV0dXJuIHY7XG4gICAgfTtcblxuICAgIHZhciBjbG9uZSA9IGZ1bmN0aW9uIChzb3VyY2UpIHtcblx0dmFyIHRhcmdldCA9IHt9O1xuXHRmb3IgKHZhciBwcm9wIGluIHNvdXJjZSkge1xuXHQgICAgaWYgKHNvdXJjZS5oYXNPd25Qcm9wZXJ0eShwcm9wKSkge1xuXHRcdHRhcmdldFtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcblx0ICAgIH1cblx0fVxuXHRyZXR1cm4gdGFyZ2V0O1xuICAgIH07XG5cbiAgICB2YXIgcGVyZm9ybV9zbW9vdGggPSBmdW5jdGlvbiAoYXJyKSB7XG5cdGlmIChzbW9vdGggPT09IDApIHsgLy8gbm8gc21vb3RoXG5cdCAgICByZXR1cm4gYXJyO1xuXHR9XG5cdHZhciBzbW9vdGhfYXJyID0gW107XG5cdGZvciAodmFyIGk9MDsgaTxhcnIubGVuZ3RoOyBpKyspIHtcblx0ICAgIHZhciBsb3cgPSAoaSA8IHNtb290aCkgPyAwIDogKGkgLSBzbW9vdGgpO1xuXHQgICAgdmFyIGhpZ2ggPSAoaSA+IChhcnIubGVuZ3RoIC0gc21vb3RoKSkgPyBhcnIubGVuZ3RoIDogKGkgKyBzbW9vdGgpO1xuXHQgICAgc21vb3RoX2FycltpXSA9IG1lZGlhbihjbG9uZShhcnJbaV0pLCBhcnIuc2xpY2UobG93LGhpZ2grMSkpO1xuXHR9XG5cdHJldHVybiBzbW9vdGhfYXJyO1xuICAgIH07XG5cbiAgICByZWR1Y2UucmVkdWNlciA9IGZ1bmN0aW9uIChjYmFrKSB7XG5cdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHQgICAgcmV0dXJuIHBlcmZvcm1fcmVkdWNlO1xuXHR9XG5cdHBlcmZvcm1fcmVkdWNlID0gY2Jhaztcblx0cmV0dXJuIHJlZHVjZTtcbiAgICB9O1xuXG4gICAgcmVkdWNlLnJlZHVuZGFudCA9IGZ1bmN0aW9uIChjYmFrKSB7XG5cdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHQgICAgcmV0dXJuIHJlZHVuZGFudDtcblx0fVxuXHRyZWR1bmRhbnQgPSBjYmFrO1xuXHRyZXR1cm4gcmVkdWNlO1xuICAgIH07XG5cbiAgICByZWR1Y2UudmFsdWUgPSBmdW5jdGlvbiAodmFsKSB7XG5cdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHQgICAgcmV0dXJuIHZhbHVlO1xuXHR9XG5cdHZhbHVlID0gdmFsO1xuXHRyZXR1cm4gcmVkdWNlO1xuICAgIH07XG5cbiAgICByZWR1Y2Uuc21vb3RoID0gZnVuY3Rpb24gKHZhbCkge1xuXHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0ICAgIHJldHVybiBzbW9vdGg7XG5cdH1cblx0c21vb3RoID0gdmFsO1xuXHRyZXR1cm4gcmVkdWNlO1xuICAgIH07XG5cbiAgICByZXR1cm4gcmVkdWNlO1xufTtcblxudmFyIGJsb2NrID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciByZWQgPSByZWR1Y2UoKVxuXHQudmFsdWUoJ3N0YXJ0Jyk7XG5cbiAgICB2YXIgdmFsdWUyID0gJ2VuZCc7XG5cbiAgICB2YXIgam9pbiA9IGZ1bmN0aW9uIChvYmoxLCBvYmoyKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAnb2JqZWN0JyA6IHtcbiAgICAgICAgICAgICAgICAnc3RhcnQnIDogb2JqMS5vYmplY3RbcmVkLnZhbHVlKCldLFxuICAgICAgICAgICAgICAgICdlbmQnICAgOiBvYmoyW3ZhbHVlMl1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAndmFsdWUnICA6IG9iajJbdmFsdWUyXVxuICAgICAgICB9O1xuICAgIH07XG5cbiAgICAvLyB2YXIgam9pbiA9IGZ1bmN0aW9uIChvYmoxLCBvYmoyKSB7IHJldHVybiBvYmoxIH07XG5cbiAgICByZWQucmVkdWNlciggZnVuY3Rpb24gKGFycikge1xuXHR2YXIgdmFsdWUgPSByZWQudmFsdWUoKTtcblx0dmFyIHJlZHVuZGFudCA9IHJlZC5yZWR1bmRhbnQoKTtcblx0dmFyIHJlZHVjZWRfYXJyID0gW107XG5cdHZhciBjdXJyID0ge1xuXHQgICAgJ29iamVjdCcgOiBhcnJbMF0sXG5cdCAgICAndmFsdWUnICA6IGFyclswXVt2YWx1ZTJdXG5cdH07XG5cdGZvciAodmFyIGk9MTsgaTxhcnIubGVuZ3RoOyBpKyspIHtcblx0ICAgIGlmIChyZWR1bmRhbnQgKGFycltpXVt2YWx1ZV0sIGN1cnIudmFsdWUpKSB7XG5cdFx0Y3VyciA9IGpvaW4oY3VyciwgYXJyW2ldKTtcblx0XHRjb250aW51ZTtcblx0ICAgIH1cblx0ICAgIHJlZHVjZWRfYXJyLnB1c2ggKGN1cnIub2JqZWN0KTtcblx0ICAgIGN1cnIub2JqZWN0ID0gYXJyW2ldO1xuXHQgICAgY3Vyci52YWx1ZSA9IGFycltpXS5lbmQ7XG5cdH1cblx0cmVkdWNlZF9hcnIucHVzaChjdXJyLm9iamVjdCk7XG5cblx0Ly8gcmVkdWNlZF9hcnIucHVzaChhcnJbYXJyLmxlbmd0aC0xXSk7XG5cdHJldHVybiByZWR1Y2VkX2FycjtcbiAgICB9KTtcblxuICAgIHJlZHVjZS5qb2luID0gZnVuY3Rpb24gKGNiYWspIHtcblx0aWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG5cdCAgICByZXR1cm4gam9pbjtcblx0fVxuXHRqb2luID0gY2Jhaztcblx0cmV0dXJuIHJlZDtcbiAgICB9O1xuXG4gICAgcmVkdWNlLnZhbHVlMiA9IGZ1bmN0aW9uIChmaWVsZCkge1xuXHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0ICAgIHJldHVybiB2YWx1ZTI7XG5cdH1cblx0dmFsdWUyID0gZmllbGQ7XG5cdHJldHVybiByZWQ7XG4gICAgfTtcblxuICAgIHJldHVybiByZWQ7XG59O1xuXG52YXIgbGluZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcmVkID0gcmVkdWNlKCk7XG5cbiAgICByZWQucmVkdWNlciAoIGZ1bmN0aW9uIChhcnIpIHtcblx0dmFyIHJlZHVuZGFudCA9IHJlZC5yZWR1bmRhbnQoKTtcblx0dmFyIHZhbHVlID0gcmVkLnZhbHVlKCk7XG5cdHZhciByZWR1Y2VkX2FyciA9IFtdO1xuXHR2YXIgY3VyciA9IGFyclswXTtcblx0Zm9yICh2YXIgaT0xOyBpPGFyci5sZW5ndGgtMTsgaSsrKSB7XG5cdCAgICBpZiAocmVkdW5kYW50IChhcnJbaV1bdmFsdWVdLCBjdXJyW3ZhbHVlXSkpIHtcblx0XHRjb250aW51ZTtcblx0ICAgIH1cblx0ICAgIHJlZHVjZWRfYXJyLnB1c2ggKGN1cnIpO1xuXHQgICAgY3VyciA9IGFycltpXTtcblx0fVxuXHRyZWR1Y2VkX2Fyci5wdXNoKGN1cnIpO1xuXHRyZWR1Y2VkX2Fyci5wdXNoKGFyclthcnIubGVuZ3RoLTFdKTtcblx0cmV0dXJuIHJlZHVjZWRfYXJyO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJlZDtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSByZWR1Y2U7XG5tb2R1bGUuZXhwb3J0cy5saW5lID0gbGluZTtcbm1vZHVsZS5leHBvcnRzLmJsb2NrID0gYmxvY2s7XG5cbiIsIlxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgaXRlcmF0b3IgOiBmdW5jdGlvbihpbml0X3ZhbCkge1xuXHR2YXIgaSA9IGluaXRfdmFsIHx8IDA7XG5cdHZhciBpdGVyID0gZnVuY3Rpb24gKCkge1xuXHQgICAgcmV0dXJuIGkrKztcblx0fTtcblx0cmV0dXJuIGl0ZXI7XG4gICAgfSxcblxuICAgIHNjcmlwdF9wYXRoIDogZnVuY3Rpb24gKHNjcmlwdF9uYW1lKSB7IC8vIHNjcmlwdF9uYW1lIGlzIHRoZSBmaWxlbmFtZVxuXHR2YXIgc2NyaXB0X3NjYXBlZCA9IHNjcmlwdF9uYW1lLnJlcGxhY2UoL1stXFwvXFxcXF4kKis/LigpfFtcXF17fV0vZywgJ1xcXFwkJicpO1xuXHR2YXIgc2NyaXB0X3JlID0gbmV3IFJlZ0V4cChzY3JpcHRfc2NhcGVkICsgJyQnKTtcblx0dmFyIHNjcmlwdF9yZV9zdWIgPSBuZXcgUmVnRXhwKCcoLiopJyArIHNjcmlwdF9zY2FwZWQgKyAnJCcpO1xuXG5cdC8vIFRPRE86IFRoaXMgcmVxdWlyZXMgcGhhbnRvbS5qcyBvciBhIHNpbWlsYXIgaGVhZGxlc3Mgd2Via2l0IHRvIHdvcmsgKGRvY3VtZW50KVxuXHR2YXIgc2NyaXB0cyA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdzY3JpcHQnKTtcblx0dmFyIHBhdGggPSBcIlwiOyAgLy8gRGVmYXVsdCB0byBjdXJyZW50IHBhdGhcblx0aWYoc2NyaXB0cyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBmb3IodmFyIGkgaW4gc2NyaXB0cykge1xuXHRcdGlmKHNjcmlwdHNbaV0uc3JjICYmIHNjcmlwdHNbaV0uc3JjLm1hdGNoKHNjcmlwdF9yZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNjcmlwdHNbaV0uc3JjLnJlcGxhY2Uoc2NyaXB0X3JlX3N1YiwgJyQxJyk7XG5cdFx0fVxuICAgICAgICAgICAgfVxuXHR9XG5cdHJldHVybiBwYXRoO1xuICAgIH0sXG5cbiAgICBkZWZlcl9jYW5jZWwgOiBmdW5jdGlvbiAoY2JhaywgdGltZSkge1xuXHR2YXIgdGljaztcblxuXHR2YXIgZGVmZXJfY2FuY2VsID0gZnVuY3Rpb24gKCkge1xuXHQgICAgY2xlYXJUaW1lb3V0KHRpY2spO1xuXHQgICAgdGljayA9IHNldFRpbWVvdXQoY2JhaywgdGltZSk7XG5cdH07XG5cblx0cmV0dXJuIGRlZmVyX2NhbmNlbDtcbiAgICB9XG59O1xuIiwidmFyIGFwaWpzID0gcmVxdWlyZSAoXCJ0bnQuYXBpXCIpO1xudmFyIGJvYXJkID0gcmVxdWlyZSAoXCJ0bnQuYm9hcmRcIik7XG52YXIgaXRlcmF0b3IgPSByZXF1aXJlKFwidG50LnV0aWxzXCIpLml0ZXJhdG9yO1xuXG52YXIgdG50X2xlZ2VuZCA9IGZ1bmN0aW9uIChkaXYpIHtcblxuICAgIGQzLnNlbGVjdChkaXYpXG5cdC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfZnJhbWVkXCIpO1xuXG4gICAgdmFyIG9wdHMgPSB7XG5cdHJvd19oZWlnaHQgOiAyMCxcblx0d2lkdGggICAgICA6IDE0MCxcblx0Zm9udHNpemUgICA6IDEyXG4gICAgfTtcblxuICAgIHZhciBpZCA9IGl0ZXJhdG9yKDEpO1xuICAgIHZhciBsZWdlbmRfY29scyA9IFtdO1xuXG4gICAgdmFyIF8gPSBmdW5jdGlvbiAoKSB7XG5cdGZvciAodmFyIGk9MDsgaTxsZWdlbmRfY29scy5sZW5ndGg7IGkrKykge1xuXHQgICAgdmFyIGNvbCA9IGxlZ2VuZF9jb2xzW2ldO1xuXHQgICAgY29sLmJvYXJkKGNvbC5kaXYpO1xuXHQgICAgY29sLmJvYXJkLnN0YXJ0KCk7XG5cdH1cbiAgICB9O1xuXG4gICAgdmFyIGFwaSA9IGFwaWpzIChfKVxuXHQuZ2V0c2V0KG9wdHMpO1xuXG4gICAgYXBpLm1ldGhvZCAoJ2FkZF9jb2x1bW4nLCBmdW5jdGlvbiAoKSB7XG5cdHZhciBkaXZfaWQgPSBkMy5zZWxlY3QoZGl2KVxuXHQgICAgLnN0eWxlKFwiZGlzcGxheVwiLCBcInRhYmxlXCIpXG5cdCAgICAuYXR0cihcImlkXCIpO1xuXG5cdHZhciBuZXdfZGl2ID0gZDMuc2VsZWN0KGRpdilcblx0ICAgIC5hcHBlbmQoXCJkaXZcIilcblx0ICAgIC5hdHRyKFwiaWRcIiwgZGl2X2lkICsgXCJfXCIgKyBpZCgpKVxuXHQgICAgLnN0eWxlKFwiZGlzcGxheVwiLCBcInRhYmxlLWNlbGxcIik7XG5cblx0dmFyIG5ld19ib2FyZCA9IGJvYXJkKClcblx0ICAgIC5yaWdodCgyKVxuXHQgICAgLmZyb20gKDEpXG5cdCAgICAudG8gKDIpXG5cdCAgICAuYWxsb3dfZHJhZyAoZmFsc2UpXG5cdCAgICAuc2hvd19mcmFtZSAoZmFsc2UpXG5cdCAgICAud2lkdGggKG9wdHMud2lkdGgpO1xuXG5cdG5ld19ib2FyZC5hZGRfcm93ID0gbmV3X2JvYXJkLmFkZF90cmFjaztcblxuXHRsZWdlbmRfY29scy5wdXNoICh7XG5cdCAgICAnZGl2JyA6IG5ld19kaXYubm9kZSgpLFxuXHQgICAgJ2JvYXJkJyA6IG5ld19ib2FyZFxuXHR9KTtcblxuXHRyZXR1cm4gbmV3X2JvYXJkO1xuICAgIH0pO1xuXG4gICAgYXBpLm1ldGhvZCAoJ2hlYWRlcicsIGZ1bmN0aW9uICh0ZXh0KSB7XG5cdHZhciBmZWF0dXJlID0gYm9hcmQudHJhY2suZmVhdHVyZSgpO1xuXG5cdGZlYXR1cmUuY3JlYXRlIChmdW5jdGlvbiAoZywgeFNjYWxlKSB7XG5cdCAgICB2YXIgdHJhY2sgPSB0aGlzO1xuXHQgICAgZ1xuXHRcdC5hcHBlbmQoXCJ0ZXh0XCIpXG5cdFx0LmF0dHIoXCJmaWxsXCIsIFwiYmxhY2tcIilcblx0XHQuYXR0cihcImZvbnQtc2l6ZVwiLCB0cmFjay5mb250c2l6ZSgpKVxuXHRcdC5hdHRyKFwieFwiLCB4U2NhbGUoMSkpXG5cdFx0LmF0dHIoXCJ5XCIsIH5+dHJhY2suaGVpZ2h0KCkvMilcblx0XHQuYXR0cihcImZvbnQtd2VpZ2h0XCIsIFwiYm9sZFwiKVxuXHRcdC50ZXh0KHRyYWNrLnRleHQoKSk7XG5cdH0pO1xuXG5cdHZhciB0cmFjayA9IGxlZ2VuZF90cmFjaygpXG5cdCAgICAuZGlzcGxheSAoZmVhdHVyZSk7XG5cblx0cmV0dXJuIHRyYWNrO1xuICAgIH0pO1xuXG4gICAgYXBpLm1ldGhvZCAoJ3RleHQnLCBmdW5jdGlvbiAoKSB7XG5cdHZhciB0cmFjayA9IGxlZ2VuZF90cmFjaygpXG5cdCAgICAuZGVwbG95IChmdW5jdGlvbiAoKSB7XG5cdFx0dmFyIGcgPSB0aGlzO1xuXHRcdGQzLnNlbGVjdChnKVxuXHRcdCAgICAuYXBwZW5kKFwidGV4dFwiKVxuXHRcdCAgICAuYXR0cihcInhcIiwgMClcblx0XHQgICAgLmF0dHIoXCJ5XCIsIH5+KHRyYWNrLmhlaWdodCgpIC8gMikgKyA0KVxuXHRcdCAgICAuYXR0cihcImZpbGxcIiwgdHJhY2suY29sb3IoKSlcblx0XHQgICAgLmF0dHIoXCJmb250LXNpemVcIiwgdHJhY2suZm9udHNpemUoKSlcblx0XHQgICAgLnRleHQodHJhY2suZmVhdHVyZV90ZXh0KCkpO1xuXHQgICAgfSk7XG5cblx0YXBpanMgKHRyYWNrKVxuXHQgICAgLmdldHNldCAoJ2ZlYXR1cmVfdGV4dCcsICcnKTtcblx0XG5cdHJldHVybiB0cmFjaztcbiAgICB9KTtcblxuICAgIGFwaS5tZXRob2QgKCdobGluZScsIGZ1bmN0aW9uICgpIHtcblx0dmFyIHRyYWNrID0gbGVnZW5kX3RyYWNrKClcblx0ICAgIC5kZXBsb3kgKGZ1bmN0aW9uICgpIHtcblx0XHR2YXIgZyA9IHRoaXM7XG5cdFx0ZDMuc2VsZWN0KGcpXG5cdFx0ICAgIC5hcHBlbmQoXCJsaW5lXCIpXG5cdFx0ICAgIC5hdHRyKFwieDFcIiwgMClcblx0XHQgICAgLmF0dHIoXCJ4MlwiLCB0cmFjay5mZWF0dXJlX3dpZHRoKCkpXG5cdFx0ICAgIC5hdHRyKFwieTFcIiwgfn4odHJhY2suaGVpZ2h0KCkvMikpXG5cdFx0ICAgIC5hdHRyKFwieTJcIiwgfn4odHJhY2suaGVpZ2h0KCkvMikpXG5cdFx0ICAgIC5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsIDIpXG5cdFx0ICAgIC5hdHRyKFwic3Ryb2tlXCIsIHRyYWNrLmNvbG9yKCkpO1xuXHQgICAgfSk7XG5cblx0cmV0dXJuIHRyYWNrO1xuXG4gICAgfSk7XG5cbiAgICBhcGkubWV0aG9kICgndmxpbmUnLCBmdW5jdGlvbiAoKSB7XG5cdHZhciB0cmFjayA9IGxlZ2VuZF90cmFjaygpXG5cdCAgICAuZGVwbG95IChmdW5jdGlvbiAoKSB7XG5cdFx0dmFyIGcgPSB0aGlzO1xuXHRcdGQzLnNlbGVjdChnKVxuXHRcdCAgICAuYXBwZW5kKFwibGluZVwiKVxuXHRcdCAgICAuYXR0cihcInN0cm9rZVwiLCB0cmFjay5jb2xvcigpKVxuXHRcdCAgICAuYXR0cihcInN0cm9rZS13aWR0aFwiLCAyKVxuXHRcdCAgICAuYXR0cihcIngxXCIsIDUpXG5cdFx0ICAgIC5hdHRyKFwieDJcIiwgNSlcblx0XHQgICAgLmF0dHIoXCJ5MVwiLCAwKVxuXHRcdCAgICAuYXR0cihcInkyXCIsIHRyYWNrLmhlaWdodCgpKTtcblx0ICAgIH0pO1xuXG5cdHJldHVybiB0cmFjaztcbiAgICB9KTtcblxuICAgIGFwaS5tZXRob2QgKCdzcXVhcmUnLCBmdW5jdGlvbiAoKSB7XG5cdHZhciB0cmFjayA9IGxlZ2VuZF90cmFjaygpXG5cdCAgICAuZGVwbG95IChmdW5jdGlvbiAoKSB7XG5cdFx0dmFyIHdfaCA9IH5+KHRyYWNrLmhlaWdodCgpKjAuOCk7XG5cdFx0dmFyIGcgPSB0aGlzO1xuXHRcdGQzLnNlbGVjdChnKVxuXHRcdCAgICAuYXBwZW5kKFwicmVjdFwiKVxuXHRcdCAgICAuYXR0cihcInhcIiwgMClcblx0XHQgICAgLmF0dHIoXCJ5XCIsIHRyYWNrLmhlaWdodCgpIC0gd19oKVxuXHRcdCAgICAuYXR0cihcIndpZHRoXCIsIHdfaClcblx0XHQgICAgLmF0dHIoXCJoZWlnaHRcIiwgd19oKVxuXHRcdCAgICAuYXR0cihcImZpbGxcIiwgdHJhY2suY29sb3IoKSk7XG5cdCAgICB9KTtcblxuXHRyZXR1cm4gdHJhY2s7XG4gICAgfSk7XG5cbiAgICBhcGkubWV0aG9kICgnY2lyY2xlJywgZnVuY3Rpb24gKCkge1xuXHR2YXIgZmVhdHVyZSA9IGJvYXJkLnRyYWNrLmZlYXR1cmUoKVxuXHRmZWF0dXJlLmNyZWF0ZSAoZnVuY3Rpb24gKGcsIHhTY2FsZSkge1xuXHQgICAgdmFyIHRyYWNrID0gdGhpcztcblx0ICAgIHZhciByYWQgPSB+fih0cmFjay5oZWlnaHQoKS8yKTtcblx0ICAgIGdcblx0XHQuYXBwZW5kKFwiY2lyY2xlXCIpXG5cdFx0LmF0dHIoXCJjeFwiLCByYWQpXG5cdFx0LmF0dHIoXCJjeVwiLCB+fihyYWQvMikpXG5cdFx0LmF0dHIoXCJyXCIsIHJhZC0yKVxuXHRcdC5hdHRyKFwiZmlsbFwiLCB0cmFjay5jb2xvcigpKTtcblx0ICAgIGdcblx0XHQuYXBwZW5kKFwidGV4dFwiKVxuXHRcdC5hdHRyKFwiZmlsbFwiLCBcImJsYWNrXCIpXG5cdFx0LmF0dHIoXCJmb250LXNpemVcIiwgdHJhY2suZm9udHNpemUoKSlcblx0XHQuYXR0cihcInhcIiwgNDApXG5cdFx0LmF0dHIoXCJ5XCIsIH5+KHRyYWNrLmhlaWdodCgpLzIgKyA0KSlcblx0XHQudGV4dCh0cmFjay50ZXh0KCkpO1xuXHR9KTtcblxuXHR2YXIgdHJhY2sgPSBsZWdlbmRfdHJhY2soKVxuXHQgICAgLmRpc3BsYXkgKGZlYXR1cmUpO1xuXG5cdHJldHVybiB0cmFjaztcbiAgICB9KTtcblxuICAgIGFwaS5tZXRob2QgKCdncmFkaWVudCcsIGZ1bmN0aW9uICgpIHtcblx0dmFyIGZlYXR1cmUgPSBib2FyZC50cmFjay5mZWF0dXJlKClcblx0ZmVhdHVyZS5jcmVhdGUgKGZ1bmN0aW9uIChnLCB4U2NhbGUpIHtcblx0ICAgIHZhciBncmFkX3dpZHRoID0gMTAwO1xuXHQgICAgdmFyIHRyYWNrID0gdGhpcztcblx0ICAgIHZhciBncmFkaWVudCA9IGdcblx0XHQuYXBwZW5kKFwibGluZWFyR3JhZGllbnRcIilcblx0XHQuYXR0cihcIngxXCIsIFwiMCVcIilcblx0XHQuYXR0cihcIngyXCIsIFwiMTAwJVwiKVxuXHRcdC5hdHRyKFwieTFcIiwgXCIwJVwiKVxuXHRcdC5hdHRyKFwieTJcIiwgXCIwJVwiKVxuXHRcdC5hdHRyKFwiaWRcIiwgZDMuc2VsZWN0KGRpdikuYXR0cihcImlkXCIpICsgXCJfZ3JhZGllbnRcIik7XG5cblx0ICAgIGdyYWRpZW50XG5cdFx0LmFwcGVuZChcInN0b3BcIilcblx0XHQuYXR0cihcIm9mZnNldFwiLCBcIjAlXCIpXG5cdFx0LmF0dHIoXCJzdG9wLWNvbG9yXCIsIHRyYWNrLmNvbG9yMSgpKVxuXHRcdC5hdHRyKFwic3RvcC1vcGFjaXR5XCIsIDEpO1xuXG5cdCAgICBncmFkaWVudFxuXHRcdC5hcHBlbmQoXCJzdG9wXCIpXG5cdFx0LmF0dHIoXCJvZmZzZXRcIiwgXCIxMDAlXCIpXG5cdFx0LmF0dHIoXCJzdG9wLWNvbG9yXCIsIHRyYWNrLmNvbG9yMigpKVxuXHRcdC5hdHRyKFwic3RvcC1vcGFjaXR5XCIsIDEpO1xuXG5cdCAgICB2YXIgc2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKVxuXHRcdC5kb21haW4oW3RyYWNrLmZyb20oKSwgdHJhY2sudG8oKV0pXG5cdFx0LnJhbmdlKFswLGdyYWRfd2lkdGhdKTtcblx0ICAgIHZhciBheGlzID0gZDMuc3ZnLmF4aXMoKS5zY2FsZShzY2FsZSkudGlja1NpemUoMCkudGlja3MoMyk7XG5cdCAgICB2YXIgZ3JhZF9nID0gZ1xuXHRcdC5hcHBlbmQoXCJnXCIpXG5cdFx0LmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoNSwwKVwiKTtcblxuXHQgICAgdmFyIGF4aXNfZyA9IGdcblx0XHQuYXBwZW5kKFwiZ1wiKVxuXHRcdC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKDUsXCIgKyAodHJhY2suaGVpZ2h0KCktMTApICsgXCIpXCIpXG5cdFx0LmNhbGwoYXhpcyk7XG5cblx0ICAgIGdyYWRfZ1xuXHRcdC5hcHBlbmQoXCJyZWN0XCIpXG5cdFx0LmF0dHIoXCJ4XCIsIDApXG5cdFx0LmF0dHIoXCJ5XCIsIDApXG5cdFx0LmF0dHIoXCJ3aWR0aFwiLCBncmFkX3dpZHRoKVxuXHRcdC5hdHRyKFwiaGVpZ2h0XCIsIH5+KHRyYWNrLmhlaWdodCgpLTEwKSlcblx0XHQuYXR0cihcImZpbGxcIiwgXCJ1cmwoI1wiICsgZDMuc2VsZWN0KGRpdikuYXR0cihcImlkXCIpICsgXCJfZ3JhZGllbnQpXCIpO1xuXG5cdCAgICBncmFkX2dcblx0XHQuYXBwZW5kKFwidGV4dFwiKVxuXHRcdC5hdHRyKFwiZmlsbFwiLCBcImJsYWNrXCIpXG5cdFx0LmF0dHIoXCJmb250LXNpemVcIiwgdHJhY2suZm9udHNpemUoKSlcblx0XHQuYXR0cihcInhcIiwgMTEwKVxuXHRcdC5hdHRyKFwieVwiLCB+fih0cmFjay5oZWlnaHQoKS8yKSlcblx0XHQudGV4dCh0cmFjay50ZXh0KCkpO1xuXHR9KTtcblxuXHQvLyB0aGUgZ2VuZXJhbCB0cmFja1xuXHR2YXIgdHJhY2sgPSBsZWdlbmRfdHJhY2soKVxuXHQgICAgLmRpc3BsYXkgKGZlYXR1cmUpO1xuXHR0cmFjay5jb2xvciA9IHVuZGVmaW5lZDtcblx0dmFyIGFwaSA9IGFwaWpzKHRyYWNrKTtcblx0YXBpXG5cdCAgICAuZ2V0c2V0IChcImNvbG9yMVwiLCBcInllbGxvd1wiKVxuXHQgICAgLmdldHNldCAoXCJjb2xvcjJcIiwgXCJyZWRcIilcblx0ICAgIC5nZXRzZXQgKFwiZnJvbVwiLCAwKVxuXHQgICAgLmdldHNldCAoXCJ0b1wiLCAxMDApXG5cblx0cmV0dXJuIHRyYWNrO1xuICAgIH0pO1xuXG5cbiAgICBhcGkubWV0aG9kICgncmFuZ2UnLCBmdW5jdGlvbiAoKSB7XG5cdHZhciBmZWF0dXJlID0gYm9hcmQudHJhY2suZmVhdHVyZSgpXG5cdGZlYXR1cmUuY3JlYXRlIChmdW5jdGlvbiAoZywgeFNjYWxlKSB7XG5cdCAgICB2YXIgdHJhY2sgPSB0aGlzO1xuXHQgICAgdmFyIGdyYWRfd2lkdGggPSAxMDA7XG5cdCAgICB2YXIgZ3JhZGllbnQgPSBnXG5cdFx0LmFwcGVuZChcImxpbmVhckdyYWRpZW50XCIpXG5cdFx0LmF0dHIoXCJ4MVwiLCBcIjAlXCIpXG5cdFx0LmF0dHIoXCJ4MlwiLCBcIjEwMCVcIilcblx0XHQuYXR0cihcInkxXCIsIFwiMCVcIilcblx0XHQuYXR0cihcInkyXCIsIFwiMCVcIilcblx0XHQuYXR0cihcImlkXCIsIGQzLnNlbGVjdChkaXYpLmF0dHIoXCJpZFwiKSArIFwiX3JhbmdlXCIpO1xuXHQgICAgZ3JhZGllbnRcblx0XHQuYXBwZW5kKFwic3RvcFwiKVxuXHRcdC5hdHRyKFwib2Zmc2V0XCIsIFwiMCVcIilcblx0XHQuYXR0cihcInN0b3AtY29sb3JcIiwgdHJhY2suY29sb3IxKCkpXG5cdFx0LmF0dHIoXCJzdG9wLW9wYWNpdHlcIiwgMSk7XG5cdCAgICBncmFkaWVudFxuXHRcdC5hcHBlbmQoXCJzdG9wXCIpXG5cdFx0LmF0dHIoXCJvZmZzZXRcIiwgXCIxMDAlXCIpXG5cdFx0LmF0dHIoXCJzdG9wLWNvbG9yXCIsIHRyYWNrLmNvbG9yMigpKVxuXHRcdC5hdHRyKFwic3RvcC1vcGFjaXR5XCIsIDEpO1xuXG5cdCAgICB2YXIgc2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKVxuXHRcdC5kb21haW4oW3RyYWNrLmZyb20oKSwgdHJhY2sudG8oKV0pXG5cdFx0LnJhbmdlKFswLCBncmFkX3dpZHRoXSk7XG5cblx0ICAgIHZhciBicnVzaCA9IGQzLnN2Zy5icnVzaCgpXG5cdFx0Lngoc2NhbGUpXG5cdFx0LmV4dGVudChbdHJhY2suZnJvbSgpLCB0cmFjay50bygpXSlcblx0XHQub24oXCJicnVzaHN0YXJ0XCIsIGJydXNoc3RhcnQpXG5cdFx0Lm9uKFwiYnJ1c2hcIiwgYnJ1c2htb3ZlKVxuXHRcdC5vbihcImJydXNoZW5kXCIsIGJydXNoZW5kKTtcblxuXHQgICAgdmFyIGJydXNoZyA9IGdcblx0XHQuYXBwZW5kKFwiZ1wiKVxuXHRcdC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKDUsNSlcIilcblx0XHQuY2FsbCAoYnJ1c2gpO1xuXG5cdCAgICBicnVzaGcuc2VsZWN0QWxsKFwiLnJlc2l6ZVwiKS5hcHBlbmQoXCJsaW5lXCIpXG5cdFx0LmF0dHIoXCJ4MVwiLCAwKVxuXHRcdC5hdHRyKFwieTFcIiwgMClcblx0XHQuYXR0cihcIngyXCIsIDApXG5cdFx0LmF0dHIoXCJ5MlwiLCAodHJhY2suaGVpZ2h0KCkvMiAtIDIpKVxuXHRcdC5zdHlsZShcInN0cm9rZVwiLCBcImJsYWNrXCIpXG5cdFx0LnN0eWxlKFwic3Ryb2tlLXdpZHRoXCIsIDIpO1xuXG5cdCAgICBicnVzaGcuc2VsZWN0QWxsKFwiLnJlc2l6ZVwiKS5hcHBlbmQoXCJwYXRoXCIpXG5cdFx0LmF0dHIoXCJkXCIsIFwiTTAsMEwtMywtNEwzLC00TDAsMFwiKVxuXHRcdC5hdHRyKFwiZmlsbFwiLCBcImJsYWNrXCIpO1xuXG5cdCAgICBicnVzaGcuc2VsZWN0QWxsIChcInJlY3RcIilcblx0XHQuY2xhc3NlZChcInRudF9sZWdlbmRfcmFuZ2VcIiwgdHJ1ZSlcblx0XHQuYXR0cihcImhlaWdodFwiLCB0cmFjay5oZWlnaHQoKS8yIC0gMilcblx0XHQuYXR0cihcImZpbGxcIiwgXCJ1cmwoI1wiICsgZDMuc2VsZWN0KGRpdikuYXR0cihcImlkXCIpICsgXCJfcmFuZ2UpXCIpO1xuXG5cdCAgICBicnVzaGdcblx0XHQuYXBwZW5kKFwicmVjdFwiKVxuXHRcdC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfbGVnZW5kX3JhbmdlX3ByZVwiKVxuXHRcdC5hdHRyKFwieFwiLCAwKVxuXHRcdC5hdHRyKFwieVwiLCAwKVxuXHRcdC5hdHRyKFwiaGVpZ2h0XCIsIHRyYWNrLmhlaWdodCgpLzIgLSAyKVxuXHRcdC5hdHRyKFwiZmlsbFwiLCB0cmFjay5jb2xvcjEoKSk7XG5cblx0ICAgIGJydXNoZ1xuXHRcdC5hcHBlbmQoXCJyZWN0XCIpXG5cdFx0LmF0dHIoXCJjbGFzc1wiLCBcInRudF9sZWdlbmRfcmFuZ2VfcG9zdFwiKVxuXHRcdC5hdHRyKFwieVwiLCAwKVxuXHRcdC5hdHRyKFwiaGVpZ2h0XCIsIHRyYWNrLmhlaWdodCgpLzIgLSAyKVxuXHRcdC5hdHRyKFwiZmlsbFwiLCB0cmFjay5jb2xvcjIoKSk7XG5cblx0ICAgIGJydXNoc3RhcnQoKTtcblx0ICAgIGJydXNobW92ZSgpO1xuXG5cdCAgICB2YXIgYXhpcyA9IGQzLnN2Zy5heGlzKCkuc2NhbGUoc2NhbGUpLnRpY2tTaXplKDApLnRpY2tzKDMpO1xuXHQgICAgdmFyIGF4aXNfZyA9IGdcblx0XHQuYXBwZW5kKFwiZ1wiKVxuXHRcdC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKDUsXCIgKyAodHJhY2suaGVpZ2h0KCktMTApICsgXCIpXCIpXG5cdFx0LmNhbGwoYXhpcyk7XG5cblx0ICAgIGdcblx0XHQuYXBwZW5kKFwidGV4dFwiKVxuXHRcdC5hdHRyKFwiZmlsbFwiLCBcImJsYWNrXCIpXG5cdFx0LmF0dHIoXCJmb250LXNpemVcIiwgdHJhY2suZm9udHNpemUoKSlcblx0XHQuYXR0cihcInhcIiwgMTE1KVxuXHRcdC5hdHRyKFwieVwiLCB+fih0cmFjay5oZWlnaHQoKS8yICsgMykpXG5cdFx0LnRleHQodHJhY2sudGV4dCgpKTtcblxuXHQgICAgZnVuY3Rpb24gYnJ1c2hzdGFydCAoKSB7XG5cdCAgICB9XG5cdCAgICBmdW5jdGlvbiBicnVzaG1vdmUgKCkge1xuXHRcdGNvbnNvbGUubG9nKGJydXNoLmV4dGVudCgpKTtcblx0XHRicnVzaGcuc2VsZWN0QWxsIChcIi50bnRfbGVnZW5kX3JlY3RcIilcblx0XHQgICAgLmF0dHIoXCJmaWxsXCIsIFwidXJsKCNcIiArIGQzLnNlbGVjdChkaXYpLmF0dHIoXCJpZFwiKSArIFwiX3JhbmdlKVwiKTtcblx0XHRicnVzaGcuc2VsZWN0QWxsIChcIi50bnRfbGVnZW5kX3JhbmdlX3ByZVwiKVxuXHRcdCAgICAuYXR0cihcIndpZHRoXCIsIHNjYWxlKGJydXNoLmV4dGVudCgpWzBdKS0xKVxuXHRcdGJydXNoZy5zZWxlY3RBbGwgKFwiLnRudF9sZWdlbmRfcmFuZ2VfcG9zdFwiKVxuXHRcdCAgICAuYXR0cihcInhcIiwgc2NhbGUoYnJ1c2guZXh0ZW50KClbMV0pKzEpXG5cdFx0ICAgIC5hdHRyKFwid2lkdGhcIiwgIGdyYWRfd2lkdGggLSBzY2FsZShicnVzaC5leHRlbnQoKVsxXSkpO1xuXHRcdHRyYWNrLm9uX2NoYW5nZSgpLmNhbGwoYnJ1c2gpO1xuXHQgICAgfVxuXHQgICAgZnVuY3Rpb24gYnJ1c2hlbmQgKCkge1xuXHRcdGNvbnNvbGUubG9nKGJydXNoLmV4dGVudCgpKTtcblx0ICAgIH1cblxuXHR9KTtcblxuXHR2YXIgdHJhY2sgPSBsZWdlbmRfdHJhY2soKVxuXHQgICAgLmRpc3BsYXkgKGZlYXR1cmUpO1xuXHR0cmFjay5jb2xvciA9IHVuZGVmaW5lZDtcblx0dmFyIGFwaSA9IGFwaWpzKHRyYWNrKTtcblx0YXBpXG5cdCAgICAuZ2V0c2V0IChcImNvbG9yMVwiLCBcInllbGxvd1wiKVxuXHQgICAgLmdldHNldCAoXCJjb2xvcjJcIiwgXCJyZWRcIilcblx0ICAgIC5nZXRzZXQgKFwiZnJvbVwiLCAwKVxuXHQgICAgLmdldHNldCAoXCJ0b1wiLCAxMDApXG5cdCAgICAuZ2V0c2V0IChcIm9uX2NoYW5nZVwiLCBmdW5jdGlvbiAoKXt9KTtcblxuXHRyZXR1cm4gdHJhY2s7XG4gICAgfSk7XG5cblxuICAgIGFwaS5tZXRob2QgKCdlbXB0eScsIGZ1bmN0aW9uIChjb2xvciwgZGVzYykge1xuXHR2YXIgdHJhY2sgPSBib2FyZC50cmFjaygpXG5cdCAgICAuaGVpZ2h0KG9wdHMucm93X2hlaWdodClcblx0ICAgIC5iYWNrZ3JvdW5kX2NvbG9yKFwid2hpdGVcIilcblx0ICAgIC5kYXRhKG51bGwpXG5cdCAgICAuZGlzcGxheShudWxsKTtcblxuXHRyZXR1cm4gdHJhY2s7XG4gICAgfSk7XG5cbiAgICB2YXIgbGVnZW5kX3RyYWNrID0gZnVuY3Rpb24gKCkge1xuXHR2YXIgZmVhdHVyZSA9IGJvYXJkLnRyYWNrLmZlYXR1cmUoKTtcblx0ZmVhdHVyZS5jcmVhdGUgKGZ1bmN0aW9uIChnLCB4U2NhbGUpIHtcblx0ICAgIHZhciB0cmFjayA9IHRoaXM7XG5cdCAgICAvLyBmZWF0dXJlXG5cdCAgICB2YXIgZmVhdHVyZV9nID0gZ1xuXHRcdC5hcHBlbmQoXCJnXCIpO1xuXHQgICAgXG5cdCAgICB0cmFjay5kZXBsb3koKS5jYWxsKGZlYXR1cmVfZy5ub2RlKCkpO1xuXG5cdCAgICAvLyBsYWJlbFxuXHQgICAgZ1xuXHRcdC5hcHBlbmQoXCJnXCIpXG5cdFx0LmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyAodHJhY2suZmVhdHVyZV93aWR0aCgpICsgNSkgKyBcIiwgMClcIilcblx0XHQuYXBwZW5kKFwidGV4dFwiKVxuXHRcdC5hdHRyKFwiZmlsbFwiLCBcImJsYWNrXCIpXG5cdFx0LmF0dHIoXCJ4XCIsIDApXG5cdFx0LmF0dHIoXCJ5XCIsIH5+KHRyYWNrLmhlaWdodCgpLzIpICsgNCkgLy8gVE9ETzogRG9uJ3QgaGFyZGNvZGUgdGhlIDRcblx0XHQuYXR0cihcImZvbnQtc2l6ZVwiLCB0cmFjay5mb250c2l6ZSgpKVxuXHRcdC50ZXh0KHRyYWNrLnRleHQoKSk7XG5cdH0pO1xuXG5cdHZhciB0cmFjayA9IGJvYXJkLnRyYWNrKCk7XG5cblx0dmFyIGFwaSA9IGFwaWpzICh0cmFjaylcblx0ICAgIC5nZXRzZXQgKCdjb2xvcicsICdibGFjaycpXG5cdCAgICAuZ2V0c2V0ICgndGV4dCcsICcnKVxuXHQgICAgLmdldHNldCAoJ2hlaWdodCcsIG9wdHMucm93X2hlaWdodClcblx0ICAgIC5nZXRzZXQgKCdmb250c2l6ZScsIG9wdHMuZm9udHNpemUpXG5cdCAgICAuZ2V0c2V0ICgnZmVhdHVyZV93aWR0aCcsIDQwKVxuXHQgICAgLmdldHNldCAoJ2RlcGxveScsIGZ1bmN0aW9uICgpIHtcblx0XHR0aHJvdyAoJ2RlcGxveSBpcyBub3QgZGVmaW5lZCBpbiB0aGUgbGVnZW5kIGJhc2UgY2xhc3MnKTtcblx0ICAgIH0pO1xuXG5cdHRyYWNrXG5cdCAgICAuaGVpZ2h0ICh0cmFjay5oZWlnaHQoKSlcblx0ICAgIC5iYWNrZ3JvdW5kX2NvbG9yIChcIndoaXRlXCIpXG5cdCAgICAuZGF0YSAoYm9hcmQudHJhY2suZGF0YSgpXG5cdFx0ICAgLnVwZGF0ZShcblx0XHQgICAgICAgYm9hcmQudHJhY2suZGF0YS5yZXRyaWV2ZXIuc3luYygpXG5cdFx0XHQgICAucmV0cmlldmVyIChmdW5jdGlvbiAoKSB7XG5cdFx0XHQgICAgICAgcmV0dXJuIFt7fV07XG5cdFx0XHQgICB9KVxuXHRcdCAgICAgICApXG5cdFx0ICApXG5cdCAgICAuZGlzcGxheSAoZmVhdHVyZSk7XG5cblx0cmV0dXJuIHRyYWNrO1xuICAgIH07XG5cbiAgICByZXR1cm4gXztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IHRudF9sZWdlbmQ7XG4iXX0=
