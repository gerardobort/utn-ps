
function $(id) { return document.getElementById(id); }

navigator.webkitGetUserMedia(
    { video: true },
    iCanHazStream,
    function miserableFailure (){
        console.log('ah too bad')
    }
);

function iCanHazStream(stream) {
    var url = webkitURL.createObjectURL(stream);
    $('video').src = url;
    webkitRequestAnimationFrame(paintOnCanvas);
}

function paintOnCanvas() {
    var transformador = transformadores[0];
    transformador.context.drawImage(
        $('video'), 0, 0, 
        transformador.image.width, transformador.image.height
    );
    var data = transformador.getData();
    
    var i = 1;
    transformador = transformadores[i];
    transformador.original = data;
    transformador.transform();
    webkitRequestAnimationFrame(paintOnCanvas);
}


function CanvasImage(canvas, src) {
    // load image in canvas
    var context = canvas.getContext('2d');
    var i = new Image();
    var that = this;
    i.onload = function(){
        canvas.width = i.width;
        canvas.height = i.height;
        context.drawImage(i, 0, 0, i.width, i.height);

        // remember the original pixels
        that.original = that.getData();
    };
    i.src = src;
    
    // cache these
    this.context = context;
    this.image = i;

    this.i = 0;
    this.pointsCounter = 0;
    this.hull = new ConvexHull();
}

CanvasImage.prototype.getData = function() {

    // initialize variables

    this.buffersN = 4;
    this.buffers = [];
    for (var i = 0, l = this.buffersN; i < l; i++) {
        this.buffers.push(this.context.createImageData(this.image.width, this.image.width));
    }

    this.avgpN = 6;
    this.avgp = [];
    for (var i = 0, l = this.avgpN; i < l; i++) {
        this.avgp.push([0, 0]);
    }

    this.pointsN = 6;
    this.points = [];
    for (var i = 0, l = this.pointsN; i < l; i++) {
        this.points.push([]);
    }

    return this.context.getImageData(0, 0, this.image.width, this.image.height);
};

CanvasImage.prototype.setData = function(data) {
    return this.context.putImageData(data, 0, 0);
};

var distance2 = function (v1, v2, i) {
    return Math.sqrt(Math.pow(v1[i+0] - v2[i+0], 2) + Math.pow(v1[i+1] - v2[i+1], 2));
};
var distance3 = function (v1, v2, i) {
    return Math.sqrt(Math.pow(v1[i+0] - v2[i+0], 2) + Math.pow(v1[i+1] - v2[i+1], 2) + Math.pow(v1[i+2] - v2[i+2], 2));
};

CanvasImage.prototype.transform = function() {

    // shift buffers and store the last one
    for (var i = 0, l = this.buffersN-1; i < l; i++) {
        this.buffers[i] = this.buffers[i+1];
    }
    this.buffers[i-1] = this.context.createImageData(this.original.width, this.original.height);
    this.buffers[i-1].data.set(this.original.data);

    this.i++;

    var olddata = this.original,
        oldpx = olddata.data,
        newdata = this.context.createImageData(olddata),
        newpx = newdata.data,
        len = newpx.length;

    var epsilon = 60,
        alpha = 0,
        beta = 150,
        gamma = 3,
        omega = 5,
        i = x = y = 0, w = olddata.width, h = olddata.height;


    var grid = new Int8Array(h*w);
    var pointsCounter = 0;

    // iterate through the main buffer and calculate the differences with previous
    for (i = 0; i < len; i += 4) {
        newpx[i+0] = 0;
        newpx[i+1] = 255;
        newpx[i+2] = 0;

        // change the alpha channel based on the frame differences
        alpha = 255;
        for (var j = 0, l = this.buffersN-1; j < l; j++) {
            if (distance3(this.buffers[j].data, oldpx, i) < epsilon) {
                alpha -= 255/l;
            }
        }
        newpx[i+3] = parseInt(alpha*0.2);

        // check if the point belongs to the grid and also if it has changed
        x = (i/4) % w;
        y = parseInt((i/4) / w);
        if ((!(x % omega) && !(y % omega)) && alpha > beta) {
            newpx[i+0] = 255;
            newpx[i+1] = 0;
            newpx[i+2] = 0;
            newpx[i+3] = 0;
            grid[y*w +x] = 1;
            pointsCounter++;
        }
    }

    // store the count number of matched points
    this.pointsCounter = pointsCounter;
    this.setData(newdata);

    // calculate and generate point groups based on density 
    var ctx = this.context;
    var minx = HV = 99999999,
        maxx = LV = -1;

    var minsx = [], maxsx = [], p, points = [], avgp = [w/2, h/2];

    if ((pointsCounter >= gamma) && this.i > 2) {
        for (y = 0; y < h; y++) {
            minx = HV;
            maxx = LV;
            for (x = 0; x < w; x++) {
                i = y*w + x; j = i*4;
                if (grid[i]) {
                    if (x < minx) minx = x;
                    if (x > maxx) maxx = x;
                }
            }
            if (minx !== HV) {
                i = y*w + minx; j = i*4;
                newpx[j+0] = 0;
                newpx[j+1] = 0;
                newpx[j+2] = 255;
                newpx[j+3] = 255;
                minsx.push([minx, y]);
                points.push({ x: minx, y: y });
                //markPoint(ctx, minx, y, 1, 'red');
            }

            if (maxx !== LV) {
                i = y*w + maxx, j = i*4;
                newpx[j+0] = 0;
                newpx[j+1] = 0;
                newpx[j+2] = 255;
                newpx[j+3] = 255;
                maxsx.push([maxx, y]);
                points.push({ x: maxx, y: y });
                //markPoint(ctx, maxx, y, 1, 'blue');
            }
        }

    }

    // concatenate the current points with the ones of previous frames 
    var allpoints = [];
    for (var i = 0, l = this.pointsN-1; i < l; i++) {
        allpoints = allpoints.concat(this.points[i]);
    }

    // based on the sumatory of points, calculate the convex hull and paint it
    this.hull.clear();
    this.hull.compute(allpoints);
    var indices = this.hull.getIndices();
    if (indices && indices.length > 0) {
        ctx.beginPath();
        ctx.moveTo(allpoints[indices[0]].x, allpoints[indices[0]].y);
        var p = farp = center = [w/2, h/2], d = fard = 0, farweight = parseInt(pointsCounter/2);
        for (i = 1, l = indices.length; i < l; i++) {
            p = [allpoints[indices[i]].x, allpoints[indices[i]].y];
            ctx.lineTo(p[0], p[1]);
            avgp[0] += (p[0] -w/2)/(l+farweight);
            avgp[1] += (p[1] -h/2)/(l+farweight);
            if ((d = distance2(center, p, 0)) > fard) {
                fard = d;
                farp = p;
            }
        }
        for (i = 0; i < farweight; i++) {
            avgp[0] += (farp[0] -w/2)/(l+farweight);
            avgp[1] += (farp[1] -h/2)/(l+farweight);
        }
        
        ctx.closePath();
        ctx.fillStyle = "rgba(0, 100, 0, 0.2)";
        ctx.strokeStyle = "rgba(100, 100, 100, 0.7)";
        ctx.fill();
        ctx.stroke();

        markPoint(ctx, farp[0], farp[1], 3, 'white');
    }

    // store the current matched points and shift the array
    for (var i = 0, l = this.pointsN-1; i < l; i++) {
        this.points[i] = this.points[i+1];
    }
    this.points[i-1] = points;

    // store the current average point and shift the array
    var cx = 0, cy = 0;
    for (var i = 0, l = this.avgpN-1; i < l; i++) {
        this.avgp[i] = this.avgp[i+1];
        cx += this.avgp[i][0]/l;
        cy += this.avgp[i][1]/l;
    }
    this.avgp[i-1] = avgp;

    // paint the average point
    markPoint(ctx, cx, cy, 10, 'yellow');

};

var markPoint = function (context, x, y, radius, color) {
    context.beginPath();
    context.arc(x, y, radius, 0, 2 * Math.PI, false);
    context.fillStyle = color;
    context.fill();
    context.lineWidth = 0;
    context.strokeStyle = color;
    context.stroke();
};

var transformadores = [
    new CanvasImage($('canvas1'), 'color-bars-medium.jpg'),
    new CanvasImage($('canvas2'), 'color-bars-medium.jpg'),
];


