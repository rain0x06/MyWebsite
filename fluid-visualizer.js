/*
 * Audio-reactive WebGL fluid surface for rain0x.me.
 * Based on the GPU fluid pipeline used by Pavel Dobryakov's WebGL Fluid
 * Simulation and the Lively Wallpaper fork: splat -> curl/vorticity ->
 * divergence -> pressure solve -> gradient subtract -> advection -> display.
 * Original project license: MIT, Copyright (c) 2017 Pavel Dobryakov.
 */
(function () {
  "use strict";

  const CONFIG = {
    simResolution: 128,
    dyeResolution: 768,
    densityDissipation: 0.968,
    velocityDissipation: 0.982,
    pressureDissipation: 0.82,
    pressureIterations: 18,
    curl: 34,
    splatRadius: 0.18,
    splatForce: 7200,
    bloomGain: 1.25,
    audioSmoothing: 0.76,
    beatThreshold: 1.34,
    vocalThreshold: 0.055,
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function getResolution(base, canvas) {
    const aspect = canvas.width / canvas.height;
    if (aspect < 1) {
      return { width: Math.round(base), height: Math.round(base / aspect) };
    }
    return { width: Math.round(base * aspect), height: Math.round(base) };
  }

  function hslToRgb(h, s, l) {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const hp = h * 6;
    const x = c * (1 - Math.abs((hp % 2) - 1));
    let r = 0;
    let g = 0;
    let b = 0;

    if (hp < 1) [r, g, b] = [c, x, 0];
    else if (hp < 2) [r, g, b] = [x, c, 0];
    else if (hp < 3) [r, g, b] = [0, c, x];
    else if (hp < 4) [r, g, b] = [0, x, c];
    else if (hp < 5) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];

    const m = l - c * 0.5;
    return { r: r + m, g: g + m, b: b + m };
  }

  class AudioFluidVisualizer {
    constructor(options) {
      document.documentElement.dataset.fluidStatus = "constructing";
      this.canvas = options.canvas;
      this.audio = options.audio;
      this.gl = this.canvas.getContext("webgl2", {
        alpha: true,
        depth: false,
        stencil: false,
        antialias: false,
        preserveDrawingBuffer: false,
      });

      this.isRunning = false;
      this.isReady = false;
      this.lastTime = performance.now();
      this.splatQueue = [];
      this.pointer = {
        down: false,
        x: 0.5,
        y: 0.5,
        px: 0.5,
        py: 0.5,
        vx: 0,
        vy: 0,
        ax: 0,
        ay: 0,
        speed: 0,
        accel: 0,
        time: performance.now(),
        hue: 0.46,
      };
      this.audioState = {
        bass: 0,
        lowMid: 0,
        vocal: 0,
        treble: 0,
        rms: 0,
        flux: 0,
        beat: 0,
        vocalPulse: 0,
        lastBeat: 0,
        bassHistory: new Array(42).fill(0),
        previousBins: null,
      };

      if (!this.gl) {
        this.installCanvasFallback();
        document.documentElement.dataset.fluidStatus = "canvas-fallback-ready";
        return;
      }

      this.initGL();
      this.attachPointerListeners();
      this.isReady = true;
      document.documentElement.dataset.fluidStatus = "webgl-ready";
    }

    async start() {
      if (!this.isReady) {
        return;
      }

      this.isRunning = true;
      document.documentElement.dataset.fluidStatus = "running";
      await this.initAudio();
      this.lastTime = performance.now();
      this.seedIntroSplats();
      requestAnimationFrame((time) => this.tick(time));
    }

    async initAudio() {
      if (this.audioContext) {
        if (this.audioContext.state !== "running") {
          await this.audioContext.resume();
        }
        document.documentElement.dataset.audioContextState = this.audioContext.state;
        return;
      }

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass || !this.audio) {
        document.documentElement.dataset.audioContextState = "unavailable";
        return;
      }

      this.audioContext = new AudioContextClass();
      document.documentElement.dataset.audioContextState = this.audioContext.state;
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 4096;
      this.analyser.smoothingTimeConstant = 0.58;
      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
      this.timeData = new Uint8Array(this.analyser.fftSize);
      this.audioSource = this.audioContext.createMediaElementSource(this.audio);
      this.audioSource.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);
      await this.audioContext.resume();
      document.documentElement.dataset.audioContextState = this.audioContext.state;
    }

    initGL() {
      const gl = this.gl;
      gl.getExtension("EXT_color_buffer_float");
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.CULL_FACE);

      this.ext = {
        internalFormat: gl.RGBA16F,
        format: gl.RGBA,
        type: gl.HALF_FLOAT,
        filtering: gl.LINEAR,
      };

      this.baseVertexShader = this.compileShader(gl.VERTEX_SHADER, `#version 300 es
        precision highp float;
        layout(location = 0) in vec2 aPosition;
        out vec2 vUv;
        out vec2 vL;
        out vec2 vR;
        out vec2 vT;
        out vec2 vB;
        uniform vec2 texelSize;
        void main () {
          vUv = aPosition * 0.5 + 0.5;
          vL = vUv - vec2(texelSize.x, 0.0);
          vR = vUv + vec2(texelSize.x, 0.0);
          vT = vUv + vec2(0.0, texelSize.y);
          vB = vUv - vec2(0.0, texelSize.y);
          gl_Position = vec4(aPosition, 0.0, 1.0);
        }
      `);

      this.shaders = {
        clear: this.createProgram(this.baseVertexShader, `#version 300 es
          precision mediump float;
          in vec2 vUv;
          uniform sampler2D uTexture;
          uniform float value;
          out vec4 fragColor;
          void main () {
            fragColor = value * texture(uTexture, vUv);
          }
        `),
        display: this.createProgram(this.baseVertexShader, `#version 300 es
          precision highp float;
          in vec2 vUv;
          uniform sampler2D uTexture;
          uniform float intensity;
          uniform float beat;
          out vec4 fragColor;
          void main () {
            vec3 c = texture(uTexture, vUv).rgb;
            c = max(vec3(0.0), c);
            c = pow(c * intensity, vec3(0.86));
            float glow = smoothstep(0.18, 1.0, length(c));
            c += glow * vec3(0.08, 0.18, 0.22) * (0.5 + beat);
            fragColor = vec4(c, clamp(length(c) * 0.72, 0.0, 0.88));
          }
        `),
        splat: this.createProgram(this.baseVertexShader, `#version 300 es
          precision highp float;
          in vec2 vUv;
          uniform sampler2D uTarget;
          uniform float aspectRatio;
          uniform vec3 color;
          uniform vec2 point;
          uniform float radius;
          out vec4 fragColor;
          void main () {
            vec2 p = vUv - point.xy;
            p.x *= aspectRatio;
            vec3 splat = exp(-dot(p, p) / radius) * color;
            vec3 base = texture(uTarget, vUv).xyz;
            fragColor = vec4(base + splat, 1.0);
          }
        `),
        advection: this.createProgram(this.baseVertexShader, `#version 300 es
          precision highp float;
          in vec2 vUv;
          uniform sampler2D uVelocity;
          uniform sampler2D uSource;
          uniform vec2 texelSize;
          uniform vec2 dyeTexelSize;
          uniform float dt;
          uniform float dissipation;
          out vec4 fragColor;
          void main () {
            vec2 coord = vUv - dt * texture(uVelocity, vUv).xy * texelSize;
            fragColor = dissipation * texture(uSource, coord);
          }
        `),
        divergence: this.createProgram(this.baseVertexShader, `#version 300 es
          precision mediump float;
          in vec2 vUv;
          in vec2 vL;
          in vec2 vR;
          in vec2 vT;
          in vec2 vB;
          uniform sampler2D uVelocity;
          out vec4 fragColor;
          void main () {
            float L = texture(uVelocity, vL).x;
            float R = texture(uVelocity, vR).x;
            float T = texture(uVelocity, vT).y;
            float B = texture(uVelocity, vB).y;
            vec2 C = texture(uVelocity, vUv).xy;
            if (vL.x < 0.0) { L = -C.x; }
            if (vR.x > 1.0) { R = -C.x; }
            if (vT.y > 1.0) { T = -C.y; }
            if (vB.y < 0.0) { B = -C.y; }
            float div = 0.5 * (R - L + T - B);
            fragColor = vec4(div, 0.0, 0.0, 1.0);
          }
        `),
        curl: this.createProgram(this.baseVertexShader, `#version 300 es
          precision mediump float;
          in vec2 vL;
          in vec2 vR;
          in vec2 vT;
          in vec2 vB;
          uniform sampler2D uVelocity;
          out vec4 fragColor;
          void main () {
            float L = texture(uVelocity, vL).y;
            float R = texture(uVelocity, vR).y;
            float T = texture(uVelocity, vT).x;
            float B = texture(uVelocity, vB).x;
            float vorticity = R - L - T + B;
            fragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
          }
        `),
        vorticity: this.createProgram(this.baseVertexShader, `#version 300 es
          precision highp float;
          in vec2 vUv;
          in vec2 vL;
          in vec2 vR;
          in vec2 vT;
          in vec2 vB;
          uniform sampler2D uVelocity;
          uniform sampler2D uCurl;
          uniform float curl;
          uniform float dt;
          out vec4 fragColor;
          void main () {
            float L = texture(uCurl, vL).x;
            float R = texture(uCurl, vR).x;
            float T = texture(uCurl, vT).x;
            float B = texture(uCurl, vB).x;
            float C = texture(uCurl, vUv).x;
            vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
            force /= length(force) + 0.0001;
            force *= curl * C;
            force.y *= -1.0;
            vec2 velocity = texture(uVelocity, vUv).xy;
            velocity += force * dt;
            velocity = min(max(velocity, -1000.0), 1000.0);
            fragColor = vec4(velocity, 0.0, 1.0);
          }
        `),
        pressure: this.createProgram(this.baseVertexShader, `#version 300 es
          precision mediump float;
          in vec2 vUv;
          in vec2 vL;
          in vec2 vR;
          in vec2 vT;
          in vec2 vB;
          uniform sampler2D uPressure;
          uniform sampler2D uDivergence;
          out vec4 fragColor;
          void main () {
            float L = texture(uPressure, vL).x;
            float R = texture(uPressure, vR).x;
            float T = texture(uPressure, vT).x;
            float B = texture(uPressure, vB).x;
            float C = texture(uPressure, vUv).x;
            float divergence = texture(uDivergence, vUv).x;
            float pressure = (L + R + B + T - divergence) * 0.25;
            fragColor = vec4(pressure, 0.0, 0.0, 1.0);
          }
        `),
        gradientSubtract: this.createProgram(this.baseVertexShader, `#version 300 es
          precision mediump float;
          in vec2 vUv;
          in vec2 vL;
          in vec2 vR;
          in vec2 vT;
          in vec2 vB;
          uniform sampler2D uPressure;
          uniform sampler2D uVelocity;
          out vec4 fragColor;
          void main () {
            float L = texture(uPressure, vL).x;
            float R = texture(uPressure, vR).x;
            float T = texture(uPressure, vT).x;
            float B = texture(uPressure, vB).x;
            vec2 velocity = texture(uVelocity, vUv).xy;
            velocity.xy -= vec2(R - L, T - B);
            fragColor = vec4(velocity, 0.0, 1.0);
          }
        `),
      };

      this.initBlit();
      this.resize();
      window.addEventListener("resize", () => this.resize(), { passive: true });
    }

    compileShader(type, source) {
      const gl = this.gl;
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader) || "Shader compile failed");
      }
      return shader;
    }

    createProgram(vertexShader, fragmentSource) {
      const gl = this.gl;
      const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentSource);
      const program = gl.createProgram();
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) || "Program link failed");
      }

      const uniforms = {};
      const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < uniformCount; i += 1) {
        const name = gl.getActiveUniform(program, i).name;
        uniforms[name] = gl.getUniformLocation(program, name);
      }
      return { program, uniforms };
    }

    initBlit() {
      const gl = this.gl;
      this.vertexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, -1, 1, 1, 1, -1, -1, 1, 1, 1, -1]),
        gl.STATIC_DRAW,
      );

      this.vertexArray = gl.createVertexArray();
      gl.bindVertexArray(this.vertexArray);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.bindVertexArray(null);
    }

    blit(target) {
      const gl = this.gl;
      gl.bindFramebuffer(gl.FRAMEBUFFER, target);
      gl.bindVertexArray(this.vertexArray);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.bindVertexArray(null);
    }

    createTexture(width, height) {
      const gl = this.gl;
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, this.ext.filtering);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, this.ext.filtering);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, this.ext.internalFormat, width, height, 0, this.ext.format, this.ext.type, null);
      const fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      return {
        texture,
        fbo,
        width,
        height,
        texelSizeX: 1 / width,
        texelSizeY: 1 / height,
      };
    }

    createDoubleFBO(width, height) {
      let fbo1 = this.createTexture(width, height);
      let fbo2 = this.createTexture(width, height);
      return {
        width,
        height,
        texelSizeX: 1 / width,
        texelSizeY: 1 / height,
        get read() {
          return fbo1;
        },
        get write() {
          return fbo2;
        },
        swap() {
          const temp = fbo1;
          fbo1 = fbo2;
          fbo2 = temp;
        },
      };
    }

    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(2, Math.floor(this.canvas.clientWidth * dpr));
      const height = Math.max(2, Math.floor(this.canvas.clientHeight * dpr));

      if (this.canvas.width === width && this.canvas.height === height && this.velocity) {
        return;
      }

      this.canvas.width = width;
      this.canvas.height = height;
      const sim = getResolution(CONFIG.simResolution, this.canvas);
      const dye = getResolution(CONFIG.dyeResolution, this.canvas);
      this.velocity = this.createDoubleFBO(sim.width, sim.height);
      this.dye = this.createDoubleFBO(dye.width, dye.height);
      this.divergence = this.createTexture(sim.width, sim.height);
      this.curl = this.createTexture(sim.width, sim.height);
      this.pressure = this.createDoubleFBO(sim.width, sim.height);
    }

    attachPointerListeners() {
      const updatePointer = (event, isDown) => {
        const rect = this.canvas.getBoundingClientRect();
        const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
        const y = clamp(1 - (event.clientY - rect.top) / rect.height, 0, 1);
        const now = performance.now();
        const dt = Math.max(8, now - this.pointer.time) / 1000;
        const vx = (x - this.pointer.x) / dt;
        const vy = (y - this.pointer.y) / dt;
        const ax = (vx - this.pointer.vx) / dt;
        const ay = (vy - this.pointer.vy) / dt;

        this.pointer.px = this.pointer.x;
        this.pointer.py = this.pointer.y;
        this.pointer.x = x;
        this.pointer.y = y;
        this.pointer.ax = ax;
        this.pointer.ay = ay;
        this.pointer.vx = vx;
        this.pointer.vy = vy;
        this.pointer.speed = Math.hypot(vx, vy);
        this.pointer.accel = Math.hypot(ax, ay);
        this.pointer.time = now;
        this.pointer.down = isDown || this.pointer.down;
        this.pointer.hue = (this.pointer.hue + 0.018 + this.pointer.speed * 0.006) % 1;

        if (this.isRunning && this.pointer.speed > 0.045) {
          const energy = clamp(this.pointer.speed * 0.62 + this.pointer.accel * 0.0025, 0.08, 1.7);
          const color = hslToRgb((this.pointer.hue + this.audioState.vocal * 0.16) % 1, 0.9, 0.58);
          this.queueSplat({
            x,
            y,
            dx: vx * CONFIG.splatForce * energy,
            dy: vy * CONFIG.splatForce * energy,
            color,
            radius: CONFIG.splatRadius * (0.42 + energy * 0.16),
          });
        }
      };

      window.addEventListener("pointerdown", (event) => updatePointer(event, true), { passive: true });
      window.addEventListener("pointermove", (event) => updatePointer(event, event.buttons > 0), { passive: true });
      window.addEventListener("pointerup", () => {
        this.pointer.down = false;
      }, { passive: true });
    }

    queueSplat(splat) {
      this.splatQueue.push(splat);
      if (this.splatQueue.length > 90) {
        this.splatQueue.splice(0, this.splatQueue.length - 90);
      }
    }

    seedIntroSplats() {
      for (let i = 0; i < 18; i += 1) {
        const angle = (i / 18) * Math.PI * 2;
        const color = hslToRgb(0.45 + i * 0.022, 0.9, 0.58);
        this.queueSplat({
          x: 0.5 + Math.cos(angle) * 0.22,
          y: 0.5 + Math.sin(angle) * 0.22,
          dx: Math.cos(angle) * 2400,
          dy: Math.sin(angle) * 2400,
          color,
          radius: CONFIG.splatRadius * 0.66,
        });
      }
    }

    updateAudioFeatures() {
      if (!this.analyser || !this.frequencyData || this.audio.paused) {
        this.audioState.beat *= 0.9;
        this.audioState.vocalPulse *= 0.92;
        return;
      }

      this.analyser.getByteFrequencyData(this.frequencyData);
      this.analyser.getByteTimeDomainData(this.timeData);
      const nyquist = this.audioContext.sampleRate / 2;
      const binHz = nyquist / this.frequencyData.length;

      const rangeEnergy = (fromHz, toHz) => {
        const start = Math.max(0, Math.floor(fromHz / binHz));
        const end = Math.min(this.frequencyData.length - 1, Math.ceil(toHz / binHz));
        let sum = 0;
        for (let i = start; i <= end; i += 1) {
          const v = this.frequencyData[i] / 255;
          sum += v * v;
        }
        return Math.sqrt(sum / Math.max(1, end - start + 1));
      };

      let rmsSum = 0;
      for (let i = 0; i < this.timeData.length; i += 1) {
        const v = (this.timeData[i] - 128) / 128;
        rmsSum += v * v;
      }

      let flux = 0;
      if (!this.audioState.previousBins) {
        this.audioState.previousBins = new Uint8Array(this.frequencyData.length);
      }
      for (let i = 0; i < this.frequencyData.length; i += 1) {
        const diff = this.frequencyData[i] - this.audioState.previousBins[i];
        if (diff > 0) {
          flux += diff;
        }
        this.audioState.previousBins[i] = this.frequencyData[i];
      }
      flux /= this.frequencyData.length * 255;

      const bass = rangeEnergy(35, 145);
      const lowMid = rangeEnergy(145, 520);
      const vocal = rangeEnergy(520, 3400);
      const treble = rangeEnergy(3400, 10500);
      const rms = Math.sqrt(rmsSum / this.timeData.length);

      this.audioState.bass = lerp(this.audioState.bass, bass, 1 - CONFIG.audioSmoothing);
      this.audioState.lowMid = lerp(this.audioState.lowMid, lowMid, 1 - CONFIG.audioSmoothing);
      this.audioState.vocal = lerp(this.audioState.vocal, vocal, 1 - CONFIG.audioSmoothing);
      this.audioState.treble = lerp(this.audioState.treble, treble, 1 - CONFIG.audioSmoothing);
      this.audioState.rms = lerp(this.audioState.rms, rms, 0.18);
      this.audioState.flux = lerp(this.audioState.flux, flux, 0.3);

      const history = this.audioState.bassHistory;
      history.push(bass);
      history.shift();
      const mean = history.reduce((sum, value) => sum + value, 0) / history.length;
      const now = performance.now();
      const beatScore = bass / Math.max(0.028, mean);
      const beatReady = now - this.audioState.lastBeat > 165;

      if (beatReady && beatScore > CONFIG.beatThreshold && flux > 0.026 && rms > 0.035) {
        this.audioState.beat = clamp((beatScore - 1) * 0.95 + flux * 7, 0.28, 1.6);
        this.audioState.lastBeat = now;
        this.emitBeatSplats(this.audioState.beat);
      } else {
        this.audioState.beat *= 0.86;
      }

      const vocalLift = Math.max(0, vocal - lowMid * 0.45 - bass * 0.18);
      if (vocalLift > CONFIG.vocalThreshold || vocal > 0.18) {
        this.audioState.vocalPulse = clamp(vocalLift * 4.2 + vocal * 0.42, 0, 1.2);
        this.emitVocalSplats(this.audioState.vocalPulse, vocal, treble);
      } else {
        this.audioState.vocalPulse *= 0.88;
      }
    }

    emitBeatSplats(power) {
      const count = Math.round(5 + power * 6);
      const hueBase = (0.46 + this.audioState.lowMid * 0.28 + Math.random() * 0.08) % 1;
      for (let i = 0; i < count; i += 1) {
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.35;
        const distance = 0.08 + Math.random() * 0.28;
        const x = 0.5 + Math.cos(angle) * distance * (this.canvas.height / this.canvas.width);
        const y = 0.5 + Math.sin(angle) * distance;
        const color = hslToRgb((hueBase + i * 0.028) % 1, 0.92, 0.57);
        const force = CONFIG.splatForce * (0.55 + power * 0.36);
        this.queueSplat({
          x: clamp(x, 0.03, 0.97),
          y: clamp(y, 0.03, 0.97),
          dx: Math.cos(angle) * force,
          dy: Math.sin(angle) * force,
          color,
          radius: CONFIG.splatRadius * (0.68 + power * 0.2),
        });
      }
    }

    emitVocalSplats(pulse, vocal, treble) {
      const t = performance.now() * 0.001;
      const lanes = pulse > 0.55 ? 3 : 2;
      for (let i = 0; i < lanes; i += 1) {
        const phase = t * (1.2 + i * 0.22) + i * 2.1;
        const x = 0.5 + Math.sin(phase) * (0.25 + treble * 0.18);
        const y = 0.5 + Math.cos(phase * 0.82) * (0.16 + vocal * 0.16);
        const tangentX = Math.cos(phase) * 0.7;
        const tangentY = -Math.sin(phase * 0.82) * 0.5;
        const color = hslToRgb((0.38 + vocal * 0.35 + i * 0.07) % 1, 0.88, 0.62);
        this.queueSplat({
          x: clamp(x, 0.03, 0.97),
          y: clamp(y, 0.03, 0.97),
          dx: tangentX * CONFIG.splatForce * (0.16 + pulse * 0.18),
          dy: tangentY * CONFIG.splatForce * (0.16 + pulse * 0.18),
          color,
          radius: CONFIG.splatRadius * (0.34 + pulse * 0.13),
        });
      }
    }

    applySplats() {
      while (this.splatQueue.length) {
        const splat = this.splatQueue.shift();
        this.splat(splat.x, splat.y, splat.dx, splat.dy, splat.color, splat.radius);
      }
    }

    splat(x, y, dx, dy, color, radius) {
      const gl = this.gl;
      const program = this.shaders.splat;
      gl.useProgram(program.program);
      gl.uniform1f(program.uniforms.aspectRatio, this.canvas.width / this.canvas.height);
      gl.uniform2f(program.uniforms.point, x, y);
      gl.uniform1f(program.uniforms.radius, radius || CONFIG.splatRadius);

      gl.viewport(0, 0, this.velocity.width, this.velocity.height);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.velocity.read.texture);
      gl.uniform1i(program.uniforms.uTarget, 0);
      gl.uniform3f(program.uniforms.color, dx, dy, 0);
      this.blit(this.velocity.write.fbo);
      this.velocity.swap();

      gl.viewport(0, 0, this.dye.width, this.dye.height);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.dye.read.texture);
      gl.uniform1i(program.uniforms.uTarget, 0);
      const intensity = 1.5 + this.audioState.beat * 1.4 + this.audioState.vocalPulse * 0.9;
      gl.uniform3f(program.uniforms.color, color.r * intensity, color.g * intensity, color.b * intensity);
      this.blit(this.dye.write.fbo);
      this.dye.swap();
    }

    step(dt) {
      const gl = this.gl;
      gl.disable(gl.BLEND);

      gl.viewport(0, 0, this.velocity.width, this.velocity.height);
      gl.useProgram(this.shaders.curl.program);
      gl.uniform2f(this.shaders.curl.uniforms.texelSize, this.velocity.texelSizeX, this.velocity.texelSizeY);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.velocity.read.texture);
      gl.uniform1i(this.shaders.curl.uniforms.uVelocity, 0);
      this.blit(this.curl.fbo);

      gl.useProgram(this.shaders.vorticity.program);
      gl.uniform2f(this.shaders.vorticity.uniforms.texelSize, this.velocity.texelSizeX, this.velocity.texelSizeY);
      gl.uniform1f(this.shaders.vorticity.uniforms.curl, CONFIG.curl + this.audioState.vocalPulse * 22);
      gl.uniform1f(this.shaders.vorticity.uniforms.dt, dt);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.velocity.read.texture);
      gl.uniform1i(this.shaders.vorticity.uniforms.uVelocity, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.curl.texture);
      gl.uniform1i(this.shaders.vorticity.uniforms.uCurl, 1);
      this.blit(this.velocity.write.fbo);
      this.velocity.swap();

      gl.useProgram(this.shaders.divergence.program);
      gl.uniform2f(this.shaders.divergence.uniforms.texelSize, this.velocity.texelSizeX, this.velocity.texelSizeY);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.velocity.read.texture);
      gl.uniform1i(this.shaders.divergence.uniforms.uVelocity, 0);
      this.blit(this.divergence.fbo);

      gl.useProgram(this.shaders.clear.program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.pressure.read.texture);
      gl.uniform1i(this.shaders.clear.uniforms.uTexture, 0);
      gl.uniform1f(this.shaders.clear.uniforms.value, CONFIG.pressureDissipation);
      this.blit(this.pressure.write.fbo);
      this.pressure.swap();

      gl.useProgram(this.shaders.pressure.program);
      gl.uniform2f(this.shaders.pressure.uniforms.texelSize, this.velocity.texelSizeX, this.velocity.texelSizeY);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.divergence.texture);
      gl.uniform1i(this.shaders.pressure.uniforms.uDivergence, 1);
      for (let i = 0; i < CONFIG.pressureIterations; i += 1) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.pressure.read.texture);
        gl.uniform1i(this.shaders.pressure.uniforms.uPressure, 0);
        this.blit(this.pressure.write.fbo);
        this.pressure.swap();
      }

      gl.useProgram(this.shaders.gradientSubtract.program);
      gl.uniform2f(this.shaders.gradientSubtract.uniforms.texelSize, this.velocity.texelSizeX, this.velocity.texelSizeY);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.pressure.read.texture);
      gl.uniform1i(this.shaders.gradientSubtract.uniforms.uPressure, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.velocity.read.texture);
      gl.uniform1i(this.shaders.gradientSubtract.uniforms.uVelocity, 1);
      this.blit(this.velocity.write.fbo);
      this.velocity.swap();

      gl.useProgram(this.shaders.advection.program);
      gl.uniform2f(this.shaders.advection.uniforms.texelSize, this.velocity.texelSizeX, this.velocity.texelSizeY);
      gl.uniform2f(this.shaders.advection.uniforms.dyeTexelSize, this.velocity.texelSizeX, this.velocity.texelSizeY);
      gl.uniform1f(this.shaders.advection.uniforms.dt, dt);
      gl.uniform1f(this.shaders.advection.uniforms.dissipation, CONFIG.velocityDissipation);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.velocity.read.texture);
      gl.uniform1i(this.shaders.advection.uniforms.uVelocity, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.velocity.read.texture);
      gl.uniform1i(this.shaders.advection.uniforms.uSource, 1);
      this.blit(this.velocity.write.fbo);
      this.velocity.swap();

      gl.viewport(0, 0, this.dye.width, this.dye.height);
      gl.uniform2f(this.shaders.advection.uniforms.texelSize, this.velocity.texelSizeX, this.velocity.texelSizeY);
      gl.uniform2f(this.shaders.advection.uniforms.dyeTexelSize, this.dye.texelSizeX, this.dye.texelSizeY);
      gl.uniform1f(this.shaders.advection.uniforms.dissipation, CONFIG.densityDissipation);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.velocity.read.texture);
      gl.uniform1i(this.shaders.advection.uniforms.uVelocity, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.dye.read.texture);
      gl.uniform1i(this.shaders.advection.uniforms.uSource, 1);
      this.blit(this.dye.write.fbo);
      this.dye.swap();
    }

    render() {
      const gl = this.gl;
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(this.shaders.display.program);
      gl.uniform2f(this.shaders.display.uniforms.texelSize, this.dye.texelSizeX, this.dye.texelSizeY);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.dye.read.texture);
      gl.uniform1i(this.shaders.display.uniforms.uTexture, 0);
      gl.uniform1f(this.shaders.display.uniforms.intensity, CONFIG.bloomGain + this.audioState.rms * 1.8);
      gl.uniform1f(this.shaders.display.uniforms.beat, this.audioState.beat);
      this.blit(null);
    }

    tick(time) {
      if (!this.isRunning) {
        return;
      }

      const dt = clamp((time - this.lastTime) / 1000, 0.001, 0.033);
      this.lastTime = time;
      this.resize();
      this.updateAudioFeatures();
      this.applySplats();
      this.step(dt);
      this.render();
      requestAnimationFrame((nextTime) => this.tick(nextTime));
    }

    installCanvasFallback() {
      this.attachPointerListeners();
      const context = this.canvas.getContext("2d");
      if (!context) {
        return;
      }

      const particles = Array.from({ length: 160 }, () => ({
        x: Math.random(),
        y: Math.random(),
        vx: 0,
        vy: 0,
        hue: 165 + Math.random() * 80,
      }));

      const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.canvas.width = Math.floor(this.canvas.clientWidth * dpr);
        this.canvas.height = Math.floor(this.canvas.clientHeight * dpr);
      };
      resize();
      window.addEventListener("resize", resize, { passive: true });

      this.isReady = true;
      this.start = async () => {
        await this.initAudio();
        const draw = () => {
          this.updateAudioFeatures();
          context.clearRect(0, 0, this.canvas.width, this.canvas.height);
          context.globalCompositeOperation = "lighter";
          for (const particle of particles) {
            const pull = 0.001 + this.audioState.beat * 0.006;
            particle.vx += (Math.random() - 0.5) * pull + (this.pointer.x - particle.x) * 0.0008 * this.pointer.speed;
            particle.vy += (Math.random() - 0.5) * pull + (this.pointer.y - particle.y) * 0.0008 * this.pointer.speed;
            particle.vx *= 0.985;
            particle.vy *= 0.985;
            particle.x = (particle.x + particle.vx + 1) % 1;
            particle.y = (particle.y + particle.vy + 1) % 1;
            const radius = (10 + this.audioState.vocalPulse * 32 + this.audioState.beat * 42) * (this.canvas.width / 1280);
            const gradient = context.createRadialGradient(
              particle.x * this.canvas.width,
              particle.y * this.canvas.height,
              0,
              particle.x * this.canvas.width,
              particle.y * this.canvas.height,
              radius,
            );
            gradient.addColorStop(0, `hsla(${particle.hue}, 100%, 70%, 0.42)`);
            gradient.addColorStop(1, "rgba(0,0,0,0)");
            context.fillStyle = gradient;
            context.beginPath();
            context.arc(particle.x * this.canvas.width, particle.y * this.canvas.height, radius, 0, Math.PI * 2);
            context.fill();
          }
          requestAnimationFrame(draw);
        };
        draw();
      };
    }
  }

  window.AudioFluidVisualizer = AudioFluidVisualizer;
  document.documentElement.dataset.fluidVisualizer = "loaded";
})();
