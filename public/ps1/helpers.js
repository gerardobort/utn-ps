
var CanvasHelper = {};
CanvasHelper.createImageData = function (width, height) {
    return document
        .createElement('canvas')
        .getContext('2d')
        .createImageData(width, height);
}

/*
 * class Convolution
 */
var Convolution = {};
Convolution.Matrix3 = {};
Convolution.Matrix3.BLUR = [ 1/9, 1/9, 1/9,
                             1/9, 1/9, 1/9,
                             1/9, 1/9, 1/9 ];
Convolution.Matrix3.BLUR5 = [ 1/25, 1/25, 1/25, 1/25, 1/25,
                              1/25, 1/25, 1/25, 1/25, 1/25,
                              1/25, 1/25, 1/25, 1/25, 1/25,
                              1/25, 1/25, 1/25, 1/25, 1/25,
                              1/25, 1/25, 1/25, 1/25, 1/25 ];
Convolution.Matrix3.SHARPEN = [  0, -1,  0,
                                -1,  5, -1,
                                 0, -1,  0 ];
Convolution.Matrix3.EDGE_DETECTION = [  0,  1,  0,
                                        1, -3,  1,
                                        0,  1,  0 ];
Convolution.Matrix3.CUSTOM = [  0,  0,  0,
                               -1,  1,  0,
                                0,  0,  0 ];
Convolution.Matrix3.convoluteImageData = function(imageData, matrix3, opaque) {
    var side = Math.round(Math.sqrt(matrix3.length)),
        halfSide = Math.floor(side/2),
        data = imageData.data,
        sw = imageData.width,
        sh = imageData.height,
        // pad output by the convolution matrix
        w = sw,
        h = sh,
        output = CanvasHelper.createImageData(w, h),
        newData = output.data,
        // go through the destination image pixels
        alphaFac = opaque ? 1 : 0;
    for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
            var sy = y;
            var sx = x;
            var newDataOff = (y*w + x)*4;
            // calculate the weighed sum of the source image pixels that
            // fall under the convolution matrix
            var r = 0, g = 0, b = 0, a = 0;
            for (var cy = 0; cy < side; cy++) {
                for (var cx = 0; cx < side; cx++) {
                    var scy = sy + cy - halfSide;
                    var scx = sx + cx - halfSide;
                    if (scy >= 0 && scy < sh && scx >= 0 && scx < sw) {
                        var dataOff = (scy*sw + scx)*4;
                        var wt = matrix3[cy*side + cx];
                        r += data[dataOff] * wt;
                        g += data[dataOff+1] * wt;
                        b += data[dataOff+2] * wt;
                        a += data[dataOff+3] * wt;
                    }
                }
            }
            newData[newDataOff] = r;
            newData[newDataOff+1] = g;
            newData[newDataOff+2] = b;
            newData[newDataOff+3] = a + alphaFac*(255 - a);
        }
    }
    return output;
};


/*
 * class Filter
 */
var Filter = {};
Filter.grayscale = function (imageData, args) {
    var data = imageData.data;
    for (var i = 0, l = data.length; i < l; i += 4) {
        var r = data[i],
            g = data[i+1],
            b = data[i+2];
        // CIE luminance for the RGB
        // The human eye is bad at seeing red and blue, so we de-emphasize them.
        var v = 0.2126*r + 0.7152*g + 0.0722*b;
        data[i] = data[i+1] = data[i+2] = v;
    }
    return imageData;
};
Filter.brightness = function (imageData, adjustment) {
    var data = imageData.data;
    adjustment = adjustment||80;
    for (var i = 0, l = data.length; i < l; i += 4) {
        data[i] += adjustment;
        data[i+1] += adjustment;
        data[i+2] += adjustment;
    }
    return imageData;
};
Filter.fluorescense = function (imageData, coeficient) {
    var data = imageData.data;
    coeficient = coeficient||3;
    for (var i = 0, l = data.length; i < l; i += 4) {
        data[i] *= coeficient;
        data[i+1] *= coeficient;
        data[i+2] *= coeficient;
    }
    return imageData;
};
Filter.threshold = function (imageData, threshold) {
    var data = imageData.data;
    threshold = threshold||30;
    for (var i = 0, l = data.length; i < l; i += 4) {
        var r = data[i],
            g = data[i+1],
            b = data[i+2],
            v = (0.2126*r + 0.7152*g + 0.0722*b >= threshold) ? 255 : 0;
        data[i] = data[i+1] = data[i+2] = v;
    }
    return imageData;
};
Filter.blur = function (imageData) {
    var blurred = Convolution.Matrix3.convoluteImageData(imageData, Convolution.Matrix3.BLUR);

    var data = imageData.data;
    for (var i = 0; i < data.length; i+=4) {
        data[i  ] = Math.abs(blurred.data[i]);
        data[i+1] = Math.abs(blurred.data[i+1]);
        data[i+2] = Math.abs(blurred.data[i+2]);
        data[i+3] = 255; // opaque alpha
    }

    return imageData;
}
Filter.sobel = function (imageData) {
    Filter.grayscale(imageData);
    var vertical = Convolution.Matrix3.convoluteImageData(imageData,
          [  0, 0, 0,
             1,-1, 0,
             0, 0, 0 ]);
    var horizontal = Convolution.Matrix3.convoluteImageData(imageData,
          [  0,  1,  0,
             0, -1,  0,
             0,  0,  0 ]);

    var data = imageData.data;
    for (var i = 0; i < data.length; i+=4) {
          // make the vertical gradient red
          var v = Math.abs(vertical.data[i]);
          data[i] = 255 - v;
          // make the horizontal gradient green
          var h = Math.abs(horizontal.data[i]);
          data[i+1] = 255 - h;
          // and mix in some blue for aesthetics
          data[i+2] = 255 - (v+h)/4;
          data[i+3] = 255; // opaque alpha
    }

    return imageData;
}
Filter.sobel2 = function (imageData) {
    Filter.grayscale(imageData);

    var vertical = Convolution.Matrix3.convoluteImageData(imageData,
          [  0, 0, 0, 0, 0,
             0, 0, 0, 0, 0,
             2, 2,-4, 0, 0,
             0, 0, 0, 0, 0,
             0, 0, 0, 0, 0 ]);
    var horizontal = Convolution.Matrix3.convoluteImageData(imageData,
          [  0, 0, 2, 0, 0,
             0, 0, 2, 0, 0,
             0, 0,-4, 0, 0,
             0, 0, 0, 0, 0,
             0, 0, 0, 0, 0 ]);

    var data = imageData.data;
    for (var i = 0; i < data.length; i+=4) {
          // make the vertical gradient red
          var v = Math.abs(vertical.data[i]);
          data[i] = 255 - v;
          // make the horizontal gradient green
          var h = Math.abs(horizontal.data[i]);
          data[i+1] = 255 - h;
          // and mix in some blue for aesthetics
          data[i+2] = 255 - (v+h)/4;
          data[i+3] = Math.abs((v+h)/4); // semi-opaque alpha
    }

    return imageData;
}
Filter.shapeDetector = function (imageData) {
    Filter.sobel2(imageData);

    var data = imageData.data,
        w = imageData.width,
        h = imageData.height;
    for (var i = 1; i < h-2; i+=1) { // row
        for (var j = 0; j < w*4; j+=4) { // col
            data[j+ i*w*4   ] = 255;
            data[j+ i*w*4 +1] = 255;
            data[j+ i*w*4 +2] = 255;
            //data[j+ i*w*4 +3] = 255;
        }
    }

    return imageData;
}
