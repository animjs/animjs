window.ajs = (function() {

    function deltaTransformPoint(matrix, point)  {
        var dx = point.x * matrix.a + point.y * matrix.c + 0;
        var dy = point.x * matrix.b + point.y * matrix.d + 0;
        return { x: dx, y: dy };
    }
    function decomposeMatrix(matrix) {
        var px = deltaTransformPoint(matrix, { x: 0, y: 1 });
        var py = deltaTransformPoint(matrix, { x: 1, y: 0 });

        var skewX = ((180 / Math.PI) * Math.atan2(px.y, px.x) - 90);
        var skewY = ((180 / Math.PI) * Math.atan2(py.y, py.x));

        return {
            translate: [matrix.e, matrix.f],
            scale: [Math.sqrt(matrix.a * matrix.a + matrix.b * matrix.b), Math.sqrt(matrix.c * matrix.c + matrix.d * matrix.d)],
            skewX: skewX,
            skewY: skewY,
            rotate: skewX
        };
    }

    function componentToHex(c) {
        var hex = c.toString(16);
        return hex.length == 1 ? "0" + hex : hex;
    }
    function rgbToHex(r, g, b) {
        return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
    }
    function hexToRgb(hex) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    function shortUID() {
        return (Math.random()*Math.pow(36,4)).toString(36).replace('.','');
    }

    function makeSVG(tag) {
        return document.createElementNS('http://www.w3.org/2000/svg', tag);
    }

    var Matrix = function(matrix){
        this.matrix = matrix;
    };
    Matrix.prototype.rotate = function(angle) {
        angle *= Math.PI / 180;
        var a = this.matrix[0];
        var b = this.matrix[1];
        var c = this.matrix[2];
        var d = this.matrix[3];
        var tx = this.matrix[4];
        var ty = this.matrix[5];

        var cos = Math.cos(angle);
        var sin = Math.sin(angle);

        var fa = cos * a + sin * b;
        var fb = -sin * a + cos * b;
        var fc = cos * c + sin * d;
        var fd = -sin * c + cos * d;

        this.matrix = [fa, fb, fc, fd, tx, ty];
    };
    Matrix.prototype.translate = function(xy) {
        var a = this.matrix[0];
        var b = this.matrix[1];
        var c = this.matrix[2];
        var d = this.matrix[3];
        var tx = parseFloat(this.matrix[4]);
        var ty = parseFloat(this.matrix[5]);

        tx += xy[0] * a + xy[1] * b;
        ty += xy[0] * c + xy[1] * d;

        this.matrix = [a, b, c, d, tx, ty];
    };
    Matrix.prototype.scale = function(xy) {
        var a = this.matrix[0];
        var b = this.matrix[1];
        var c = this.matrix[2];
        var d = this.matrix[3];
        var tx = this.matrix[4];
        var ty = this.matrix[5];


        var scaleX = xy[0] / a;
        var scaleY = xy[1] / d;

        if(scaleX === Infinity) scaleX = 1;
        if(scaleY === Infinity) scaleY = 1;


        a *= scaleX;
        c *= scaleX;
        b *= scaleY;
        d *= scaleY;

        a = parseFloat(a);
        b = parseFloat(b);
        c = parseFloat(c);
        d = parseFloat(d);

        this.matrix = [a, b, c, d, tx, ty];
    };

    Matrix.prototype.skewX = function(xy) {
        var a = this.matrix[0];
        var b = this.matrix[1];
        var c = this.matrix[2];
        var d = this.matrix[3];
        var tx = this.matrix[4];
        var ty = this.matrix[5];

        var toRadians = Math.PI / 180;
        var shearX = Math.tan(xy * toRadians);

        b += shearX * a;
        d += shearX * c;

        this.matrix = [a, b, c, d, tx, ty];
    };
    Matrix.prototype.skewY = function(xy) {
        var a = this.matrix[0];
        var b = this.matrix[1];
        var c = this.matrix[2];
        var d = this.matrix[3];
        var tx = this.matrix[4];
        var ty = this.matrix[5];

        var toRadians = Math.PI / 180;
        var shearY = Math.tan(xy * toRadians);

        a += shearY * b;
        c += shearY * d;

        this.matrix = [a, b, c, d, tx, ty];
    };
    Matrix.prototype.toString = function(){
        return 'matrix('+this.matrix[0]+', '+this.matrix[1]+', '+this.matrix[2]+', '+this.matrix[3]+', '+this.matrix[4]+', '+this.matrix[5]+')';
    };

    var rules = {
        "svg": ["clipPath", "mask", "filter", "dataId", "dataClass", "width", "height", "x", "y", "viewbox", "viewport", "opacity"],
        "g": ["clipPath", "mask", "filter", "dataId", "dataClass","width", "height", "transform", "stroke", "strokeWidth", "strokeOpacity", "strokeDasharray", "opacity"],
        "rect": ["clipPath", "mask", "filter", "dataId", "dataClass","width", "height", "x", "y", "rx", "ry", "fill", "fillOpacity", "fillRule", "opacity", "transform", "stroke", "strokeWidth", "strokeOpacity", "strokeDasharray"],
        "circle": ["clipPath", "mask", "filter", "dataId", "dataClass","cx", "cy", "r", "fill", "fillOpacity", "fillRule", "opacity", "transform", "stroke", "strokeWidth", "strokeOpacity", "strokeDasharray"],
        "ellipse": ["clipPath", "mask", "filter", "dataId", "dataClass","cx", "cy", "rx", "ry", "fill", "fillOpacity", "fillRule", "opacity", "transform", "stroke", "strokeWidth", "strokeOpacity", "strokeDasharray"],
        "line":["clipPath", "mask", "filter", "dataId", "dataClass","x1", "x2", "y1", "y2", "opacity", "transform", "stroke", "strokeWidth", "strokeOpacity", "strokeDasharray", "markerStart", "markerMid", "marker-end"],
        "polyline":["clipPath", "mask", "filter", "dataId", "dataClass","points", "opacity", "transform", "stroke", "strokeWidth", "strokeOpacity", "strokeDasharray", "fill", "fillOpacity", "fillRule", "markerStart", "markerMid", "markerEnd"],
        "polygon":["clipPath", "mask", "filter", "dataId", "dataClass","points", "opacity", "transform", "stroke", "strokeWidth", "strokeOpacity", "strokeDasharray", "markerStart", "markerMid", "markerEnd"],
        "text":["clipPath", "mask", "filter", "dataId", "dataClass","innerHTML", "x", "y", "anchor", "fontFamily", "textLength", "lengthAdjust", "fontSize", "fill", "fillOpacity", "fillRule", "opacity", "transform", "stroke", "strokeWidth", "strokeOpacity", "strokeDasharray" ],
        "image":["clipPath", "mask", "filter", "dataId", "dataClass","width", "height", "x", "y", "src", "transform", "stroke", "strokeWidth", "strokeOpacity", "strokeDasharray"],
        "a":["clipPath", "mask", "filter", "dataId", "dataClass","href", "target"],
        "use":["clipPath", "mask", "filter", "dataId", "dataClass","href", "x", "y", "fill", "fillOpacity", "fillRule", "opacity", "stroke", "strokeWidth", "strokeOpacity", "strokeDasharray"],
        "path":["clipPath", "mask", "filter", "dataId", "dataClass","d", "fill", "fillOpacity", "fillRule", "opacity", "stroke", "strokeWidth", "strokeOpacity", "strokeDasharray"]
    };

    var defsRules = {
        "linearGradient": ["dataId", "dataClass","id", "x1", "x2", "y1", "y2", "spreadMethod", "gradientTransform", "gradientUnits"],
        "radialGradient": ["dataId", "dataClass","id", "cx", "cy", "fx", "fy", "r", "spreadMethod", "gradientTransform", "gradientUnits"],
        "pattern": ["dataId", "dataClass","id", "x","y","width","height","patternUnits","patternTransform"],
        "clipPath":["dataId", "dataClass","id"],
        "mask": ["dataId", "dataClass","id", "x", "y", "width", "height"],
        "filter":["dataId", "dataClass","id", "x", "y", "width", "height"]
    };

    var defsRulesChild = {
        "linearGradient":{"stop":["dataId", "dataClass","offset", "stopColor", "stopOpacity"]},
        "radialGradient":{"stop":["dataId", "dataClass","offset", "stopColor", "stopOpacity"]},
        "pattern":"*",
        "clipPath":"*",
        "mask":"*",
        "filter": {
            "feGaussianBlur": ["dataId", "dataClass","in", "stdDeviation", "result"],
            "feOffset": ["dataId", "dataClass","in", "dx", "dy", "result"],
            "feColorMatrix": ["dataId", "dataClass","in", "type", "values", "result"],
            "feBlend": ["dataId", "dataClass","in", "in2"],
            "feMerge": ["dataId", "dataClass","in"] /// feMergeNode
        }
    };

    var pathCommands = {
        "move":"M",
        "moveRel":"m",
        "line":"L",
        "lineRel":"l",
        "horizontal":"H",
        "horizontalRel":"h",
        "vertical":"V",
        "verticalRel":"v",
        "curve":"C",
        "curveRel":"c",
        "smooth":"S",
        "smoothRel":"s",
        "quadratic":"Q",
        "quadraticRel":"q",
        "shorthand":"T",
        "shorthandRel":"t",
        "elliptical":"A",
        "ellipticalRel":"a",
        "close":"Z",
        "closeRel":"z"
    };
    var pathParameters = {
        "m":["x","y"],
        "l":["x","y"],
        "h":["x"],
        "v":["y"],
        "c":["x2","y2","x1","y1","x","y"],
        "s":["x2","y2","x","y"],
        "q":["x1","y1","x","y"],
        "t":["x","y"],
        "a":["rx","ry","r","flag"],
        "z":[]
    };

    var Elements = function(tag, obj){
        var elm = makeSVG(tag);
        if(obj[tag].hasOwnProperty('id')){
            elm.id = tag+'-'+shortUID()+'-'+obj[tag].id;
            var broadcast = JSON.stringify(obj);
            var regex = new RegExp('"#'+obj[tag].id+'"', 'gmi');
            broadcast = broadcast.replace(regex, '"#'+elm.id+'"');
            obj = JSON.parse(broadcast);
        } else {
            elm.id = tag+'-'+shortUID();
        }

        for(var k in obj[tag]) {
            if (k != "children" && k != "id" && k != "events" && k != "defs" && k != "loop") {
                if (typeof Tags.prototype[tag] == "function") {
                    new Tags(elm)[tag](k, obj[tag][k]);
                }
            } else if (k == "defs") {
                var defs = makeSVG("defs");
                var items = obj[tag].defs;
                for (var n in items) {
                    var defTag = Object.keys(items[n])[0];
                    var itemTag = makeSVG(defTag);
                    var defId = defTag + '-' + shortUID() + '-' + items[n][defTag].id;
                    itemTag.id = defId;

                    var broadcastDef = JSON.stringify(obj);
                    var regexDef = new RegExp('\\(#' + items[n][defTag].id+'\\)', 'gmi');
                    broadcastDef = broadcastDef.replace(regexDef, '(#' + defId+')');
                    obj = JSON.parse(broadcastDef);

                    for (var o in items[n][defTag]) {
                        if (o != "children" && o != "id" && o != "events") {
                            if (typeof Defs.prototype[defTag] == "function") {
                                new Defs(itemTag)[defTag](o, items[n][defTag][o]);
                            }
                        } else if (o == "children") {
                            var children = items[n][defTag][o];
                            if (defsRulesChild[defTag] == "*") {
                                for (var p in children) {
                                    itemTag.appendChild(compute.parse(children[p], true));
                                }
                            } else {
                                for (var q in children) {

                                    var defsChildTag = Object.keys(children[q])[0];
                                    if (defsRulesChild[defTag].hasOwnProperty(defsChildTag)) {
                                        var defsChild = makeSVG(defsChildTag);
                                        var subId = defsChildTag + '-' + shortUID();
                                        defsChild.id = subId;
                                        var subRules = defsRulesChild[defTag][defsChildTag];
                                        for (var r in children[q][defsChildTag]) {
                                            if (subRules.indexOf(r) > -1) {
                                                new Properties(defsChild)[r](children[q][defsChildTag][r]);
                                            }else if(r == "events"){
                                                var events = children[q][defsChildTag][r];
                                                for(var m in events){
                                                    if(events[m].target == "window") {
                                                        if(compute.dispatch.win.indexOf(events[m].event) == -1){
                                                            compute.dispatch.win.push(events[m].event);
                                                        }
                                                    } else if(events[m].target == "self") {
                                                        compute.dispatch.self.push({event:events[m].event, elm:subId});
                                                    } else {
                                                        compute.dispatch.elm.push({event:events[m].event, elm:events[m].target});
                                                    }


                                                    if(!compute.events.hasOwnProperty(events[m].event)){
                                                        compute.events[events[m].event] = [];
                                                    }
                                                    compute.events[events[m].event].push(
                                                        {
                                                            id: subId,
                                                            index: 0,
                                                            duration: events[m].duration,
                                                            ease: events[m].ease,
                                                            delay: events[m].delay,
                                                            prop: events[m].prop
                                                        }
                                                    );
                                                }
                                            }
                                        }
                                    }
                                    itemTag.appendChild(defsChild);
                                }
                            }
                        }
                    }
                    defs.appendChild(itemTag);
                }
                elm.appendChild(defs);

            }
        }

        if(obj[tag].hasOwnProperty('children') && obj[tag].children.length > 0){
            var children2 = obj[tag].children;
            for(var l in children2){
                elm.appendChild(compute.parse(children2[l], true));
            }
        }

        if(obj[tag].hasOwnProperty('loop')){
            var loop = {};
            loop.name = shortUID();
            loop.start = true;
            loop.events = [];
            if(obj[tag].loop.hasOwnProperty("name")){
                loop.name = obj[tag].loop.name;
            }
            if(obj[tag].loop.hasOwnProperty('start')){
                loop.start = obj[tag].loop.start;
            }
            var events = obj[tag].loop.children;
            for(var m in events) {
                var loopId = 'loop'+shortUID();
                loop.events.push(loopId);
                compute.dispatch.win.push(loopId);
                if (!compute.events.hasOwnProperty(loopId)) {
                    compute.events[loopId] = [];
                }
                compute.events[loopId].push(
                    {
                        id: elm.id,
                        index: 0,
                        duration: events[m].duration,
                        ease: events[m].ease,
                        delay: events[m].delay,
                        prop: events[m].prop
                    }
                );
            }
            compute.loop[loop.name] = {
                start: loop.start,
                status:true,
                started: false,
                events: loop.events,
                index:0
            };
        }

        if(obj[tag].hasOwnProperty('events')){
            var events = obj[tag].events;
            for(var m in events){
                if(events[m].target == "window") {
                    if(compute.dispatch.win.indexOf(events[m].event) == -1){
                        compute.dispatch.win.push(events[m].event);
                    }
                } else if(events[m].target == "self") {
                    compute.dispatch.self.push({event:events[m].event, elm:elm.id});
                }

                if(events[m].target == "window" || events[m].target == "self") {
                    if (!compute.events.hasOwnProperty(events[m].event)) {
                        compute.events[events[m].event] = [];
                    }
                    compute.events[events[m].event].push(
                        {
                            id: elm.id,
                            index: 0,
                            duration: events[m].duration,
                            ease: events[m].ease,
                            delay: events[m].delay,
                            prop: events[m].prop
                        }
                    );
                }
            }
        }



        return elm;
    };

    var Defs = function(elm){
        this.elm = elm;
    };
    Defs.prototype.linearGradient = function(prop, value){
        var allowed = defsRules.linearGradient;
        if(allowed.indexOf(prop) > -1){
            new Properties(this.elm)[prop](value);
        }
    };
    Defs.prototype.radialGradient = function(prop, value){
        var allowed = defsRules.radialGradient;
        if(allowed.indexOf(prop) > -1){
            new Properties(this.elm)[prop](value);
        }
    };
    Defs.prototype.pattern = function(prop, value){
        var allowed = defsRules.pattern;
        if(allowed.indexOf(prop) > -1){
            new Properties(this.elm)[prop](value);
        }
    };
    Defs.prototype.clipPath = function(prop, value){
        var allowed = defsRules.clipPath;
        if(allowed.indexOf(prop) > -1){
            new Properties(this.elm)[prop](value);
        }
    };
    Defs.prototype.mask = function(prop, value){
        var allowed = defsRules.mask;
        if(allowed.indexOf(prop) > -1){
            new Properties(this.elm)[prop](value);
        }
    };
    Defs.prototype.filter = function(prop, value){
        var allowed = defsRules.filter;
        if(allowed.indexOf(prop) > -1){
            new Properties(this.elm)[prop](value);
        }
    };

    var Tags = function(elm){
        this.elm = elm;
    };
    Tags.prototype.svg = function(prop, value){
        var allowed = rules.svg;
        if(allowed.indexOf(prop) > -1){
            new Properties(this.elm)[prop](value);
        }
    };
    Tags.prototype.g = function(prop, value){
        var allowed = rules.g;
        if(allowed.indexOf(prop) > -1){
            new Properties(this.elm)[prop](value);
        }
    };
    Tags.prototype.rect = function(prop, value){
        var allowed = rules.rect;
        if(allowed.indexOf(prop) > -1){
            new Properties(this.elm)[prop](value);
        }
    };
    Tags.prototype.circle = function(prop, value){
        var allowed = rules.circle;
        if(allowed.indexOf(prop) > -1){
            new Properties(this.elm)[prop](value);
        }
    };
    Tags.prototype.ellipse = function(prop, value){
        var allowed = rules.ellipse;
        if(allowed.indexOf(prop) > -1){
            new Properties(this.elm)[prop](value);
        }
    };
    Tags.prototype.line = function(prop, value){
        var allowed = rules.line;
        if(allowed.indexOf(prop) > -1){
            new Properties(this.elm)[prop](value);
        }
    };
    Tags.prototype.polyline = function(prop, value){
        var allowed = rules.polyline;
        if(allowed.indexOf(prop) > -1){
            new Properties(this.elm)[prop](value);
        }
    };
    Tags.prototype.polygon = function(prop, value){
        var allowed = rules.polygon;
        if(allowed.indexOf(prop) > -1){
            new Properties(this.elm)[prop](value);
        }
    };
    Tags.prototype.text = function(prop, value){
        var allowed = rules.text;
        if(allowed.indexOf(prop) > -1){
            new Properties(this.elm)[prop](value);
        }
    };
    Tags.prototype.image = function(prop, value){
        var allowed = rules.image;
        if(allowed.indexOf(prop) > -1){
            new Properties(this.elm)[prop](value);
        }
    };
    Tags.prototype.use = function(prop, value){
        var allowed = rules.use;
        if(allowed.indexOf(prop) > -1){
            new Properties(this.elm)[prop](value);
        }
    };

    Tags.prototype.path = function(prop, value){
        var allowed = rules.path;
        if(allowed.indexOf(prop) > -1){
            new Properties(this.elm)[prop](value);
        }
    };

    function transform(value){
        var prop = "";
        for(var k in value){
            if(typeof value[k] == "number"){
                prop += k+"("+value[k]+") ";
            }else{
                var len = value[k].length;
                prop += k+"(";
                for(var i = 0; i < len; i++){
                    if(i == len - 1) {
                        prop += value[k][i]+') ';
                    } else {
                        prop += value[k][i] + ',';
                    }
                }
            }
        }
        return prop.substring(0, prop.length -1);
    }

    var Properties = function(elm){
        this.elm = elm;
    };
    Properties.prototype.dataId = function (value){
        this.elm.setAttribute('data-id', value);
    };
    Properties.prototype.dataClass = function (value){
        this.elm.setAttribute('data-class', value);
    };
    Properties.prototype.width = function (value){
        this.elm.setAttribute('width', value);
    };
    Properties.prototype.height = function (value){
        this.elm.setAttribute('height', value);
    };
    Properties.prototype.x = function (value){
        this.elm.setAttribute('x', value);
    };
    Properties.prototype.y = function (value){
        this.elm.setAttribute('y', value);
    };
    Properties.prototype.x1 = function (value){
        this.elm.setAttribute('x1', value);
    };
    Properties.prototype.y1 = function (value){
        this.elm.setAttribute('y1', value);
    };
    Properties.prototype.x2 = function (value){
        this.elm.setAttribute('x2', value);
    };
    Properties.prototype.y2 = function (value){
        this.elm.setAttribute('y2', value);
    };
    Properties.prototype.rx = function (value){
        this.elm.setAttribute('rx', value);
    };
    Properties.prototype.ry = function (value){
        this.elm.setAttribute('ry', value);
    };
    Properties.prototype.cx = function (value){
        this.elm.setAttribute('cx', value);
    };
    Properties.prototype.cy = function (value){
        this.elm.setAttribute('cy', value);
    };
    Properties.prototype.fx = function (value){
        this.elm.setAttribute('fx', value);
    };
    Properties.prototype.fy = function (value){
        this.elm.setAttribute('fy', value);
    };
    Properties.prototype.dx = function (value){
        this.elm.setAttribute('dx', value);
    };
    Properties.prototype.dy = function (value){
        this.elm.setAttribute('dy', value);
    };
    Properties.prototype.r = function (value){
        this.elm.setAttribute('r', value);
    };
    Properties.prototype.points = function (value){
        this.elm.setAttribute('points', value);
    };
    Properties.prototype.fill = function (value){
        this.elm.setAttribute('fill', value);
    };
    Properties.prototype.fillOpacity = function (value){
        this.elm.setAttribute('fill-opacity', value);
    };
    Properties.prototype.fillRule = function (value){
        //nonzero* - evenodd
        this.elm.setAttribute('fill-rule', value);
    };
    Properties.prototype.opacity = function (value){
        this.elm.setAttribute('opacity', value);
    };
    Properties.prototype.viewbox = function (value){
        if(value.hasOwnProperty("x") && value.hasOwnProperty("y") && value.hasOwnProperty("width") && value.hasOwnProperty("height")) {
            this.elm.setAttribute('viewBox', value.x+' '+value.y+' '+value.width+' '+value.height);
        }
    };
    Properties.prototype.viewport = function (value) {
        if(value.hasOwnProperty("x") || value.hasOwnProperty("y")){
            var aspect = "";
            if(typeof value.x != "undefined"){
                switch(value.x){
                    case 'left':
                        aspect += "xMin";
                        break;
                    case 'middle':
                        aspect += "xMid";
                        break;
                    case 'right':
                        aspect += "xMax";
                        break;
                }
            }
            if(typeof value.y != "undefined"){
                switch(value.y){
                    case 'left':
                        aspect += "YMin";
                        break;
                    case 'middle':
                        aspect += "YMid";
                        break;
                    case 'right':
                        aspect += "YMax";
                        break;
                }
            }
            if(aspect != ""){
                if(typeof value.type != "undefined"){
                    switch(value.type){
                        case 'meet':
                            aspect += " meet";
                            break;
                        case 'slice':
                            aspect += " slice";
                            break;
                        case 'none':
                            aspect += " none";
                            break;
                    }
                }
                this.elm.setAttribute('preserveAspectRatio', aspect);
            }
        }
    };
    Properties.prototype.stroke = function(value){
        this.elm.setAttribute('stroke', value);
    };
    Properties.prototype.strokeWidth = function(value){
        this.elm.setAttribute('stroke-width', value);
    };
    Properties.prototype.strokeOpacity = function(value){
        this.elm.setAttribute('stroke-opacity', value);
    };
    Properties.prototype.strokeDasharray = function(value){
        this.elm.setAttribute('stroke-dasharray', value);
    };
    Properties.prototype.transform = function(value){
        this.elm.setAttribute('transform', transform(value));
    };
    Properties.prototype.gradientTransform = function(value){
        this.elm.setAttribute('transform', transform(value));
    };
    Properties.prototype.patternTransform = function(value){
        this.elm.setAttribute('transform', transform(value));
    };
    Properties.prototype.markerStart = function(value){
        this.elm.setAttribute('marker-start', value);
    };
    Properties.prototype.markerMid = function(value){
        this.elm.setAttribute('marker-mid', value);
    };
    Properties.prototype.markerEnd = function(value){
        this.elm.setAttribute('marker-end', value);
    };
    Properties.prototype.innerHTML = function(value){
        this.elm.textContent = value;
    };
    Properties.prototype.anchor = function(value){
        //start - middle - end
        this.elm.setAttribute('text-anchor', value);
    };
    Properties.prototype.fontFamily = function(value){
        this.elm.setAttribute('font-family', value);
    };
    Properties.prototype.fontSize = function(value){
        this.elm.setAttribute('font-size', value);
    };
    Properties.prototype.textLength = function(value){
        this.elm.setAttribute('textLength', value);
    };
    Properties.prototype.lengthAdjust = function(value){
        this.elm.setAttribute('lengthAdjust', value);
    };
    Properties.prototype.src = function(value){
        this.elm.setAttributeNS('http://www.w3.org/1999/xlink', 'href', value);
    };
    Properties.prototype.href = function(value){
        //new replace _blank _top
        this.elm.setAttribute('target', value);
    };
    Properties.prototype.d = function(value){
        var output = "";
        for(var k in value){
            var type = Object.keys(value[k])[0];
            if(type.length > 1){
                var command = pathCommands[type];
                if(command.toLowerCase() == "z"){
                    output += command + ' ';
                }else {
                    var params = pathParameters[command.toLowerCase()];
                    output += command;
                    for (var m in params) {
                        output += value[k][type][params[m]] + ',';
                    }
                }
                output = output.substring(0, output.length - 1) + ' ';
            }else{
                var command = type;
                if(command.toLowerCase() == "z"){
                    output += command + ' ';
                }else {
                    var params = pathParameters[command.toLowerCase()];
                    output += command;
                    for (var m in params) {
                        output += value[k][type][params[m]] + ',';
                    }
                }
                output = output.substring(0, output.length - 1) + ' ';
            }
        }
        output = output.substring(0, output.length - 1);
        this.elm.setAttribute('d', output);
    };
    Properties.prototype.gradientUnits = function(value){
        // 	userSpaceOnUse | objectBoundingBox
        this.elm.setAttribute('gradientUnits', value);
    };
    Properties.prototype.patternUnits = function(value){
        // 	userSpaceOnUse | objectBoundingBox
        this.elm.setAttribute('patternUnits', value);
    };
    Properties.prototype.spreadMethod = function(value){
        //pad | reflect | repeat
        this.elm.setAttribute('spreadMethod', value);
    };
    Properties.prototype.offset = function(value){
        this.elm.setAttribute('offset', value);
    };
    Properties.prototype.stopColor = function(value){
        this.elm.setAttribute('stop-color', value);
    };
    Properties.prototype.stopOpacity = function(value){
        this.elm.setAttribute('stop-opacity', value);
    };
    Properties.prototype.in = function (value){
        this.elm.setAttribute('in', value);
    };
    Properties.prototype.in2 = function (value){
        this.elm.setAttribute('in2', value);
    };
    Properties.prototype.stdDeviation = function(value){
        this.elm.setAttribute('stdDeviation', value);
    };
    Properties.prototype.result = function(value){
        this.elm.setAttribute('result', value);
    };
    Properties.prototype.values = function (value){
        this.elm.setAttribute('values', value);
    };
    Properties.prototype.type = function (value){
        this.elm.setAttribute('type', value);
    };
    Properties.prototype.filter = function (value){
        this.elm.setAttribute('filter', value);
    };
    Properties.prototype.flag = function (value){
        this.elm.setAttribute('flag', value);
    };
    Properties.prototype.mask = function (value){
        this.elm.setAttribute('mask', value);
    };
    Properties.prototype.clipPath = function (value){
        this.elm.setAttribute('clip-path', value);
    };
    Properties.prototype.opacity = function (value){
        this.elm.setAttribute('opacity', value);
    };

    var Events = function(event, elm){
        var animation = compute.events[event];
        for(var k in animation) {
            if(typeof elm != "undefined") {
                if (animation[k].id == elm) {
                    if (document.getElementById(animation[k].id)) {
                        new Animate(animation[k].id, animation[k].duration, animation[k].ease, animation[k].delay, animation[k].prop[animation[k].index]);
                        if (animation[k].prop.length > 0) {
                            if (animation[k].index >= animation[k].prop.length - 1) {
                                animation[k].index = 0;
                            } else {
                                animation[k].index++;
                            }
                        }
                    }
                }
            }else{
                if (document.getElementById(animation[k].id)) {
                    new Animate(animation[k].id, animation[k].duration, animation[k].ease, animation[k].delay, animation[k].prop[animation[k].index]);
                    if (animation[k].prop.length > 0) {
                        if (animation[k].index >= animation[k].prop.length - 1) {
                            animation[k].index = 0;
                        } else {
                            animation[k].index++;
                        }
                    }
                }
            }
        }
    };

    var Loop = function(loopName){
        var options = compute.loop[loopName];
        if(options.status){
            var i = options.index;
            var len = options.events.length - 1;
            if(i > len){
                options.index = 0;
                i = 0;
            }
            var evt = compute.events[compute.loop[loopName].events[i]][0];
            options.index += 1;
            if (document.getElementById(evt.id)) {
                var animId = shortUID();
                compute.animateCallback[animId] = function(){
                    Loop(loopName);
                };
                compute.animateControl[animId] = true;
                new Animate(evt.id, evt.duration, evt.ease, evt.delay, evt.prop, animId, true);
            }else{
                options.started = false;
            }
        }else{
            options.started = false;
        }
    };

    var LoopStart = function(loopName){
        // if  status ==> false ==> loop.started ==> false;
        var options = compute.loop[loopName];
        if(options.start && !options.started){
            options.status = true;
            options.started = true;
            new Loop(loopName);
        }
    };

    var Easings = {
        // Params: Time, Begin, Change (Finish - Begin), Duration
        linear: function(t, b, c, d){
            return c*t/d + b;
        },
        easeInQuad: function (t, b, c, d) {
            return c*(t/=d)*t + b;
        },
        easeOutQuad: function (t, b, c, d) {
            return -c *(t/=d)*(t-2) + b;
        },
        easeInOutQuad: function (t, b, c, d) {
            if ((t/=d/2) < 1) return c/2*t*t + b;
            return -c/2 * ((--t)*(t-2) - 1) + b;
        },
        easeInCubic: function (t, b, c, d) {
            return c*(t/=d)*t*t + b;
        },
        easeOutCubic: function (t, b, c, d) {
            return c*((t=t/d-1)*t*t + 1) + b;
        },
        easeInOutCubic: function (t, b, c, d) {
            if ((t/=d/2) < 1) return c/2*t*t*t + b;
            return c/2*((t-=2)*t*t + 2) + b;
        },
        easeInQuart: function (t, b, c, d) {
            return c*(t/=d)*t*t*t + b;
        },
        easeOutQuart: function (t, b, c, d) {
            return -c * ((t=t/d-1)*t*t*t - 1) + b;
        },
        easeInOutQuart: function (t, b, c, d) {
            if ((t/=d/2) < 1) return c/2*t*t*t*t + b;
            return -c/2 * ((t-=2)*t*t*t - 2) + b;
        },
        easeInQuint: function (t, b, c, d) {
            return c*(t/=d)*t*t*t*t + b;
        },
        easeOutQuint: function (t, b, c, d) {
            return c*((t=t/d-1)*t*t*t*t + 1) + b;
        },
        easeInOutQuint: function (t, b, c, d) {
            if ((t/=d/2) < 1) return c/2*t*t*t*t*t + b;
            return c/2*((t-=2)*t*t*t*t + 2) + b;
        },
        easeInSine: function (t, b, c, d) {
            return -c * Math.cos(t/d * (Math.PI/2)) + c + b;
        },
        easeOutSine: function (t, b, c, d) {
            return c * Math.sin(t/d * (Math.PI/2)) + b;
        },
        easeInOutSine: function (t, b, c, d) {
            return -c/2 * (Math.cos(Math.PI*t/d) - 1) + b;
        },
        easeInExpo: function (t, b, c, d) {
            return (t==0) ? b : c * Math.pow(2, 10 * (t/d - 1)) + b;
        },
        easeOutExpo: function (t, b, c, d) {
            return (t==d) ? b+c : c * (-Math.pow(2, -10 * t/d) + 1) + b;
        },
        easeInOutExpo: function (t, b, c, d) {
            if (t==0) return b;
            if (t==d) return b+c;
            if ((t/=d/2) < 1) return c/2 * Math.pow(2, 10 * (t - 1)) + b;
            return c/2 * (-Math.pow(2, -10 * --t) + 2) + b;
        },
        easeInCirc: function (t, b, c, d) {
            return -c * (Math.sqrt(1 - (t/=d)*t) - 1) + b;
        },
        easeOutCirc: function (t, b, c, d) {
            return c * Math.sqrt(1 - (t=t/d-1)*t) + b;
        },
        easeInOutCirc: function (t, b, c, d) {
            if ((t/=d/2) < 1) return -c/2 * (Math.sqrt(1 - t*t) - 1) + b;
            return c/2 * (Math.sqrt(1 - (t-=2)*t) + 1) + b;
        },
        easeInElastic: function (t, b, c, d) {
            var s=1.70158;var p=0;var a=c;
            if (t==0) return b;  if ((t/=d)==1) return b+c;  if (!p) p=d*.3;
            if (a < Math.abs(c)) { a=c; var s=p/4; }
            else var s = p/(2*Math.PI) * Math.asin (c/a);
            return -(a*Math.pow(2,10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )) + b;
        },
        easeOutElastic: function (t, b, c, d) {
            var s=1.70158;var p=0;var a=c;
            if (t==0) return b;  if ((t/=d)==1) return b+c;  if (!p) p=d*.3;
            if (a < Math.abs(c)) { a=c; var s=p/4; }
            else var s = p/(2*Math.PI) * Math.asin (c/a);
            return a*Math.pow(2,-10*t) * Math.sin( (t*d-s)*(2*Math.PI)/p ) + c + b;
        },
        easeInOutElastic: function (t, b, c, d) {
            var s=1.70158;var p=0;var a=c;
            if (t==0) return b;  if ((t/=d/2)==2) return b+c;  if (!p) p=d*(.3*1.5);
            if (a < Math.abs(c)) { a=c; var s=p/4; }
            else var s = p/(2*Math.PI) * Math.asin (c/a);
            if (t < 1) return -.5*(a*Math.pow(2,10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )) + b;
            return a*Math.pow(2,-10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )*.5 + c + b;
        },
        easeInBack: function (t, b, c, d) {
            var s = 1.70158;
            return c*(t/=d)*t*((s+1)*t - s) + b;
        },
        easeOutBack: function (t, b, c, d) {
            var s = 1.70158;
            return c*((t=t/d-1)*t*((s+1)*t + s) + 1) + b;
        },
        easeInOutBack: function (t, b, c, d) {
            var s = 1.70158;
            if ((t/=d/2) < 1) return c/2*(t*t*(((s*=(1.525))+1)*t - s)) + b;
            return c/2*((t-=2)*t*(((s*=(1.525))+1)*t + s) + 2) + b;
        },
        easeInBounce: function (t, b, c, d) {
            return c - this.easeOutBounce (d-t, 0, c, d) + b;
        },
        easeOutBounce: function (t, b, c, d) {
            if ((t/=d) < (1/2.75)) {
                return c*(7.5625*t*t) + b;
            } else if (t < (2/2.75)) {
                return c*(7.5625*(t-=(1.5/2.75))*t + .75) + b;
            } else if (t < (2.5/2.75)) {
                return c*(7.5625*(t-=(2.25/2.75))*t + .9375) + b;
            } else {
                return c*(7.5625*(t-=(2.625/2.75))*t + .984375) + b;
            }
        },
        easeInOutBounce: function (t, b, c, d) {
            if (t < d/2) return this.easeInBounce (t*2, 0, c, d) * .5 + b;
            return this.easeOutBounce (t*2-d, 0, c, d) * .5 + c*.5 + b;
        }
    };

    var Animate = function(id, duration, ease, delay, prop, callId, callback){
        var ww = window.innerWidth;
        var wh = window.innerHeight;
        compute.window.width = ww;
        compute.window.height = wh;

        if(typeof callId != "undefined"){
            this.callId = callId;
        }else{
            this.callId = null;
        }
        if(typeof callback != "undefined") {
            if (callback) {
                this.cb = true;
            } else {
                this.cb = false;
            }
        }

        this.id = id;
        this.duration = duration;
        this.ease = ease;
        this.prop = prop;
        this.start = null;
        var that = this;
        this.objStart = {};
        this.tag = document.getElementById(id).tagName.toLowerCase();
        for(var k in prop){
            if(k == 'transform'){
                var transform = document.getElementById(this.id).getAttribute(k);
                if(transform == null){
                    this.objStart[k] = {};
                    for(var l in prop[k]){
                        if(typeof prop[k][l] == "string") {
                            this.objStart[k][l] = 0;
                        }else{
                            var len = prop[k][l].length;
                            this.objStart[k][l] = [];
                            for(var i = 0; i < len; i++){
                                this.objStart[k][l].push(0);
                            }
                        }
                    }
                } else {
                    this.objStart[k] = {};
                    for(var l in prop[k]) {
                        var regex = new RegExp(l+'\\(([0-9,-. ]+)\\)');
                        var value = transform.match(regex);
                        if(l == "matrix"){
                            var extract = value[1].split(',');
                            var matrix = {};
                            matrix.a = parseFloat(extract[0]);
                            matrix.b = parseFloat(extract[1]);
                            matrix.c = parseFloat(extract[2]);
                            matrix.d = parseFloat(extract[3]);
                            matrix.e = parseFloat(extract[4]);
                            matrix.f = parseFloat(extract[5]);
                            var output = decomposeMatrix(matrix);
                            for(var m in output){
                                this.objStart[k][m] = output[m];
                            }
                            this.objStart[k].matrix = extract;
                        } else {
                            if (typeof prop[k][l] == "number") {
                                this.objStart[k][l] = value[1];
                            } else {
                                value = value[1].split(',');
                                var len = value.length;
                                this.objStart[k][l] = [];
                                for (var i = 0; i < len; i++) {
                                    this.objStart[k][l].push(value[i]);
                                }
                            }
                        }
                    }
                }
            }else if(k == "d"){
                var path = document.getElementById(this.id).getAttribute(k);
                var entity = path.split(' ');
                this.objStart[k] = {};
                for(var o in entity) {
                    var command = entity[o].substring(0,1);
                    var type = command.toLowerCase();
                    var values = entity[o].substring(1).split(',');
                    entity[o] = {};
                    for(var p in pathParameters[type]){
                        entity[o][pathParameters[type][p]] = values[p];
                    }
                    entity[o].type = command;
                    this.objStart[k][o] = entity[o];
                }
            } else {
                var attr = document.getElementById(this.id).getAttribute(k);
                if (attr != "") {
                    this.objStart[k] = attr;
                } else {
                    this.objStart[k] = 0;
                }
            }
        }
        if(delay > 0){
            setTimeout(function(){
                requestAnimationFrame(function(timestamp){
                    that.step(timestamp);
                });
            }, delay);
        }else{
            requestAnimationFrame(function(timestamp){
                that.step(timestamp);
            });
        }
    };



    Animate.prototype.step = function(timestamp) {
        var ww = window.innerWidth;
        var wh = window.innerHeight;
        if(this.callId != null) {
            if(ww != compute.animateWindow[this.callId].width || wh != compute.animateWindow[this.callId].height){
                if(compute.animateDepend.hasOwnProperty(this.callId)) {
                    compute.animateWindow[this.callId].width = ww;
                    compute.animateWindow[this.callId].height = wh;
                    this.prop = compute.animateDepend[this.callId](this.prop, ww, wh);
                }
            }
        }
        var that = this;
        var progress;
        if (this.start === null) this.start = timestamp;
        progress = timestamp - this.start;

        if(progress > this.duration){
            progress = this.duration;
        }

        if(typeof document.getElementById(this.id) != null) {

            if (progress != 0) {
                var prop = this.prop;
                var init = this.objStart;
                for (var k in prop) {
                    //if(rules[that.tag].indexOf(k) > -1) {
                    if (k == 'transform') {
                        var transform = "";
                        for (var l in prop[k]) {
                            if (typeof prop[k][l] == "number") {
                                transform += l + '(';
                                transform += Easings[that.ease](progress, parseFloat(init[k][l]), parseFloat(prop[k][l]) - parseFloat(init[k][l]), that.duration) + ') ';
                            } else {
                                if (l == "matrix") {
                                    var extract = prop[k][l];
                                    var matrix = {};
                                    matrix.a = extract[0];
                                    matrix.b = extract[1];
                                    matrix.c = extract[2];
                                    matrix.d = extract[3];
                                    matrix.e = extract[4];
                                    matrix.f = extract[5];
                                    var output = decomposeMatrix(matrix);
                                    var outputMatrix = new Matrix(init[k].matrix);
                                    for (var m in output) {
                                        if (typeof output[m] == "number") {
                                            outputMatrix[m](Easings[that.ease](progress, parseFloat(init[k][m]), parseFloat(output[m]) - parseFloat(init[k][m]), that.duration));
                                        } else {
                                            for (var n in output[m]) {
                                                output[m][n] = Easings[that.ease](progress, parseFloat(init[k][m][n]), parseFloat(output[m][n]) - parseFloat(init[k][m][n]), that.duration);
                                            }
                                            outputMatrix[m](output[m]);
                                        }
                                    }
                                    transform += outputMatrix.toString() + ' ';
                                } else {
                                    transform += l + '(';
                                    for (var i = 0; i < prop[k][l].length; i++) {
                                        if (i == prop[k][l].length - 1) {
                                            transform += Easings[that.ease](progress, parseFloat(init[k][l][i]), parseFloat(prop[k][l][i]) - parseFloat(init[k][l][i]), that.duration) + ') ';
                                        } else {
                                            transform += Easings[that.ease](progress, parseFloat(init[k][l][i]), parseFloat(prop[k][l][i]) - parseFloat(init[k][l][i]), that.duration) + ',';
                                        }
                                    }
                                }
                            }
                        }
                        transform = transform.substring(0, transform.length - 1);
                        document.getElementById(this.id).setAttribute(k, transform);
                    } else if (k == "d") {
                        var path = init[k];
                        for (var o in prop[k]) {
                            var index = prop[k][o].index;
                            var valueTo = prop[k][o].value;
                            for (var p in valueTo) {
                                var val = Easings[that.ease](progress, parseFloat(init[k][index][p]), parseFloat(valueTo[p]) - parseFloat(init[k][index][p]), that.duration);
                                path[index][p] = val;
                            }
                        }

                        var outputPath = "";
                        for (var q in path) {
                            var command = path[q].type;

                            if (command.toLowerCase() == "z") {
                                outputPath += command + ' ';
                            } else {
                                var params = pathParameters[command.toLowerCase()];
                                outputPath += command;
                                for (var m in params) {
                                    outputPath += path[q][params[m]] + ',';
                                }
                            }
                            outputPath = outputPath.substring(0, outputPath.length - 1) + ' ';
                        }
                        outputPath = outputPath.substring(0, outputPath.length - 1);
                        document.getElementById(this.id).setAttribute(k, outputPath);
                    } else {
                        if(document.getElementById(this.id) != null) {
                            if (init[k].match(/#[0-9A-Fa-f]{3,6}/)) {
                                var colorI = hexToRgb(init[k]);
                                var colorF = hexToRgb(prop[k]);
                                var valueR = Easings[that.ease](progress, parseFloat(colorI.r), parseFloat(colorF.r) - parseFloat(colorI.r), that.duration);
                                var valueG = Easings[that.ease](progress, parseFloat(colorI.g), parseFloat(colorF.g) - parseFloat(colorI.g), that.duration);
                                var valueB = Easings[that.ease](progress, parseFloat(colorI.b), parseFloat(colorF.b) - parseFloat(colorI.b), that.duration);
                                var attrF = rgbToHex(parseInt(valueR), parseInt(valueG), parseInt(valueB));
                                document.getElementById(this.id).setAttribute(k, attrF);
                            } else if (init[k].match(/^[0-9.-]+(.*)/)[1] == "") {
                                var value = Easings[that.ease](progress, parseFloat(init[k]), parseFloat(prop[k]) - parseFloat(init[k]), that.duration);
                                document.getElementById(this.id).setAttribute(k, value);
                            } else {
                                var value = Easings[that.ease](progress, parseFloat(init[k]), parseFloat(prop[k]) - parseFloat(init[k]), that.duration);
                                document.getElementById(this.id).setAttribute(k, value + prop[k].match(/^[0-9.]+(.*)/)[1]);
                            }
                        }
                    }
                }
            }

            if (this.callId != null) {
                if (progress < this.duration && compute.animateControl[this.callId]) {
                    requestAnimationFrame(function (timestamp) {
                        that.step(timestamp);
                    });
                } else {
                    if (compute.animateDepend.hasOwnProperty(this.callId)) {
                        delete compute.animateDepend[this.callId];
                    }
                    delete compute.animateControl[this.callId];
                    if (that.cb == true) {
                        compute.animateCallback[this.callId]();
                        delete compute.animateCallback[this.callId];
                    }
                }
            } else {
                if (progress < this.duration) {
                    requestAnimationFrame(function (timestamp) {
                        that.step(timestamp);
                    });
                } else {
                    if (this.callId != null) {
                        if (compute.animateDepend.hasOwnProperty(this.callId)) {
                            delete compute.animateDepend[this.callId];
                        }
                        delete compute.animateControl[this.callId];
                    }
                    if (that.cb == true) {
                        compute.animateCallback[this.callId]();
                        delete compute.animateCallback[this.callId];
                    }
                }
            }
        }else{
            if (this.callId != null) {
                if (compute.animateDepend.hasOwnProperty(this.callId)) {
                    delete compute.animateDepend[this.callId];
                }
                delete compute.animateControl[this.callId];
            }
            if (that.cb == true) {
                compute.animateCallback[this.callId]();
                delete compute.animateCallback[this.callId];
            }
        }
    };

    var Tools = function(elms){
        if (typeof elms === 'string') {
            elms = document.querySelectorAll(elms);
        } else if (elms.length) {

        } else {
            elms = [elms];
        }
        for(var i = 0; i < elms.length; i++ ) {
            this[i] = elms[i];
        }
        this.length = elms.length;
    };

    Tools.prototype.each = function (fn) {
        for (var i = 0; i < this.length; i++){
            fn(this[i], i);
        }
    };

    Tools.prototype.style = function(properties){
        for (var i = 0; i < this.length; i++) {
            for (var k in properties) {
                this[i].style[k] = properties[k];
            }
        }
    };
    Tools.prototype.size = function(){
        var output = [];
        for (var i = 0; i < this.length; i++) {
            if (arguments.length > 0 && arguments[0]) {
                var height = this[i].offsetHeight;
                var width = this[i].offsetWidth;
                var style = this[i].currentStyle || getComputedStyle(this[i]);

                height += parseFloat(style.marginTop) + parseFloat(style.marginBottom);
                width += parseFloat(style.marginLeft) + parseFloat(style.marginRight);

                output.push({width:width, height:height});
            } else {
                output.push({width:this[i].offsetWidth,height:this[i].offsetHeight});
            }
        }
        if(output.length == 1) {
            return output[0];
        }else{
            return output;
        }
    };
    Tools.prototype.on = function(action, callback){
        var that = this;
        if (that[0].addEventListener) {
            for (var i = 0; i < this.length; i++) {
                that[i].addEventListener(action, callback, false);//Ajout de l'événement du W3C pour Firefox,Safari,Opera...
            }
        }
        else if (that[0].attachEvent) {
            for (var i = 0; i < this.length; i++) {
                that[i].attachEvent('on' + action, callback); // Ajout de l'événement pour Internet Explorer :(
            }
        }
    };

    var YAML = {
        evalOf: function(token) {
            return eval('(' + token + ')');
        },

        tokenize: function(str) {
            return str.match(/(---|true|false|null|#(.*)|\[(.*?)\]|\{(.*?)\}|[\w\-]+:|-(.+)|\d+\.\d+|\d+|\n+)/g);
        },

        strip: function(str) {
            return str.replace(/^\s*|\s*$/, '');
        },

        parse: function(tokens) {
            var token, list = /^-(.*)/, key = /^([\w\-]+):/, stack = {};
            while (token = tokens.shift())
                if (token[0] == '#' || token == '---' || token == "\n")
                    continue;
                else if (key.exec(token) && tokens[0] == "\n")
                    stack[RegExp.$1] = this.parse(tokens);
                else if (key.exec(token))
                    stack[RegExp.$1] = this.evalOf(tokens.shift());
                else if (list.exec(token))
                    (stack.constructor == Array ?
                        stack : (stack = [])).push(this.strip(RegExp.$1));
            return stack
        },

        eval: function(str) {
            return this.parse(this.tokenize(str));
        }
    };

    var compute = {
        dispatch: {
            win: [],
            self: [],
            elm: []
        },
        loop:{},
        events: {},
        animateCallback:{},
        animateControl:{},
        animateDepend:{},
        animateWindow:{},
        window:{
            height:window.innerHeight,
            width:window.innerWidth
        },
        files: {},
        obj: {},
        _get: function(url, format, callback){
            var request = new XMLHttpRequest();
            request.open('GET', url, true);

            request.onload = function() {
                if (request.status >= 200 && request.status < 400) {
                    if(format == "json"){
                        callback(false, JSON.parse(request.responseText));
                    }else if (format == "yaml"){
                        callback(false, YAML.eval(request.responseText));
                    }else if(format == "raw"){
                        callback(false, request.responseText.replace(/[\n\r]+/gm,'').match(/<svg(.*)svg>/gmi));
                    }else{
                        callback(true, 'format error');
                    }
                } else {
                    callback(true, 'onload error');
                }
            };

            request.onerror = function() {
                callback(true, 'error');
            };

            request.send();
        },
        _call: function(url, format, save){
            var that = this;
            return new Promise(function(resolve, reject) {
                that._get(url + '?' + shortUID(), format, function (err, data) {
                    if (!err) {
                        if(save != null){
                            var name = url.substring(url.lastIndexOf('/') + 1, url.lastIndexOf('.'));
                            that[save][name] = data;
                        }
                        resolve(data);
                    } else {
                        reject(data);
                    }
                }, format);
            });
        },
        _load: function(data){
            var that = this;
            return new Promise(function(resolve, reject) {
                if(data.type == 'obj') {
                    if(data.list.length > 0){
                        var arrFn = [];
                        for(var k in data.list) {
                            var ext = data.list[k].substr(data.list[k].lastIndexOf('.') + 1).toLowerCase();
                            arrFn.push(that._call(data.folder + data.list[k], ext, "obj"));
                        }
                        Promise.all(arrFn).then(function(obj){
                            resolve(obj);
                        });
                    }else{
                        resolve('empty');
                    }
                } else if (data.type == 'svg'){
                    if(data.list.length > 0){
                        var arrFn = [];
                        for(var k in data.list) {
                            arrFn.push(that._call(data.folder + data.list[k], "raw", "files"));
                        }
                        Promise.all(arrFn).then(function(raw){
                            resolve(raw);
                        });
                    }else{
                        resolve('empty');
                    }
                }
            });
        },
        init: function(urls, callback){
            var that = this;
            var arrFn = [];
            for(var k in urls){
                arrFn.push(that._call(urls[k], "json", null));
            }
            Promise.all(arrFn).then(function(values){
                var arrFn = [];
                for(var k in values){
                    arrFn.push(that._load(values[k]));
                }
                Promise.all(arrFn).then(function(values){
                    callback(values);
                });
            });
        },
        load: function(urls, save, callback){
            var arrFn = [];
            for(var k in urls){
                var format = urls[k].substring(urls[k].lastIndexOf('.')+1).toLowerCase();
                if(format == "svg") format = "raw";
                arrFn.push(this._call(urls[k], format, save));
            }
            Promise.all(arrFn).then(function(values){
                callback(values);
            });
        },
        parse: function(data, raw){
            var objData;
            if(!raw){
                objData = this.obj[data];
            } else {
                objData = data;
            }
            return new Elements(Object.keys(objData)[0], objData);
        },
        parseTag: function(){
            var elms = document.querySelectorAll('[data-svg]');
            for(var k in elms){
                if(elms.hasOwnProperty(k)) {
                    var item = elms[k].getAttribute('data-svg');
                    elms[k].appendChild(this.parse(item, false));
                }
            }
            this.eventLoad();
            this.loopLoad();
        },
        loopLoad: function(){
            var loops = this.loop;
            for(var k in loops){
                if(loops[k].start && loops[k].status && !loops[k].started){
                    loops[k].status = true;
                    new LoopStart(k);
                }
            }
        },
        eventLoad: function(type){
            if(type == "window" || type == undefined) {
                for(var k in this.dispatch.win) {
                    var event = this.dispatch.win[k];
                    new Tools(window).on(event, function (e) {
                        new Events(e.type);
                    });
                }
            }
            if(type == "self"){
                for(var l in this.dispatch.self || type == undefined){
                    var selfEvent = this.dispatch.self[l];
                    (function(evt) {
                        new Tools('#'+evt.elm).on(evt.event, function (e){
                                new Events(e.type, evt.elm);
                        });
                    })(selfEvent);
                }
            }
        },
        getInfo: function(dataId, properties, type){
            var output, svg;
            if(type == undefined) {
                svg = document.querySelectorAll('[data-id="' + dataId + '"]');
                output = {};
                if(svg.length > 0) {
                    output.id = svg[0].id;
                    for (var n in properties) {
                        output[properties[n]] = svg[0].getAttribute(properties[n]);
                    }
                }else{
                    output = null;
                }
            }else {
                svg = document.querySelectorAll('[data-class="' + dataId + '"]');

                var elms = [];
                for (var l in svg) {
                    if (svg.hasOwnProperty(l)) {
                        elms.push(svg[l]);
                    }
                }
                output = [];
                for (var k in elms) {
                    var arr = {};
                    arr.id = elms[k].id;
                    for (var m in properties) {
                        arr[properties[m]] = elms[k].getAttribute(properties[m]);
                    }
                    output.push(arr);
                }
            }
            return(output);
        },
        setInfo: function(id, properties){
            if(typeof id != "undefined") {
                for (var k in properties) {
                    document.querySelector('#' + id).setAttribute(k, properties[k]);
                }
            }
        },
        compose: function(type, data){
            if(type == "transform"){
                var transform = "";
                for(var l in data) {
                    if(typeof data[l] == "number") {
                        transform += l+'(';
                        transform += data[l]+') ';
                    }else{
                        if(l == "matrix"){
                            transform = "";
                            var output = data[l];
                            var outputMatrix = new Matrix([1,0,0,1,0,0]);
                            for(var m in output){
                                if(typeof output[m] == "number") {
                                    outputMatrix[m](output[m]);
                                } else {
                                    outputMatrix[m](output[m]);
                                }
                            }
                            transform += outputMatrix.toString() + ' ';
                        } else {
                            transform += l+'(';
                            for (var i = 0; i < data[l].length; i++) {
                                if (i == data[l].length - 1) {
                                    transform += data[l][i] + ') ';
                                } else {
                                    transform += data[l][i] + ',';
                                }
                            }
                        }
                    }
                }
                transform = transform.substring(0, transform.length - 1);
                return transform;
            } else if(type == "path"){
                var path = data;
                var outputPath = "";
                for (var q in path) {
                    var command = path[q].type;

                    if (command.toLowerCase() == "z") {
                        outputPath += command + ' ';
                    } else {
                        var params = pathParameters[command.toLowerCase()];
                        outputPath += command;
                        for (var m in params) {
                            outputPath += path[q][params[m]] + ',';
                        }
                    }
                    outputPath = outputPath.substring(0, outputPath.length - 1) + ' ';
                }
                outputPath = outputPath.substring(0, outputPath.length - 1);
                return outputPath;
            }
        },
        decompose: function(type, data){
            var entity;
            var output;
            if(type == "transform") {
                entity = data.split(' ');
                output = {};
                for(var m in entity) {
                    var l = entity[m].substring(0, entity[m].indexOf('('));
                    var regex = new RegExp(l+'\\(([0-9,-. ]+)\\)');
                    var value = data.match(regex);
                    if(l == "matrix"){
                        var extract = value[1].split(',');
                        var matrix = {};
                        matrix.a = parseFloat(extract[0]);
                        matrix.b = parseFloat(extract[1]);
                        matrix.c = parseFloat(extract[2]);
                        matrix.d = parseFloat(extract[3]);
                        matrix.e = parseFloat(extract[4]);
                        matrix.f = parseFloat(extract[5]);
                        var outputMatrix = decomposeMatrix(matrix);
                        output.matrix = {};
                        for(var n in outputMatrix){
                            output.matrix[n] = outputMatrix[n];
                        }
                    } else {
                        if (typeof value[1] == "number") {
                            output[l] = value[1];
                        } else {
                            value = value[1].split(',');
                            var len = value.length;
                            output[l] = [];
                            for (var i = 0; i < len; i++) {
                                output[l].push(value[i]);
                            }
                        }
                    }
                }
                return output;
            }
            if(type == "path"){
                entity = data.split(' ');
                output = {};
                for(var o in entity) {
                    var command = entity[o].substring(0,1);
                    var type = command.toLowerCase();
                    var values = entity[o].substring(1).split(',');
                    entity[o] = {};
                    for(var p in pathParameters[type]){
                        entity[o][pathParameters[type][p]] = values[p];
                    }
                    entity[o].type = command;
                    output[o] = entity[o];
                }
                return output;
            }
        },
        animate: function(id, properties, dependOn, name, callback){
            if(typeof id != "undefined") {
                var animId = shortUID();
                if (name != null) {
                    animId = name;
                }

                this.animateControl[animId] = true;
                if (dependOn != null) {
                    this.animateDepend[animId] = dependOn;
                    this.animateWindow[animId] = {
                        height:window.innerHeight,
                        width:window.innerWidth
                    }
                }
                if (typeof callback != "undefined") {
                    this.animateCallback[animId] = callback;
                    new Animate(id, properties.duration, properties.ease, properties.delay, properties.prop, animId, true);
                } else {
                    new Animate(id, properties.duration, properties.ease, properties.delay, properties.prop, animId);
                }
            }
        },
        easing: Easings
    };

    return compute;
})();
