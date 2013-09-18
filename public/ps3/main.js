
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
}

CanvasImage.prototype.getData = function() {
    this.buffers = [];
    this.buffers.push(this.context.createImageData(this.image.width, this.image.width));
    this.buffers.push(this.context.createImageData(this.image.width, this.image.width));
    this.buffers.push(this.context.createImageData(this.image.width, this.image.width));
    this.buffers.push(this.context.createImageData(this.image.width, this.image.width));
    this.buffers.push(this.context.createImageData(this.image.width, this.image.width));
    return this.context.getImageData(0, 0, this.image.width, this.image.height);
};

CanvasImage.prototype.setData = function(data) {
    return this.context.putImageData(data, 0, 0);
};

var distance3 = function (v1, v2, i) {
    return Math.sqrt(Math.pow(v1[i+0] - v2[i+0], 2) + Math.pow(v1[i+1] - v2[i+1], 2) + Math.pow(v1[i+2] - v2[i+2], 2));
};

CanvasImage.prototype.transform = function() {
    var olddata = this.original;
    var oldpx = olddata.data;
    var newdata = this.context.createImageData(olddata);
    var newpx = newdata.data
    var len = newpx.length;

    this.buffers[0] = this.buffers[1];
    this.buffers[1] = this.buffers[2];
    this.buffers[2] = this.buffers[3];
    this.buffers[3] = this.buffers[4];
    this.buffers[4] = this.context.createImageData(this.original.width, this.original.height);
    this.buffers[4].data.set(this.original.data);
    this.i++;

    var bs = this.buffers,
        bs0 = bs[0].data,
        bs1 = bs[1].data,
        bs2 = bs[2].data,
        bs3 = bs[3].data,
        epsilon = 40,
        alpha = 0,
        i = x = y = 0, w = olddata.width, h = olddata.height;


    var cuadricula = new Int8Array(h*w);


    for (i = 0; i < len; i += 4) {
        newpx[i+0] = 0;
        newpx[i+1] = 255;
        newpx[i+2] = 0;

        alpha = 255;
        if (distance3(bs3, oldpx, i) < epsilon) {
            alpha -= 150;
        }
        if (distance3(bs2, oldpx, i) < epsilon) {
            alpha -= 50;
        }
        if (distance3(bs1, oldpx, i) < epsilon) {
            alpha -= 35;
        }
        if (distance3(bs0, oldpx, i) < epsilon) {
            alpha -= 20;
        }
        newpx[i+3] = alpha*0.2;

        x = (i/4) % w;
        y = parseInt((i/4) / w);
        if ((!(x % 5) && !(y % 5)) && alpha > 255-epsilon) {
            newpx[i+0] = 255;
            newpx[i+1] = 0;
            newpx[i+2] = 0;
            newpx[i+3] = 0;
            cuadricula[y*w +x] = 1;
        }
    }

    this.setData(newdata);

    var minx = HV = 99999999,
        maxx = LV = -1;
    for (y = 0; y < h; y++) {
        minx = HV;
        maxx = LV;
        for (x = 0; x < w; x++) {
            i = y*w + x; j = i*4;
            if (cuadricula[i]) {
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
            markPoint(this.context, minx, y);
        }

        if (maxx !== LV) {
            i = y*w + maxx, j = i*4;
            newpx[j+0] = 0;
            newpx[j+1] = 0;
            newpx[j+2] = 255;
            newpx[j+3] = 255;
            markPoint(this.context, maxx, y);
        }
    }

};

var markPoint = function (context, x, y) {
    var radius = 1;
    context.beginPath();
    context.arc(x, y, radius, 0, 2 * Math.PI, false);
    context.fillStyle = '#fff';
    context.fill();
    context.lineWidth = 0;
    context.strokeStyle = '#fff';
    context.stroke();
};

var transformadores = [
    new CanvasImage($('canvas1'), 'color-bars.png'),
    new CanvasImage($('canvas2'), 'color-bars.png'),
];


