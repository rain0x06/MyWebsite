/*
MIT License

Copyright (c) 2017 Pavel Dobryakov

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

"use strict";

const canvas = document.getElementsByTagName("canvas")[0];
resizeCanvas();

let config = {
  SIM_RESOLUTION: 64,
  DYE_RESOLUTION: 512,
  CAPTURE_RESOLUTION: 512,
  DENSITY_DISSIPATION: 1.35,
  VELOCITY_DISSIPATION: 0.55,
  PRESSURE: 0.8,
  PRESSURE_ITERATIONS: 12,
  CURL: 6,
  SPLAT_RADIUS: 0.18,
  SPLAT_FORCE: 4200,
  SHADING: true,
  COLORFUL: true,
  COLOR_UPDATE_SPEED: 10,
  PAUSED: false,
  BACK_COLOR: { r: 0, g: 0, b: 0 },
  TRANSPARENT: false,
  BLOOM: false,
  BLOOM_ITERATIONS: 4,
  BLOOM_RESOLUTION: 128,
  BLOOM_INTENSITY: 0.25,
  BLOOM_THRESHOLD: 0.6,
  BLOOM_SOFT_KNEE: 0.7,
  SUNRAYS: false,
  SUNRAYS_RESOLUTION: 196,
  SUNRAYS_WEIGHT: 0.35,
  MOUSE_FORCE_MULTIPLIER: 0.75,
  BEAT_SENSITIVITY: 1.65,
  VOCAL_DANCE_AMOUNT: 0.55,
  VOCAL_SENSITIVITY: 0.65,
  SWAY_SPEED: 0.12,
  SWAY_RADIUS: 0.12,
  BASS_SWAY_AMOUNT: 0.7,
  SWIRL_RESPONSE: 0.16,
  BUBBLE_INTENSITY: 0.68,
  VOCAL_PITCH_REACTIVITY: 1,
  BPM_BUBBLE_REACTIVITY: 1,
  SMOKE_RING_POINTS: 7,
  SMOKE_RING_RADIUS: 0.02,
  BUBBLE_SPEED: 0.72,
  BUBBLE_TRAIL: 0.16,
  MAX_AUDIO_BUBBLES: 12,
  AMBIENT_IDLE_SPLATS: true,
  AUDIO_BIAS_TO_CURSOR: true,
  KICK_LOW_HZ: 20,
  KICK_HIGH_HZ: 150,
  BASS_LOW_HZ: 150,
  BASS_HIGH_HZ: 400,
  VOCAL_LOW_HZ: 300,
  VOCAL_HIGH_HZ: 3400,
  PRESENCE_LOW_HZ: 4000,
  PRESENCE_HIGH_HZ: 10000,
  CUSTOM_COLOR: false,
};

var timer = setInterval(randomSplat, 3500);
var _runRandom = true;
let audioRuntime = null;
let baseCurl = config.CURL;
let baseColorUpdateSpeed = config.COLOR_UPDATE_SPEED;
let baseBloomIntensity = config.BLOOM_INTENSITY;
let baseSplatRadius = config.SPLAT_RADIUS;
let audioBubbles = [];
let lastBubbleAngle = Math.random() * Math.PI * 2;
let audioVisualState = {
  kick: 0,
  bass: 0,
  presence: 0,
  vocal: 0,
  pitch: 0.5,
  pitchDelta: 0,
  bpm: 0,
  rms: 0,
  time: 0,
  swayX: 0.5,
  swayY: 0.5,
  spawnIndex: 0,
  activeBubbles: 0,
};

function randomSplat() {
  if (_runRandom && config.AMBIENT_IDLE_SPLATS) splatStack.push(parseInt(Math.random() * 5) + 3);
}

let colorRange = ["#FF0000","#FF0001"];
let colorConfig = null;
let splatRadiusModulationEnabled = false;

function hexToRgb(hex) {
  let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

function RGBtoHSV(r, g, b) {
    if (arguments.length === 1) {
        g = r.g, b = r.b, r = r.r;
    }
    var max = Math.max(r, g, b), min = Math.min(r, g, b),
        d = max - min,
        h,
        s = (max === 0 ? 0 : d / max),
        v = max / 255;

    switch (max) {
        case min: h = 0; break;
        case r: h = (g - b) + d * (g < b ? 6: 0); h /= 6 * d; break;
        case g: h = (b - r) + d * 2; h /= 6 * d; break;
        case b: h = (r - g) + d * 4; h /= 6 * d; break;
    }

    return {
        h: h,
        s: s,
        v: v
    };
}

function pointerPrototype() {
  this.id = -1;
  this.texcoordX = 0;
  this.texcoordY = 0;
  this.prevTexcoordX = 0;
  this.prevTexcoordY = 0;
  this.deltaX = 0;
  this.deltaY = 0;
  this.down = false;
  this.moved = false;
  this.color = [30, 0, 300];
}

let pointers = [];
let splatStack = [];
pointers.push(new pointerPrototype());

const { gl, ext } = getWebGLContext(canvas);

if (isMobile()) {
  config.DYE_RESOLUTION = 512;
}
if (!ext.supportLinearFiltering) {
  config.DYE_RESOLUTION = 512;
  config.SHADING = false;
  config.BLOOM = false;
  config.SUNRAYS = false;
}

function getWebGLContext(canvas) {
  const params = { alpha: true, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: false };

  let gl = canvas.getContext("webgl2", params);
  const isWebGL2 = !!gl;
  if (!isWebGL2) gl = canvas.getContext("webgl", params) || canvas.getContext("experimental-webgl", params);

  let halfFloat;
  let supportLinearFiltering;
  if (isWebGL2) {
    gl.getExtension("EXT_color_buffer_float");
    supportLinearFiltering = gl.getExtension("OES_texture_float_linear");
  } else {
    halfFloat = gl.getExtension("OES_texture_half_float");
    supportLinearFiltering = gl.getExtension("OES_texture_half_float_linear");
  }

  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  const halfFloatTexType = isWebGL2 ? gl.HALF_FLOAT : halfFloat.HALF_FLOAT_OES;
  let formatRGBA;
  let formatRG;
  let formatR;

  if (isWebGL2) {
    formatRGBA = getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, halfFloatTexType);
    formatRG = getSupportedFormat(gl, gl.RG16F, gl.RG, halfFloatTexType);
    formatR = getSupportedFormat(gl, gl.R16F, gl.RED, halfFloatTexType);
  } else {
    formatRGBA = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
    formatRG = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
    formatR = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
  }

  return {
    gl,
    ext: {
      formatRGBA,
      formatRG,
      formatR,
      halfFloatTexType,
      supportLinearFiltering,
    },
  };
}

function getSupportedFormat(gl, internalFormat, format, type) {
  if (!supportRenderTextureFormat(gl, internalFormat, format, type)) {
    switch (internalFormat) {
      case gl.R16F:
        return getSupportedFormat(gl, gl.RG16F, gl.RG, type);
      case gl.RG16F:
        return getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, type);
      default:
        return null;
    }
  }

  return {
    internalFormat,
    format,
  };
}

function supportRenderTextureFormat(gl, internalFormat, format, type) {
  let texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);

  let fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  return status == gl.FRAMEBUFFER_COMPLETE;
}

function isMobile() {
  return /Mobi|Android/i.test(navigator.userAgent);
}

function captureScreenshot() {
  let res = getResolution(config.CAPTURE_RESOLUTION);
  let target = createFBO(
    res.width,
    res.height,
    ext.formatRGBA.internalFormat,
    ext.formatRGBA.format,
    ext.halfFloatTexType,
    gl.NEAREST
  );
  render(target);

  let texture = framebufferToTexture(target);
  texture = normalizeTexture(texture, target.width, target.height);

  let captureCanvas = textureToCanvas(texture, target.width, target.height);
  let datauri = captureCanvas.toDataURL();
  downloadURI("fluid.png", datauri);
  URL.revokeObjectURL(datauri);
}

function framebufferToTexture(target) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
  let length = target.width * target.height * 4;
  let texture = new Float32Array(length);
  gl.readPixels(0, 0, target.width, target.height, gl.RGBA, gl.FLOAT, texture);
  return texture;
}

function normalizeTexture(texture, width, height) {
  let result = new Uint8Array(texture.length);
  let id = 0;
  for (let i = height - 1; i >= 0; i--) {
    for (let j = 0; j < width; j++) {
      let nid = i * width * 4 + j * 4;
      result[nid + 0] = clamp01(texture[id + 0]) * 255;
      result[nid + 1] = clamp01(texture[id + 1]) * 255;
      result[nid + 2] = clamp01(texture[id + 2]) * 255;
      result[nid + 3] = clamp01(texture[id + 3]) * 255;
      id += 4;
    }
  }
  return result;
}

function clamp01(input) {
  return Math.min(Math.max(input, 0), 1);
}

function textureToCanvas(texture, width, height) {
  let captureCanvas = document.createElement("canvas");
  let ctx = captureCanvas.getContext("2d");
  captureCanvas.width = width;
  captureCanvas.height = height;

  let imageData = ctx.createImageData(width, height);
  imageData.data.set(texture);
  ctx.putImageData(imageData, 0, 0);

  return captureCanvas;
}

function downloadURI(filename, uri) {
  let link = document.createElement("a");
  link.download = filename;
  link.href = uri;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

class Material {
  constructor(vertexShader, fragmentShaderSource) {
    this.vertexShader = vertexShader;
    this.fragmentShaderSource = fragmentShaderSource;
    this.programs = [];
    this.activeProgram = null;
    this.uniforms = [];
  }

  setKeywords(keywords) {
    let hash = 0;
    for (let i = 0; i < keywords.length; i++) hash += hashCode(keywords[i]);

    let program = this.programs[hash];
    if (program == null) {
      let fragmentShader = compileShader(gl.FRAGMENT_SHADER, this.fragmentShaderSource, keywords);
      program = createProgram(this.vertexShader, fragmentShader);
      this.programs[hash] = program;
    }

    if (program == this.activeProgram) return;

    this.uniforms = getUniforms(program);
    this.activeProgram = program;
  }

  bind() {
    gl.useProgram(this.activeProgram);
  }
}

class Program {
  constructor(vertexShader, fragmentShader) {
    this.uniforms = {};
    this.program = createProgram(vertexShader, fragmentShader);
    this.uniforms = getUniforms(this.program);
  }

  bind() {
    gl.useProgram(this.program);
  }
}

function createProgram(vertexShader, fragmentShader) {
  let program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw gl.getProgramInfoLog(program);

  return program;
}

function getUniforms(program) {
  let uniforms = [];
  let uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < uniformCount; i++) {
    let uniformName = gl.getActiveUniform(program, i).name;
    uniforms[uniformName] = gl.getUniformLocation(program, uniformName);
  }
  return uniforms;
}

function compileShader(type, source, keywords) {
  source = addKeywords(source, keywords);

  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw gl.getShaderInfoLog(shader);

  return shader;
}

function addKeywords(source, keywords) {
  if (keywords == null) return source;
  let keywordsString = "";
  keywords.forEach((keyword) => {
    keywordsString += "#define " + keyword + "\n";
  });
  return keywordsString + source;
}

const baseVertexShader = compileShader(
  gl.VERTEX_SHADER,
  `
    precision highp float;

    attribute vec2 aPosition;
    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform vec2 texelSize;

    void main () {
        vUv = aPosition * 0.5 + 0.5;
        vL = vUv - vec2(texelSize.x, 0.0);
        vR = vUv + vec2(texelSize.x, 0.0);
        vT = vUv + vec2(0.0, texelSize.y);
        vB = vUv - vec2(0.0, texelSize.y);
        gl_Position = vec4(aPosition, 0.0, 1.0);
    }
`
);

const blurVertexShader = compileShader(
  gl.VERTEX_SHADER,
  `
    precision highp float;

    attribute vec2 aPosition;
    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    uniform vec2 texelSize;

    void main () {
        vUv = aPosition * 0.5 + 0.5;
        float offset = 1.33333333;
        vL = vUv - texelSize * offset;
        vR = vUv + texelSize * offset;
        gl_Position = vec4(aPosition, 0.0, 1.0);
    }
`
);

const blurShader = compileShader(
  gl.FRAGMENT_SHADER,
  `
    precision mediump float;
    precision mediump sampler2D;

    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    uniform sampler2D uTexture;

    void main () {
        vec4 sum = texture2D(uTexture, vUv) * 0.29411764;
        sum += texture2D(uTexture, vL) * 0.35294117;
        sum += texture2D(uTexture, vR) * 0.35294117;
        gl_FragColor = sum;
    }
`
);

const copyShader = compileShader(
  gl.FRAGMENT_SHADER,
  `
    precision mediump float;
    precision mediump sampler2D;

    varying highp vec2 vUv;
    uniform sampler2D uTexture;

    void main () {
        gl_FragColor = texture2D(uTexture, vUv);
    }
`
);

const clearShader = compileShader(
  gl.FRAGMENT_SHADER,
  `
    precision mediump float;
    precision mediump sampler2D;

    varying highp vec2 vUv;
    uniform sampler2D uTexture;
    uniform float value;

    void main () {
        gl_FragColor = value * texture2D(uTexture, vUv);
    }
`
);

const colorShader = compileShader(
  gl.FRAGMENT_SHADER,
  `
    precision mediump float;

    uniform vec4 color;

    void main () {
        gl_FragColor = color;
    }
`
);

const checkerboardShader = compileShader(
  gl.FRAGMENT_SHADER,
  `
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform float aspectRatio;

    #define SCALE 25.0

    void main () {
        vec2 uv = floor(vUv * SCALE * vec2(aspectRatio, 1.0));
        float v = mod(uv.x + uv.y, 2.0);
        v = v * 0.1 + 0.8;
        gl_FragColor = vec4(vec3(v), 1.0);
    }
`
);

const displayShaderSource = `
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uTexture;
    uniform sampler2D uBloom;
    uniform sampler2D uSunrays;
    uniform sampler2D uDithering;
    uniform vec2 ditherScale;
    uniform vec2 texelSize;

    vec3 linearToGamma (vec3 color) {
        color = max(color, vec3(0));
        return max(1.055 * pow(color, vec3(0.416666667)) - 0.055, vec3(0));
    }

    void main () {
        vec3 c = texture2D(uTexture, vUv).rgb;

    #ifdef SHADING
        vec3 lc = texture2D(uTexture, vL).rgb;
        vec3 rc = texture2D(uTexture, vR).rgb;
        vec3 tc = texture2D(uTexture, vT).rgb;
        vec3 bc = texture2D(uTexture, vB).rgb;

        float dx = length(rc) - length(lc);
        float dy = length(tc) - length(bc);

        vec3 n = normalize(vec3(dx, dy, length(texelSize)));
        vec3 l = vec3(0.0, 0.0, 1.0);

        float diffuse = clamp(dot(n, l) + 0.7, 0.7, 1.0);
        c *= diffuse;
    #endif

    #ifdef BLOOM
        vec3 bloom = texture2D(uBloom, vUv).rgb;
    #endif

    #ifdef SUNRAYS
        float sunrays = texture2D(uSunrays, vUv).r;
        c *= sunrays;
    #ifdef BLOOM
        bloom *= sunrays;
    #endif
    #endif

    #ifdef BLOOM
        float noise = texture2D(uDithering, vUv * ditherScale).r;
        noise = noise * 2.0 - 1.0;
        bloom += noise / 255.0;
        bloom = linearToGamma(bloom);
        c += bloom;
    #endif

        float a = max(c.r, max(c.g, c.b));
        gl_FragColor = vec4(c, a);
    }
`;

const bloomPrefilterShader = compileShader(
  gl.FRAGMENT_SHADER,
  `
    precision mediump float;
    precision mediump sampler2D;

    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform vec3 curve;
    uniform float threshold;

    void main () {
        vec3 c = texture2D(uTexture, vUv).rgb;
        float br = max(c.r, max(c.g, c.b));
        float rq = clamp(br - curve.x, 0.0, curve.y);
        rq = curve.z * rq * rq;
        c *= max(rq, br - threshold) / max(br, 0.0001);
        gl_FragColor = vec4(c, 0.0);
    }
`
);

const bloomBlurShader = compileShader(
  gl.FRAGMENT_SHADER,
  `
    precision mediump float;
    precision mediump sampler2D;

    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uTexture;

    void main () {
        vec4 sum = vec4(0.0);
        sum += texture2D(uTexture, vL);
        sum += texture2D(uTexture, vR);
        sum += texture2D(uTexture, vT);
        sum += texture2D(uTexture, vB);
        sum *= 0.25;
        gl_FragColor = sum;
    }
`
);

const bloomFinalShader = compileShader(
  gl.FRAGMENT_SHADER,
  `
    precision mediump float;
    precision mediump sampler2D;

    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uTexture;
    uniform float intensity;

    void main () {
        vec4 sum = vec4(0.0);
        sum += texture2D(uTexture, vL);
        sum += texture2D(uTexture, vR);
        sum += texture2D(uTexture, vT);
        sum += texture2D(uTexture, vB);
        sum *= 0.25;
        gl_FragColor = sum * intensity;
    }
`
);

const sunraysMaskShader = compileShader(
  gl.FRAGMENT_SHADER,
  `
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    uniform sampler2D uTexture;

    void main () {
        vec4 c = texture2D(uTexture, vUv);
        float br = max(c.r, max(c.g, c.b));
        c.a = 1.0 - min(max(br * 20.0, 0.0), 0.8);
        gl_FragColor = c;
    }
`
);

const sunraysShader = compileShader(
  gl.FRAGMENT_SHADER,
  `
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform float weight;

    #define ITERATIONS 16

    void main () {
        float Density = 0.3;
        float Decay = 0.95;
        float Exposure = 0.7;

        vec2 coord = vUv;
        vec2 dir = vUv - 0.5;

        dir *= 1.0 / float(ITERATIONS) * Density;
        float illuminationDecay = 1.0;

        float color = texture2D(uTexture, vUv).a;

        for (int i = 0; i < ITERATIONS; i++)
        {
            coord -= dir;
            float col = texture2D(uTexture, coord).a;
            color += col * illuminationDecay * weight;
            illuminationDecay *= Decay;
        }

        gl_FragColor = vec4(color * Exposure, 0.0, 0.0, 1.0);
    }
`
);

const splatShader = compileShader(
  gl.FRAGMENT_SHADER,
  `
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    uniform sampler2D uTarget;
    uniform float aspectRatio;
    uniform vec3 color;
    uniform vec2 point;
    uniform float radius;

    void main () {
        vec2 p = vUv - point.xy;
        p.x *= aspectRatio;
        vec3 splat = exp(-dot(p, p) / radius) * color;
        vec3 base = texture2D(uTarget, vUv).xyz;
        gl_FragColor = vec4(base + splat, 1.0);
    }
`
);

const advectionShader = compileShader(
  gl.FRAGMENT_SHADER,
  `
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    uniform sampler2D uVelocity;
    uniform sampler2D uSource;
    uniform vec2 texelSize;
    uniform vec2 dyeTexelSize;
    uniform float dt;
    uniform float dissipation;

    vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
        vec2 st = uv / tsize - 0.5;

        vec2 iuv = floor(st);
        vec2 fuv = fract(st);

        vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
        vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
        vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
        vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);

        return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
    }

    void main () {
    #ifdef MANUAL_FILTERING
        vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
        vec4 result = bilerp(uSource, coord, dyeTexelSize);
    #else
        vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
        vec4 result = texture2D(uSource, coord);
    #endif
        float decay = 1.0 + dissipation * dt;
        gl_FragColor = result / decay;
    }`,
  ext.supportLinearFiltering ? null : ["MANUAL_FILTERING"]
);

const divergenceShader = compileShader(
  gl.FRAGMENT_SHADER,
  `
    precision mediump float;
    precision mediump sampler2D;

    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uVelocity;

    void main () {
        float L = texture2D(uVelocity, vL).x;
        float R = texture2D(uVelocity, vR).x;
        float T = texture2D(uVelocity, vT).y;
        float B = texture2D(uVelocity, vB).y;

        vec2 C = texture2D(uVelocity, vUv).xy;
        if (vL.x < 0.0) { L = -C.x; }
        if (vR.x > 1.0) { R = -C.x; }
        if (vT.y > 1.0) { T = -C.y; }
        if (vB.y < 0.0) { B = -C.y; }

        float div = 0.5 * (R - L + T - B);
        gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
    }
`
);

const curlShader = compileShader(
  gl.FRAGMENT_SHADER,
  `
    precision mediump float;
    precision mediump sampler2D;

    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uVelocity;

    void main () {
        float L = texture2D(uVelocity, vL).y;
        float R = texture2D(uVelocity, vR).y;
        float T = texture2D(uVelocity, vT).x;
        float B = texture2D(uVelocity, vB).x;
        float vorticity = R - L - T + B;
        gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
    }
`
);

const vorticityShader = compileShader(
  gl.FRAGMENT_SHADER,
  `
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uVelocity;
    uniform sampler2D uCurl;
    uniform float curl;
    uniform float dt;

    void main () {
        float L = texture2D(uCurl, vL).x;
        float R = texture2D(uCurl, vR).x;
        float T = texture2D(uCurl, vT).x;
        float B = texture2D(uCurl, vB).x;
        float C = texture2D(uCurl, vUv).x;

        vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
        force /= length(force) + 0.0001;
        force *= curl * C;
        force.y *= -1.0;

        vec2 vel = texture2D(uVelocity, vUv).xy;
        gl_FragColor = vec4(vel + force * dt, 0.0, 1.0);
    }
`
);

const pressureShader = compileShader(
  gl.FRAGMENT_SHADER,
  `
    precision mediump float;
    precision mediump sampler2D;

    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uPressure;
    uniform sampler2D uDivergence;

    void main () {
        float L = texture2D(uPressure, vL).x;
        float R = texture2D(uPressure, vR).x;
        float T = texture2D(uPressure, vT).x;
        float B = texture2D(uPressure, vB).x;
        float C = texture2D(uPressure, vUv).x;
        float divergence = texture2D(uDivergence, vUv).x;
        float pressure = (L + R + B + T - divergence) * 0.25;
        gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
    }
`
);

const gradientSubtractShader = compileShader(
  gl.FRAGMENT_SHADER,
  `
    precision mediump float;
    precision mediump sampler2D;

    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uPressure;
    uniform sampler2D uVelocity;

    void main () {
        float L = texture2D(uPressure, vL).x;
        float R = texture2D(uPressure, vR).x;
        float T = texture2D(uPressure, vT).x;
        float B = texture2D(uPressure, vB).x;
        vec2 velocity = texture2D(uVelocity, vUv).xy;
        velocity.xy -= vec2(R - L, T - B);
        gl_FragColor = vec4(velocity, 0.0, 1.0);
    }
`
);

const blit = (() => {
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(0);

  return (destination) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, destination);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  };
})();

let dye;
let velocity;
let divergence;
let curl;
let pressure;
let bloom;
let bloomFramebuffers = [];
let sunrays;
let sunraysTemp;

let ditheringTexture = createTextureAsync("js/LDR_LLL1_0.png");

const blurProgram = new Program(blurVertexShader, blurShader);
const copyProgram = new Program(baseVertexShader, copyShader);
const clearProgram = new Program(baseVertexShader, clearShader);
const colorProgram = new Program(baseVertexShader, colorShader);
const checkerboardProgram = new Program(baseVertexShader, checkerboardShader);
const bloomPrefilterProgram = new Program(baseVertexShader, bloomPrefilterShader);
const bloomBlurProgram = new Program(baseVertexShader, bloomBlurShader);
const bloomFinalProgram = new Program(baseVertexShader, bloomFinalShader);
const sunraysMaskProgram = new Program(baseVertexShader, sunraysMaskShader);
const sunraysProgram = new Program(baseVertexShader, sunraysShader);
const splatProgram = new Program(baseVertexShader, splatShader);
const advectionProgram = new Program(baseVertexShader, advectionShader);
const divergenceProgram = new Program(baseVertexShader, divergenceShader);
const curlProgram = new Program(baseVertexShader, curlShader);
const vorticityProgram = new Program(baseVertexShader, vorticityShader);
const pressureProgram = new Program(baseVertexShader, pressureShader);
const gradienSubtractProgram = new Program(baseVertexShader, gradientSubtractShader);

const displayMaterial = new Material(baseVertexShader, displayShaderSource);

function initFramebuffers() {
  let simRes = getResolution(config.SIM_RESOLUTION);
  let dyeRes = getResolution(config.DYE_RESOLUTION);

  const texType = ext.halfFloatTexType;
  const rgba = ext.formatRGBA;
  const rg = ext.formatRG;
  const r = ext.formatR;
  const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

  if (dye == null)
    dye = createDoubleFBO(dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering);
  else dye = resizeDoubleFBO(dye, dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering);

  if (velocity == null)
    velocity = createDoubleFBO(simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering);
  else
    velocity = resizeDoubleFBO(velocity, simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering);

  divergence = createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
  curl = createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
  pressure = createDoubleFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);

  if (config.BLOOM) initBloomFramebuffers();
  else {
    bloom = null;
    bloomFramebuffers.length = 0;
  }

  if (config.SUNRAYS) initSunraysFramebuffers();
  else {
    sunrays = null;
    sunraysTemp = null;
  }
}

function initBloomFramebuffers() {
  let res = getResolution(config.BLOOM_RESOLUTION);

  const texType = ext.halfFloatTexType;
  const rgba = ext.formatRGBA;
  const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

  bloom = createFBO(res.width, res.height, rgba.internalFormat, rgba.format, texType, filtering);

  bloomFramebuffers.length = 0;
  for (let i = 0; i < config.BLOOM_ITERATIONS; i++) {
    let width = res.width >> (i + 1);
    let height = res.height >> (i + 1);

    if (width < 2 || height < 2) break;

    let fbo = createFBO(width, height, rgba.internalFormat, rgba.format, texType, filtering);
    bloomFramebuffers.push(fbo);
  }
}

function initSunraysFramebuffers() {
  let res = getResolution(config.SUNRAYS_RESOLUTION);

  const texType = ext.halfFloatTexType;
  const r = ext.formatR;
  const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

  sunrays = createFBO(res.width, res.height, r.internalFormat, r.format, texType, filtering);
  sunraysTemp = createFBO(res.width, res.height, r.internalFormat, r.format, texType, filtering);
}

function createFBO(w, h, internalFormat, format, type, param) {
  gl.activeTexture(gl.TEXTURE0);
  let texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);

  let fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  gl.viewport(0, 0, w, h);
  gl.clear(gl.COLOR_BUFFER_BIT);

  let texelSizeX = 1.0 / w;
  let texelSizeY = 1.0 / h;

  return {
    texture,
    fbo,
    width: w,
    height: h,
    texelSizeX,
    texelSizeY,
    attach(id) {
      gl.activeTexture(gl.TEXTURE0 + id);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      return id;
    },
  };
}

function createDoubleFBO(w, h, internalFormat, format, type, param) {
  let fbo1 = createFBO(w, h, internalFormat, format, type, param);
  let fbo2 = createFBO(w, h, internalFormat, format, type, param);

  return {
    width: w,
    height: h,
    texelSizeX: fbo1.texelSizeX,
    texelSizeY: fbo1.texelSizeY,
    get read() {
      return fbo1;
    },
    set read(value) {
      fbo1 = value;
    },
    get write() {
      return fbo2;
    },
    set write(value) {
      fbo2 = value;
    },
    swap() {
      let temp = fbo1;
      fbo1 = fbo2;
      fbo2 = temp;
    },
  };
}

function resizeFBO(target, w, h, internalFormat, format, type, param) {
  let newFBO = createFBO(w, h, internalFormat, format, type, param);
  copyProgram.bind();
  gl.uniform1i(copyProgram.uniforms.uTexture, target.attach(0));
  blit(newFBO.fbo);
  return newFBO;
}

function resizeDoubleFBO(target, w, h, internalFormat, format, type, param) {
  if (target.width == w && target.height == h) return target;
  target.read = resizeFBO(target.read, w, h, internalFormat, format, type, param);
  target.write = createFBO(w, h, internalFormat, format, type, param);
  target.width = w;
  target.height = h;
  target.texelSizeX = 1.0 / w;
  target.texelSizeY = 1.0 / h;
  return target;
}

function createTextureAsync(url) {
  let texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255]));

  let obj = {
    texture,
    width: 1,
    height: 1,
    attach(id) {
      gl.activeTexture(gl.TEXTURE0 + id);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      return id;
    },
  };

  let image = new Image();
  image.onload = () => {
    obj.width = image.width;
    obj.height = image.height;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
  };
  image.src = url;

  return obj;
}

function updateKeywords() {
  let displayKeywords = [];
  if (config.SHADING) displayKeywords.push("SHADING");
  if (config.BLOOM) displayKeywords.push("BLOOM");
  if (config.SUNRAYS) displayKeywords.push("SUNRAYS");
  displayMaterial.setKeywords(displayKeywords);
}

updateKeywords();
initFramebuffers();
multipleSplats(1);

let lastUpdateTime = Date.now();
let colorUpdateTimer = 0.0;
update();

function update() {
  const dt = calcDeltaTime();
  if (resizeCanvas()) initFramebuffers();
  updateColors(dt);
  applyInputs(dt);
  if (!config.PAUSED) step(dt);
  render(null);
  requestAnimationFrame(update);
}

function calcDeltaTime() {
  let now = Date.now();
  let dt = (now - lastUpdateTime) / 1000;
  dt = Math.min(dt, 0.016666);
  lastUpdateTime = now;
  return dt;
}

function resizeCanvas() {
  let width = scaleByPixelRatio(canvas.clientWidth);
  let height = scaleByPixelRatio(canvas.clientHeight);
  if (canvas.width != width || canvas.height != height) {
    canvas.width = width;
    canvas.height = height;
    return true;
  }
  return false;
}

function makeOnsetDetector() {
  let fluxHistory = [];
  let prevEnergy = 0;
  let lastBeatTime = 0;

  return function detect(freqData, band, nowMs, sensitivity = 1.5, refractoryMs = 150) {
    let energy = 0;
    for (let i = band[0]; i <= band[1]; i++) energy += freqData[i];
    energy /= band[1] - band[0] + 1;

    const flux = Math.max(0, energy - prevEnergy);
    prevEnergy = energy;

    fluxHistory.push(flux);
    if (fluxHistory.length > 43) fluxHistory.shift();

    const mean = fluxHistory.reduce((a, b) => a + b, 0) / fluxHistory.length;
    const variance = fluxHistory.reduce((a, b) => a + (b - mean) ** 2, 0) / fluxHistory.length;
    const threshold = mean + sensitivity * Math.sqrt(variance);

    if (flux > threshold && flux > 2 && nowMs - lastBeatTime > refractoryMs) {
      lastBeatTime = nowMs;
      return Math.min(3, flux / (threshold || 1));
    }
    return 0;
  };
}

function makeEnvelopeFollower(attackSec = 0.06, releaseSec = 0.25) {
  let value = 0;
  return function update(freqData, band, dt) {
    let energy = 0;
    for (let i = band[0]; i <= band[1]; i++) energy += freqData[i];
    energy = energy / (band[1] - band[0] + 1) / 255;

    const coeff = energy > value
      ? 1 - Math.exp(-dt / attackSec)
      : 1 - Math.exp(-dt / releaseSec);
    value += (energy - value) * coeff;
    return value;
  };
}

function makeRmsFollower(attackSec = 0.08, releaseSec = 0.32) {
  let value = 0;
  return function update(timeData, dt) {
    let sum = 0;
    for (let i = 0; i < timeData.length; i++) {
      const sample = (timeData[i] - 128) / 128;
      sum += sample * sample;
    }
    const energy = Math.sqrt(sum / timeData.length);
    const coeff = energy > value
      ? 1 - Math.exp(-dt / attackSec)
      : 1 - Math.exp(-dt / releaseSec);
    value += (energy - value) * coeff;
    return value;
  };
}

function measureBandCentroid(freqData, band) {
  let total = 0;
  let weighted = 0;
  for (let i = band[0]; i <= band[1]; i++) {
    const energy = freqData[i];
    total += energy;
    weighted += energy * i;
  }

  if (total <= 0) return 0.5;
  const span = Math.max(1, band[1] - band[0]);
  return clamp01((weighted / total - band[0]) / span);
}

function createAudioRuntime(audioEl) {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) {
    document.documentElement.dataset.audioStatus = "unsupported";
    return null;
  }

  const audioCtx = new AudioContextCtor();
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0;

  const source = audioCtx.createMediaElementSource(audioEl);
  source.connect(analyser);
  analyser.connect(audioCtx.destination);

  const runtime = {
    audioEl,
    audioCtx,
    source,
    analyser,
    freqData: new Uint8Array(analyser.frequencyBinCount),
    timeData: new Uint8Array(analyser.fftSize),
    kickDetector: makeOnsetDetector(),
    bassDetector: makeOnsetDetector(),
    presenceDetector: makeOnsetDetector(),
    bassFollower: makeEnvelopeFollower(0.14, 0.7),
    vocalFollower: makeEnvelopeFollower(0.08, 0.42),
    rmsFollower: makeRmsFollower(0.08, 0.32),
    bands: null,
    objectUrl: null,
    lastSway: 0,
    lastPresence: 0,
    lastPitchBubble: 0,
    lastPitchDirection: 0,
    lastPitchValue: 0.5,
    lastKickTime: 0,
    beatIntervalMs: 0,
    nextBeatTime: 0,
    lastGridBubble: 0,
    pitch: 0.5,
    pitchFast: 0.5,
    pitchSlow: 0.5,
  };

  updateAudioBands(runtime);
  document.documentElement.dataset.audioStatus = "ready";
  return runtime;
}

function updateAudioBands(runtime = audioRuntime) {
  if (!runtime) return;
  const hzPerBin = runtime.audioCtx.sampleRate / runtime.analyser.fftSize;
  const binFor = (hz) => Math.min(runtime.freqData.length - 1, Math.max(0, Math.round(hz / hzPerBin)));
  runtime.bands = {
    kick: [binFor(config.KICK_LOW_HZ), binFor(config.KICK_HIGH_HZ)],
    bass: [binFor(config.BASS_LOW_HZ), binFor(config.BASS_HIGH_HZ)],
    vocal: [binFor(config.VOCAL_LOW_HZ), binFor(config.VOCAL_HIGH_HZ)],
    presence: [binFor(config.PRESENCE_LOW_HZ), binFor(config.PRESENCE_HIGH_HZ)],
  };
}

async function startAudioRuntime() {
  if (!audioRuntime) return false;
  await audioRuntime.audioCtx.resume();
  await audioRuntime.audioEl.play();
  _runRandom = false;
  document.documentElement.dataset.audioStatus = "playing";
  return true;
}

function pauseAudioRuntime() {
  if (!audioRuntime) return;
  audioRuntime.audioEl.pause();
  _runRandom = true;
  document.documentElement.dataset.audioStatus = "paused";
}

function setAudioRuntimeSource(src, objectUrl = null) {
  if (!audioRuntime) return;
  if (audioRuntime.objectUrl) URL.revokeObjectURL(audioRuntime.objectUrl);
  audioRuntime.objectUrl = objectUrl;
  audioRuntime.audioEl.src = src;
  audioRuntime.audioEl.load();
  _runRandom = true;
  document.documentElement.dataset.audioStatus = "ready";
}

function fract(value) {
  return value - Math.floor(value);
}

function pointerBiasPosition(cursorWeight = 0.22) {
  const pointer = pointers[0];
  const index = audioVisualState.spawnIndex++;
  const pos = {
    x: 0.08 + 0.84 * fract(index * 0.754877666 + Math.random() * 0.21),
    y: 0.1 + 0.8 * fract(index * 0.569840291 + Math.random() * 0.21),
  };
  pos.x = clamp01(pos.x + Math.cos(audioVisualState.time * 0.73) * config.SWAY_RADIUS * 0.28);
  pos.y = clamp01(pos.y + Math.sin(audioVisualState.time * 0.61) * config.SWAY_RADIUS * 0.2);

  if (!config.AUDIO_BIAS_TO_CURSOR || pointer == null || pointer.texcoordX == null) {
    return pos;
  }

  return {
    x: clamp01(pos.x * (1 - cursorWeight) + pointer.texcoordX * cursorWeight),
    y: clamp01(pos.y * (1 - cursorWeight) + pointer.texcoordY * cursorWeight),
  };
}

function trimAudioBubbles() {
  const maxBubbles = Math.max(2, Math.min(24, Math.round(config.MAX_AUDIO_BUBBLES)));
  while (audioBubbles.length > maxBubbles) audioBubbles.shift();
  audioVisualState.activeBubbles = audioBubbles.length;
}

function makeBubbleColor(strength, pitch) {
  const color = generateColor();
  const warmth = clamp01(pitch);
  const brightness = 2.0 + Math.min(1, strength) * 2.2;
  color.r *= brightness * (0.82 + warmth * 0.5);
  color.g *= brightness * (0.78 + (1 - Math.abs(warmth - 0.5) * 2) * 0.35);
  color.b *= brightness * (1.08 - warmth * 0.45);
  return color;
}

function chooseBubbleAngle() {
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  lastBubbleAngle = wrap(lastBubbleAngle + goldenAngle + (Math.random() - 0.5) * 0.46, 0, Math.PI * 2);
  return lastBubbleAngle;
}

function spawnAudioBubble(strength, pitch = 0.5, cursorWeight = 0.12, forcedAngle = null) {
  const center = pointerBiasPosition(cursorWeight);
  const angle = forcedAngle == null ? chooseBubbleAngle() : forcedAngle;
  const songSpeed = config.BUBBLE_SPEED * (0.5 + Math.min(1, strength) * 0.7 + audioVisualState.rms * 0.55);
  const radius = config.SMOKE_RING_RADIUS * (0.65 + Math.min(1, strength) * 0.75);

  const bubble = {
    x: center.x,
    y: center.y,
    vx: Math.cos(angle) * songSpeed,
    vy: Math.sin(angle) * songSpeed,
    angle,
    radius,
    color: makeBubbleColor(strength, pitch),
    energy: Math.min(1.4, 0.45 + strength),
    pitch,
    spin: Math.random() < 0.5 ? -1 : 1,
    age: 0,
    life: 2.2 + Math.random() * 1.3,
    emitTimer: 0,
  };
  audioBubbles.push(bubble);
  trimAudioBubbles();
  emitBubbleCrescent(bubble, "spawn");
  audioVisualState.swayX = center.x;
  audioVisualState.swayY = center.y;
}

function emitBubbleCrescent(bubble, mode = "wake") {
  const speedAngle = bubble.angle;
  const speed = Math.sqrt(bubble.vx * bubble.vx + bubble.vy * bubble.vy);
  const life = clamp01(1 - bubble.age / bubble.life);
  const radiusBefore = config.SPLAT_RADIUS;
  const spawn = mode === "spawn";
  const hit = mode === "hit";
  const points = spawn ? Math.max(6, Math.min(10, Math.round(config.SMOKE_RING_POINTS))) : Math.max(3, Math.min(6, Math.round(config.SMOKE_RING_POINTS * 0.55)));
  const baseForce = config.SPLAT_FORCE * (hit ? 0.026 : spawn ? 0.018 : 0.0048) * config.BUBBLE_INTENSITY * (0.55 + bubble.energy * 0.45);
  const headColor = bubble.color;

  config.SPLAT_RADIUS = Math.max(0.2, baseSplatRadius * (hit ? 1.35 : spawn ? 1.65 : 0.95) * (0.65 + life * 0.55));
  splat(
    clamp01(bubble.x + Math.cos(speedAngle) * bubble.radius * 0.82),
    clamp01(bubble.y + Math.sin(speedAngle) * bubble.radius * 0.82),
    Math.cos(speedAngle) * baseForce * 1.25,
    Math.sin(speedAngle) * baseForce * 1.25,
    headColor
  );

  config.SPLAT_RADIUS = Math.max(0.08, baseSplatRadius * (spawn ? 0.85 : 0.48) * (0.75 + life));
  for (let i = 0; i < points; i++) {
    const t = i / Math.max(1, points - 1);
    const arc = speedAngle + Math.PI + bubble.spin * (0.42 + t * 1.52);
    const curl = arc + bubble.spin * Math.PI * (0.5 + t * 0.28);
    const fade = (1 - t * 0.62) * life * (spawn ? 1 : 0.62);
    const back = bubble.radius * (0.25 + t * 1.55);
    const spread = bubble.radius * (0.32 + t * 0.58);
    const x = clamp01(bubble.x - Math.cos(speedAngle) * back + Math.cos(arc) * spread);
    const y = clamp01(bubble.y - Math.sin(speedAngle) * back + Math.sin(arc) * spread);
    const color = {
      r: headColor.r * (0.42 + fade * 0.48),
      g: headColor.g * (0.42 + fade * 0.48),
      b: headColor.b * (0.42 + fade * 0.48),
    };
    const dx = Math.cos(speedAngle) * speed * config.SPLAT_FORCE * (spawn ? 0.012 : 0.004) + Math.cos(curl) * baseForce * (0.18 + t * 0.16);
    const dy = Math.sin(speedAngle) * speed * config.SPLAT_FORCE * (spawn ? 0.012 : 0.004) + Math.sin(curl) * baseForce * (0.18 + t * 0.16);
    splat(x, y, dx, dy, color);
  }
  config.SPLAT_RADIUS = radiusBefore;
}

function emitCollisionSmoke(x, y, nx, ny, strength) {
  const radiusBefore = config.SPLAT_RADIUS;
  const color = generateColor();
  const amount = Math.max(1, Math.min(3, Math.round(1 + strength * 1.4)));
  config.SPLAT_RADIUS = Math.max(0.02, baseSplatRadius * 0.16);
  for (let i = 0; i < amount; i++) {
    const angle = Math.atan2(ny, nx) + (Math.random() - 0.5) * Math.PI * 1.6;
    const force = config.SPLAT_FORCE * 0.012 * config.BUBBLE_INTENSITY * (0.5 + strength);
    splat(
      clamp01(x + (Math.random() - 0.5) * 0.025),
      clamp01(y + (Math.random() - 0.5) * 0.025),
      Math.cos(angle) * force,
      Math.sin(angle) * force,
      color
    );
  }
  config.SPLAT_RADIUS = radiusBefore;
}

function updateAudioBubbles(dt, songEnergy) {
  if (audioBubbles.length === 0) {
    audioVisualState.activeBubbles = 0;
    return;
  }

  const speedScale = 0.45 + songEnergy * 0.85;
  for (const bubble of audioBubbles) {
    bubble.age += dt;
    bubble.emitTimer += dt;
    bubble.vx *= 1 - dt * 0.045;
    bubble.vy *= 1 - dt * 0.045;
    bubble.x += bubble.vx * speedScale * dt;
    bubble.y += bubble.vy * speedScale * dt;

    let hit = false;
    if (bubble.x < bubble.radius) {
      bubble.x = bubble.radius;
      bubble.vx = Math.abs(bubble.vx) * 0.72;
      bubble.angle = Math.atan2(bubble.vy, bubble.vx);
      hit = true;
      emitCollisionSmoke(bubble.x, bubble.y, 1, 0, bubble.energy);
    } else if (bubble.x > 1 - bubble.radius) {
      bubble.x = 1 - bubble.radius;
      bubble.vx = -Math.abs(bubble.vx) * 0.72;
      bubble.angle = Math.atan2(bubble.vy, bubble.vx);
      hit = true;
      emitCollisionSmoke(bubble.x, bubble.y, -1, 0, bubble.energy);
    }

    if (bubble.y < bubble.radius) {
      bubble.y = bubble.radius;
      bubble.vy = Math.abs(bubble.vy) * 0.72;
      bubble.angle = Math.atan2(bubble.vy, bubble.vx);
      hit = true;
      emitCollisionSmoke(bubble.x, bubble.y, 0, 1, bubble.energy);
    } else if (bubble.y > 1 - bubble.radius) {
      bubble.y = 1 - bubble.radius;
      bubble.vy = -Math.abs(bubble.vy) * 0.72;
      bubble.angle = Math.atan2(bubble.vy, bubble.vx);
      hit = true;
      emitCollisionSmoke(bubble.x, bubble.y, 0, -1, bubble.energy);
    }

    if (hit) bubble.age += 0.22;
    if (bubble.emitTimer > 0.18 / Math.max(0.16, config.BUBBLE_TRAIL)) {
      bubble.emitTimer = 0;
      emitBubbleCrescent(bubble, hit ? "hit" : "wake");
    }
  }

  for (let i = 0; i < audioBubbles.length; i++) {
    for (let j = i + 1; j < audioBubbles.length; j++) {
      const a = audioBubbles[i];
      const b = audioBubbles[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;
      const minDist = (a.radius + b.radius) * 0.92;
      if (dist >= minDist) continue;

      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = minDist - dist;
      a.x -= nx * overlap * 0.5;
      a.y -= ny * overlap * 0.5;
      b.x += nx * overlap * 0.5;
      b.y += ny * overlap * 0.5;

      const impulse = ((b.vx - a.vx) * nx + (b.vy - a.vy) * ny) * 0.55;
      a.vx += nx * impulse;
      a.vy += ny * impulse;
      b.vx -= nx * impulse;
      b.vy -= ny * impulse;
      a.angle = Math.atan2(a.vy, a.vx);
      b.angle = Math.atan2(b.vy, b.vx);
      a.age += 0.08;
      b.age += 0.08;
      emitCollisionSmoke((a.x + b.x) * 0.5, (a.y + b.y) * 0.5, nx, ny, Math.max(a.energy, b.energy));
    }
  }

  audioBubbles = audioBubbles.filter((bubble) => bubble.age < bubble.life);
  audioVisualState.activeBubbles = audioBubbles.length;
}

function emitBeatSplats(strength) {
  const amount = Math.max(1, Math.min(2, Math.ceil(strength * config.BUBBLE_INTENSITY * 0.85)));
  for (let i = 0; i < amount; i++) {
    spawnAudioBubble(strength, audioVisualState.pitch, 0.1);
  }
}

function emitPresenceSplat(strength) {
  spawnAudioBubble(strength * 0.72, audioVisualState.pitch, 0.07);
}

function emitVocalPitchBubble(strength, pitch, direction) {
  const pitchAngle = -Math.PI * 0.5 + pitch * Math.PI;
  const launchAngle = wrap(pitchAngle + direction * 0.75 + (Math.random() - 0.5) * 0.35, 0, Math.PI * 2);
  spawnAudioBubble(strength * config.VOCAL_PITCH_REACTIVITY, pitch, 0.04, launchAngle);
}

function emitTrackSway(vocal, bass, pitch, dt) {
  const energy = clamp01(vocal * 0.58 + bass * 0.42);
  audioVisualState.time += dt * config.SWAY_SPEED * (0.55 + bass * 0.45 + vocal * 0.3);
  spawnAudioBubble(energy * config.VOCAL_DANCE_AMOUNT * (0.65 + bass * config.BASS_SWAY_AMOUNT * 0.35), pitch, 0.05);
}

function updateBeatGrid(nowMs, songEnergy, pitch) {
  if (config.BPM_BUBBLE_REACTIVITY <= 0 || audioRuntime.beatIntervalMs <= 0) return;

  while (audioRuntime.nextBeatTime > 0 && nowMs > audioRuntime.nextBeatTime + audioRuntime.beatIntervalMs) {
    audioRuntime.nextBeatTime += audioRuntime.beatIntervalMs;
  }

  if (audioRuntime.nextBeatTime > 0 && nowMs >= audioRuntime.nextBeatTime) {
    const minGap = audioRuntime.beatIntervalMs * 0.55;
    if (songEnergy > 0.16 && nowMs - audioRuntime.lastGridBubble > minGap) {
      audioRuntime.lastGridBubble = nowMs;
      spawnAudioBubble((0.24 + songEnergy * 0.9) * config.BPM_BUBBLE_REACTIVITY, pitch, 0.03);
    }
    audioRuntime.nextBeatTime += audioRuntime.beatIntervalMs;
  }
}

function updateAudioInputs(dt) {
  if (!audioRuntime || audioRuntime.audioEl.paused || audioRuntime.audioEl.ended || !audioRuntime.bands) {
    config.CURL = baseCurl;
    config.COLOR_UPDATE_SPEED = baseColorUpdateSpeed;
    config.BLOOM_INTENSITY = baseBloomIntensity;
    config.SPLAT_RADIUS = baseSplatRadius;
    updateAudioBubbles(dt, 0);
    return;
  }

  audioRuntime.analyser.getByteFrequencyData(audioRuntime.freqData);
  audioRuntime.analyser.getByteTimeDomainData(audioRuntime.timeData);

  const nowMs = performance.now();
  const kick = audioRuntime.kickDetector(audioRuntime.freqData, audioRuntime.bands.kick, nowMs, config.BEAT_SENSITIVITY, 190);
  const bassHit = audioRuntime.bassDetector(audioRuntime.freqData, audioRuntime.bands.bass, nowMs, config.BEAT_SENSITIVITY + 0.05, 135);
  const presence = audioRuntime.presenceDetector(audioRuntime.freqData, audioRuntime.bands.presence, nowMs, config.BEAT_SENSITIVITY + 0.25, 130);
  const bass = audioRuntime.bassFollower(audioRuntime.freqData, audioRuntime.bands.bass, dt);
  const vocal = audioRuntime.vocalFollower(audioRuntime.freqData, audioRuntime.bands.vocal, dt) * config.VOCAL_SENSITIVITY;
  const rms = audioRuntime.rmsFollower(audioRuntime.timeData, dt);
  const centroid = measureBandCentroid(audioRuntime.freqData, audioRuntime.bands.vocal);
  const pitchCoeff = 1 - Math.exp(-dt / 0.55);
  const pitchFastCoeff = 1 - Math.exp(-dt / 0.07);
  const pitchSlowCoeff = 1 - Math.exp(-dt / 0.42);
  audioRuntime.pitch += (centroid - audioRuntime.pitch) * pitchCoeff;
  audioRuntime.pitchFast += (centroid - audioRuntime.pitchFast) * pitchFastCoeff;
  audioRuntime.pitchSlow += (centroid - audioRuntime.pitchSlow) * pitchSlowCoeff;
  const pitchDelta = audioRuntime.pitchFast - audioRuntime.pitchSlow;

  audioVisualState.kick = kick;
  audioVisualState.bass = bass;
  audioVisualState.presence = presence;
  audioVisualState.vocal = vocal;
  audioVisualState.pitch = audioRuntime.pitch;
  audioVisualState.pitchDelta = pitchDelta;
  audioVisualState.rms = rms;
  _runRandom = false;

  const cappedVocal = Math.min(1, vocal);
  const cappedBass = Math.min(1, bass);
  const cappedPresence = Math.min(1, presence);
  const songEnergy = clamp01(cappedBass * 0.48 + cappedVocal * 0.32 + rms * 1.2 + Math.min(1, kick + bassHit) * 0.2);
  config.CURL = baseCurl + config.SWIRL_RESPONSE * (cappedVocal * 8 + cappedBass * 5 + cappedPresence * 3);
  config.COLOR_UPDATE_SPEED = baseColorUpdateSpeed * (0.55 + cappedVocal * 0.25 + cappedBass * 0.2);
  config.BLOOM_INTENSITY = baseBloomIntensity * (1 + 0.35 * rms);
  config.SPLAT_RADIUS = baseSplatRadius * (1 + 0.08 * rms);

  if (kick > 0) {
    if (audioRuntime.lastKickTime > 0) {
      const gap = nowMs - audioRuntime.lastKickTime;
      if (gap >= 260 && gap <= 900) {
        audioRuntime.beatIntervalMs = audioRuntime.beatIntervalMs > 0 ? audioRuntime.beatIntervalMs * 0.72 + gap * 0.28 : gap;
        audioRuntime.nextBeatTime = nowMs + audioRuntime.beatIntervalMs;
        audioVisualState.bpm = 60000 / audioRuntime.beatIntervalMs;
      }
    }
    audioRuntime.lastKickTime = nowMs;
    emitBeatSplats(kick);
  } else if (bassHit > 0) {
    emitBeatSplats(Math.min(1.6, bassHit * 0.8));
  } else if (presence > 0 && nowMs - audioRuntime.lastPresence > 1100) {
    audioRuntime.lastPresence = nowMs;
    emitPresenceSplat(Math.min(1, presence));
  }

  const pitchDirection = pitchDelta > 0 ? 1 : pitchDelta < 0 ? -1 : 0;
  const pitchJump = Math.abs(audioRuntime.pitchFast - audioRuntime.lastPitchValue);
  const changedDirection = pitchDirection !== 0 && pitchDirection !== audioRuntime.lastPitchDirection;
  const pitchChanged = Math.abs(pitchDelta) > 0.026 && (changedDirection || pitchJump > 0.042);
  if (cappedVocal > 0.11 && pitchChanged && nowMs - audioRuntime.lastPitchBubble > 115) {
    audioRuntime.lastPitchBubble = nowMs;
    audioRuntime.lastPitchDirection = pitchDirection;
    audioRuntime.lastPitchValue = audioRuntime.pitchFast;
    emitVocalPitchBubble(0.28 + cappedVocal * 0.85 + Math.min(0.55, Math.abs(pitchDelta) * 7), audioRuntime.pitchFast, pitchDirection);
  }

  audioRuntime.lastSway += dt;
  if ((vocal > 0.22 || bass > 0.28) && audioRuntime.lastSway > 1.8) {
    const swayDt = audioRuntime.lastSway;
    audioRuntime.lastSway = 0;
    emitTrackSway(cappedVocal, cappedBass, audioRuntime.pitch, swayDt);
  }

  updateBeatGrid(nowMs, songEnergy, audioRuntime.pitch);
  updateAudioBubbles(dt, songEnergy);
}

function updateColors(dt) {
  if (!config.COLORFUL) return;

  colorUpdateTimer += dt * config.COLOR_UPDATE_SPEED;
  if (colorUpdateTimer >= 1) {
    colorUpdateTimer = wrap(colorUpdateTimer, 0, 1);
    pointers.forEach((p) => {
      p.color = generateColor();
    });
  }
}

function applyInputs(dt) {
  updateAudioInputs(dt);

  if (splatStack.length > 0) multipleSplats(splatStack.pop());

  pointers.forEach((p) => {
    if (p.moved) {
      p.moved = false;
      splatPointer(p);
    }
  });
}

function step(dt) {
  gl.disable(gl.BLEND);
  gl.viewport(0, 0, velocity.width, velocity.height);

  curlProgram.bind();
  gl.uniform2f(curlProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
  gl.uniform1i(curlProgram.uniforms.uVelocity, velocity.read.attach(0));
  blit(curl.fbo);

  vorticityProgram.bind();
  gl.uniform2f(vorticityProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
  gl.uniform1i(vorticityProgram.uniforms.uVelocity, velocity.read.attach(0));
  gl.uniform1i(vorticityProgram.uniforms.uCurl, curl.attach(1));
  gl.uniform1f(vorticityProgram.uniforms.curl, config.CURL);
  gl.uniform1f(vorticityProgram.uniforms.dt, dt);
  blit(velocity.write.fbo);
  velocity.swap();

  divergenceProgram.bind();
  gl.uniform2f(divergenceProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
  gl.uniform1i(divergenceProgram.uniforms.uVelocity, velocity.read.attach(0));
  blit(divergence.fbo);

  clearProgram.bind();
  gl.uniform1i(clearProgram.uniforms.uTexture, pressure.read.attach(0));
  gl.uniform1f(clearProgram.uniforms.value, config.PRESSURE);
  blit(pressure.write.fbo);
  pressure.swap();

  pressureProgram.bind();
  gl.uniform2f(pressureProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
  gl.uniform1i(pressureProgram.uniforms.uDivergence, divergence.attach(0));
  for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
    gl.uniform1i(pressureProgram.uniforms.uPressure, pressure.read.attach(1));
    blit(pressure.write.fbo);
    pressure.swap();
  }

  gradienSubtractProgram.bind();
  gl.uniform2f(gradienSubtractProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
  gl.uniform1i(gradienSubtractProgram.uniforms.uPressure, pressure.read.attach(0));
  gl.uniform1i(gradienSubtractProgram.uniforms.uVelocity, velocity.read.attach(1));
  blit(velocity.write.fbo);
  velocity.swap();

  advectionProgram.bind();
  gl.uniform2f(advectionProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
  if (!ext.supportLinearFiltering)
    gl.uniform2f(advectionProgram.uniforms.dyeTexelSize, velocity.texelSizeX, velocity.texelSizeY);
  let velocityId = velocity.read.attach(0);
  gl.uniform1i(advectionProgram.uniforms.uVelocity, velocityId);
  gl.uniform1i(advectionProgram.uniforms.uSource, velocityId);
  gl.uniform1f(advectionProgram.uniforms.dt, dt);
  gl.uniform1f(advectionProgram.uniforms.dissipation, config.VELOCITY_DISSIPATION);
  blit(velocity.write.fbo);
  velocity.swap();

  gl.viewport(0, 0, dye.width, dye.height);

  if (!ext.supportLinearFiltering) gl.uniform2f(advectionProgram.uniforms.dyeTexelSize, dye.texelSizeX, dye.texelSizeY);
  gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read.attach(0));
  gl.uniform1i(advectionProgram.uniforms.uSource, dye.read.attach(1));
  gl.uniform1f(advectionProgram.uniforms.dissipation, config.DENSITY_DISSIPATION);
  blit(dye.write.fbo);
  dye.swap();
}

function render(target) {
  if (config.BLOOM) applyBloom(dye.read, bloom);
  if (config.SUNRAYS) {
    applySunrays(dye.read, dye.write, sunrays);
    blur(sunrays, sunraysTemp, 1);
  }

  if (target == null || !config.TRANSPARENT) {
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);
  } else {
    gl.disable(gl.BLEND);
  }

  let width = target == null ? gl.drawingBufferWidth : target.width;
  let height = target == null ? gl.drawingBufferHeight : target.height;
  gl.viewport(0, 0, width, height);

  let fbo = target == null ? null : target.fbo;
  if (target == null && config.TRANSPARENT) {
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }
  if (!config.TRANSPARENT) drawColor(fbo, normalizeColor(config.BACK_COLOR));
  //if (target == null && config.TRANSPARENT)
  //drawCheckerboard(fbo);
  drawDisplay(fbo, width, height);
}

function drawColor(fbo, color) {
  colorProgram.bind();
  gl.uniform4f(colorProgram.uniforms.color, color.r, color.g, color.b, 1);
  blit(fbo);
}

function drawCheckerboard(fbo) {
  checkerboardProgram.bind();
  gl.uniform1f(checkerboardProgram.uniforms.aspectRatio, canvas.width / canvas.height);
  blit(fbo);
}

function drawDisplay(fbo, width, height) {
  displayMaterial.bind();
  if (config.SHADING) gl.uniform2f(displayMaterial.uniforms.texelSize, 1.0 / width, 1.0 / height);
  gl.uniform1i(displayMaterial.uniforms.uTexture, dye.read.attach(0));
  if (config.BLOOM) {
    gl.uniform1i(displayMaterial.uniforms.uBloom, bloom.attach(1));
    gl.uniform1i(displayMaterial.uniforms.uDithering, ditheringTexture.attach(2));
    let scale = getTextureScale(ditheringTexture, width, height);
    gl.uniform2f(displayMaterial.uniforms.ditherScale, scale.x, scale.y);
  }
  if (config.SUNRAYS) gl.uniform1i(displayMaterial.uniforms.uSunrays, sunrays.attach(3));
  blit(fbo);
}

function applyBloom(source, destination) {
  if (bloomFramebuffers.length < 2) return;

  let last = destination;

  gl.disable(gl.BLEND);
  bloomPrefilterProgram.bind();
  let knee = config.BLOOM_THRESHOLD * config.BLOOM_SOFT_KNEE + 0.0001;
  let curve0 = config.BLOOM_THRESHOLD - knee;
  let curve1 = knee * 2;
  let curve2 = 0.25 / knee;
  gl.uniform3f(bloomPrefilterProgram.uniforms.curve, curve0, curve1, curve2);
  gl.uniform1f(bloomPrefilterProgram.uniforms.threshold, config.BLOOM_THRESHOLD);
  gl.uniform1i(bloomPrefilterProgram.uniforms.uTexture, source.attach(0));
  gl.viewport(0, 0, last.width, last.height);
  blit(last.fbo);

  bloomBlurProgram.bind();
  for (let i = 0; i < bloomFramebuffers.length; i++) {
    let dest = bloomFramebuffers[i];
    gl.uniform2f(bloomBlurProgram.uniforms.texelSize, last.texelSizeX, last.texelSizeY);
    gl.uniform1i(bloomBlurProgram.uniforms.uTexture, last.attach(0));
    gl.viewport(0, 0, dest.width, dest.height);
    blit(dest.fbo);
    last = dest;
  }

  gl.blendFunc(gl.ONE, gl.ONE);
  gl.enable(gl.BLEND);

  for (let i = bloomFramebuffers.length - 2; i >= 0; i--) {
    let baseTex = bloomFramebuffers[i];
    gl.uniform2f(bloomBlurProgram.uniforms.texelSize, last.texelSizeX, last.texelSizeY);
    gl.uniform1i(bloomBlurProgram.uniforms.uTexture, last.attach(0));
    gl.viewport(0, 0, baseTex.width, baseTex.height);
    blit(baseTex.fbo);
    last = baseTex;
  }

  gl.disable(gl.BLEND);
  bloomFinalProgram.bind();
  gl.uniform2f(bloomFinalProgram.uniforms.texelSize, last.texelSizeX, last.texelSizeY);
  gl.uniform1i(bloomFinalProgram.uniforms.uTexture, last.attach(0));
  gl.uniform1f(bloomFinalProgram.uniforms.intensity, config.BLOOM_INTENSITY);
  gl.viewport(0, 0, destination.width, destination.height);
  blit(destination.fbo);
}

function applySunrays(source, mask, destination) {
  gl.disable(gl.BLEND);
  sunraysMaskProgram.bind();
  gl.uniform1i(sunraysMaskProgram.uniforms.uTexture, source.attach(0));
  gl.viewport(0, 0, mask.width, mask.height);
  blit(mask.fbo);

  sunraysProgram.bind();
  gl.uniform1f(sunraysProgram.uniforms.weight, config.SUNRAYS_WEIGHT);
  gl.uniform1i(sunraysProgram.uniforms.uTexture, mask.attach(0));
  gl.viewport(0, 0, destination.width, destination.height);
  blit(destination.fbo);
}

function blur(target, temp, iterations) {
  blurProgram.bind();
  for (let i = 0; i < iterations; i++) {
    gl.uniform2f(blurProgram.uniforms.texelSize, target.texelSizeX, 0.0);
    gl.uniform1i(blurProgram.uniforms.uTexture, target.attach(0));
    blit(temp.fbo);

    gl.uniform2f(blurProgram.uniforms.texelSize, 0.0, target.texelSizeY);
    gl.uniform1i(blurProgram.uniforms.uTexture, temp.attach(0));
    blit(target.fbo);
  }
}

function splatPointer(pointer) {
  let dx = pointer.deltaX * config.SPLAT_FORCE * config.MOUSE_FORCE_MULTIPLIER;
  let dy = pointer.deltaY * config.SPLAT_FORCE * config.MOUSE_FORCE_MULTIPLIER;
  splat(pointer.texcoordX, pointer.texcoordY, dx, dy, pointer.color);
}

function multipleSplats(amount) {
  for (let i = 0; i < amount; i++) {
    const color = generateColor();
    color.r *= 2.4;
    color.g *= 2.4;
    color.b *= 2.4;
    const x = Math.random();
    const y = Math.random();
    const dx = 1000 * (Math.random() - 0.5);
    const dy = 1000 * (Math.random() - 0.5);
    splat(x, y, dx, dy, color);
  }
}

function splat(x, y, dx, dy, color) {
  gl.viewport(0, 0, velocity.width, velocity.height);
  splatProgram.bind();
  gl.uniform1i(splatProgram.uniforms.uTarget, velocity.read.attach(0));
  gl.uniform1f(splatProgram.uniforms.aspectRatio, canvas.width / canvas.height);
  gl.uniform2f(splatProgram.uniforms.point, x, y);
  gl.uniform3f(splatProgram.uniforms.color, dx, dy, 0.0);
  gl.uniform1f(splatProgram.uniforms.radius, correctRadius(config.SPLAT_RADIUS / 100.0));
  blit(velocity.write.fbo);
  velocity.swap();

  gl.viewport(0, 0, dye.width, dye.height);
  gl.uniform1i(splatProgram.uniforms.uTarget, dye.read.attach(0));
  gl.uniform3f(splatProgram.uniforms.color, color.r, color.g, color.b);
  blit(dye.write.fbo);
  dye.swap();
}

function correctRadius(radius) {
  let aspectRatio = canvas.width / canvas.height;
  if (aspectRatio > 1) radius *= aspectRatio;
  return radius;
}

let lastMove = -1;
function checkLastMove() {
  const currentMove = window.performance.now();
  if (currentMove - lastMove > 1000) {
    lastMove = currentMove;
    return true;
  }
  return false;
}

function pointerPosition(event) {
  return {
    x: scaleByPixelRatio(event.clientX),
    y: scaleByPixelRatio(event.clientY),
  };
}

window.addEventListener("mousemove", (e) => {
  const pos = pointerPosition(e);
  if (checkLastMove()) {
    let pointer = pointers.find((p) => p.id == -1);
    if (pointer == null) pointer = new pointerPrototype();
    updatePointerDownData(pointer, -1, pos.x, pos.y);
  }

  let pointer = pointers[0];
  if (!pointer.down) return;
  updatePointerMoveData(pointer, pos.x, pos.y);
}, { passive: true });

window.addEventListener("mouseup", () => {
  updatePointerUpData(pointers[0]);
});

window.addEventListener("touchstart", (e) => {
  e.preventDefault();
  const touches = e.touches;
  while (touches.length >= pointers.length) pointers.push(new pointerPrototype());
  for (let i = 0; i < touches.length; i++) {
    let posX = scaleByPixelRatio(touches[i].clientX);
    let posY = scaleByPixelRatio(touches[i].clientY);
    updatePointerDownData(pointers[i + 1], touches[i].identifier, posX, posY);
  }
}, { passive: false });

window.addEventListener(
  "touchmove",
  (e) => {
    e.preventDefault();
    const touches = e.touches;
    for (let i = 0; i < touches.length; i++) {
      let pointer = pointers[i + 1];
      if (!pointer.down) continue;
      let posX = scaleByPixelRatio(touches[i].clientX);
      let posY = scaleByPixelRatio(touches[i].clientY);
      updatePointerMoveData(pointer, posX, posY);
    }
  },
  false
);

window.addEventListener("touchend", (e) => {
  const touches = e.changedTouches;
  for (let i = 0; i < touches.length; i++) {
    let pointer = pointers.find((p) => p.id == touches[i].identifier);
    if (pointer == null) continue;
    updatePointerUpData(pointer);
  }
});

window.addEventListener("keydown", (e) => {
  if (e.code === "KeyP") config.PAUSED = !config.PAUSED;
  if (e.key === " ") splatStack.push(parseInt(Math.random() * 20) + 5);
});

function updatePointerDownData(pointer, id, posX, posY) {
  pointer.id = id;
  pointer.down = true;
  pointer.moved = false;
  pointer.texcoordX = posX / canvas.width;
  pointer.texcoordY = 1.0 - posY / canvas.height;
  pointer.prevTexcoordX = pointer.texcoordX;
  pointer.prevTexcoordY = pointer.texcoordY;
  pointer.deltaX = 0;
  pointer.deltaY = 0;
  pointer.color = generateColor();
}

function updatePointerMoveData(pointer, posX, posY) {
  pointer.prevTexcoordX = pointer.texcoordX;
  pointer.prevTexcoordY = pointer.texcoordY;
  pointer.texcoordX = posX / canvas.width;
  pointer.texcoordY = 1.0 - posY / canvas.height;
  pointer.deltaX = correctDeltaX(pointer.texcoordX - pointer.prevTexcoordX);
  pointer.deltaY = correctDeltaY(pointer.texcoordY - pointer.prevTexcoordY);
  pointer.moved = Math.abs(pointer.deltaX) > 0 || Math.abs(pointer.deltaY) > 0;
}

function updatePointerUpData(pointer) {
  pointer.down = false;
}

function correctDeltaX(delta) {
  let aspectRatio = canvas.width / canvas.height;
  if (aspectRatio < 1) delta *= aspectRatio;
  return delta;
}

function correctDeltaY(delta) {
  let aspectRatio = canvas.width / canvas.height;
  if (aspectRatio > 1) delta /= aspectRatio;
  return delta;
}

function generateColor() {
  let c = HSVtoRGB(Math.random(), 1.0, 1.0);
  if (!config.CUSTOM_COLOR)
  {
    c.r *= 0.15;
    c.g *= 0.15;
    c.b *= 0.15;
  }
  else
  {
    let [colorLeft,colorRight]=colorRange;
    try {
      if(colorConfig!==null){
        const probabilityTotal = colorConfig.reduce((sum,c)=>sum+c[0],0);
        let rand = Math.random()*probabilityTotal;
        for(const c of colorConfig){
          rand -= c[0];
          if(rand<0){
            colorLeft = c[1];
            colorRight = c[2];
            break;
          }
        }
      }
      let l = RGBtoHSV(hexToRgb(colorLeft)), r = RGBtoHSV(hexToRgb(colorRight)), x;
      if(r.s < l.s){
        x = r.s; 
        r.s = l.s; 
        l.s = x;
      }
      if(r.v < l.v){
        x = r.v; 
        r.v = l.v; 
        l.v = x;
      }
      if(r.h < l.h){
        r.h += 1;
      }

      x = Math.random()*(r.h-l.h) + l.h;
      if(x>1){
        x -= 1;
      }
      c = HSVtoRGB(x,Math.random()*(r.s-l.s)+l.s, (Math.random()*(r.v-l.v)+l.v)*0.15);
    } catch (error) {
      console.log("Invalid color config",error);
      c = hexToRgb("#000000");
    }
  }
  return c;
}

function HSVtoRGB(h, s, v) {
  let r, g, b, i, f, p, q, t;
  i = Math.floor(h * 6);
  f = h * 6 - i;
  p = v * (1 - s);
  q = v * (1 - f * s);
  t = v * (1 - (1 - f) * s);

  switch (i % 6) {
    case 0:
      (r = v), (g = t), (b = p);
      break;
    case 1:
      (r = q), (g = v), (b = p);
      break;
    case 2:
      (r = p), (g = v), (b = t);
      break;
    case 3:
      (r = p), (g = q), (b = v);
      break;
    case 4:
      (r = t), (g = p), (b = v);
      break;
    case 5:
      (r = v), (g = p), (b = q);
      break;
  }

  return {
    r,
    g,
    b,
  };
}

function normalizeColor(input) {
  let output = {
    r: input.r / 255,
    g: input.g / 255,
    b: input.b / 255,
  };
  return output;
}

function wrap(value, min, max) {
  let range = max - min;
  if (range == 0) return min;
  return ((value - min) % range) + min;
}

function getResolution(resolution) {
  let aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight;
  if (aspectRatio < 1) aspectRatio = 1.0 / aspectRatio;

  let min = Math.round(resolution);
  let max = Math.round(resolution * aspectRatio);

  if (gl.drawingBufferWidth > gl.drawingBufferHeight) return { width: max, height: min };
  else return { width: min, height: max };
}

function getTextureScale(texture, width, height) {
  return {
    x: width / texture.width,
    y: height / texture.height,
  };
}

function scaleByPixelRatio(input) {
  let pixelRatio = Math.min(window.devicePixelRatio || 1, 1);
  return Math.floor(input * pixelRatio);
}

function hashCode(s) {
  if (s.length == 0) return 0;
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash << 5) - hash + s.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

function refreshAudioBaseValues() {
  baseCurl = config.CURL;
  baseColorUpdateSpeed = config.COLOR_UPDATE_SPEED;
  baseBloomIntensity = config.BLOOM_INTENSITY;
  baseSplatRadius = config.SPLAT_RADIUS;
}

window.FluidSimulation = {
  canvas,
  config,
  get gl() {
    return gl;
  },
  get audioState() {
    return audioVisualState;
  },
  initAudio(audioEl) {
    if (!audioRuntime) audioRuntime = createAudioRuntime(audioEl);
    return audioRuntime;
  },
  setAudioSource(src, objectUrl = null) {
    setAudioRuntimeSource(src, objectUrl);
  },
  startAudio: startAudioRuntime,
  pauseAudio: pauseAudioRuntime,
  updateAudioBands,
  updateKeywords,
  initFramebuffers,
  refreshAudioBaseValues,
  splat,
  multipleSplats,
  renderNow() {
    render(null);
  },
};

document.documentElement.dataset.fluidVisualizer = "lively-port-loaded";
