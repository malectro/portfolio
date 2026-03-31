const MAX_RIPPLES = 10;
const DPR = Math.min(window.devicePixelRatio || 1, 1.5);

const VERT = `#version 300 es
  in vec2 a_position;
  out vec2 v_uv;
  void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const FRAG = `#version 300 es
  precision mediump float;

  in vec2 v_uv;
  out vec4 fragColor;

  uniform float u_time;
  uniform vec2 u_resolution;
  uniform int u_dark;

  #define MAX_RIPPLES 10
  uniform vec2 u_ripple_center[MAX_RIPPLES];
  uniform float u_ripple_start[MAX_RIPPLES];
  uniform float u_ripple_mag[MAX_RIPPLES];
  uniform int u_ripple_count;

  #define PI 3.14159265359
  #define TAU 6.28318530718

  float basicWave(vec2 point, vec2 dir, float amplitude, float wavelength, float speed) {
    return amplitude * sin(
      wavelength * dot(point, dir) + u_time * speed
    );
  }

  float rippleWave(vec2 point, vec2 center, float startTime, float magnitude) {
    float dist = distance(center, point);
    float rippleTime = u_time - startTime;
    float speed = 0.3;
    float radius = speed * rippleTime * u_resolution.x;

    if (dist > radius) return 0.0;

    float secondsPerCycle = 0.5;
    float radPerDist = (rippleTime - dist / (speed * u_resolution.x)) / secondsPerCycle;
    float rampUp = clamp((radius - dist) / 40.0, 0.0, 1.0);
    float fadeOut = magnitude;

    return rampUp * fadeOut * 15.0 * sin(radPerDist * TAU);
  }

  void main() {
    vec2 uv = v_uv;
    vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
    vec2 pos = uv * aspect * u_resolution.y;

    // Three directional waves
    float h = 0.0;
    h += basicWave(pos, normalize(vec2(1.0, 0.0)), 10.0, 0.008, 0.4);
    h += basicWave(pos, normalize(vec2(-1.0, 1.0)), 8.0, 0.015, 0.3);
    h += basicWave(pos, normalize(vec2(2.0, -8.0)), 12.0, 0.004, 0.5);

    // Click ripples
    for (int i = 0; i < MAX_RIPPLES; i++) {
      if (i >= u_ripple_count) break;
      vec2 center = u_ripple_center[i] * aspect * u_resolution.y;
      h += rippleWave(pos, center, u_ripple_start[i], u_ripple_mag[i]);
    }

    // Normalize height to ~[-1, 1]
    float n = h / 30.0;

    // Color palettes
    vec3 bgLight = vec3(0.929, 0.929, 0.929); // #ededed
    vec3 bgDark  = vec3(0.110, 0.110, 0.110); // #1c1c1c

    // Light mode: subtle purple/gold/rose washes
    vec3 lightA = vec3(0.898, 0.694, 0.753); // rose-light
    vec3 lightB = vec3(0.690, 0.631, 0.784); // opal-light
    vec3 lightC = vec3(1.000, 0.808, 0.447); // gold-light

    // Dark mode: muted purple/blue tones
    vec3 darkA = vec3(0.412, 0.357, 0.537); // opal-dark
    vec3 darkB = vec3(0.153, 0.757, 0.757); // blue-dark
    vec3 darkC = vec3(0.671, 0.298, 0.733); // purple-dark

    vec3 bg, colA, colB, colC;
    if (u_dark == 1) {
      bg = bgDark; colA = darkA; colB = darkB; colC = darkC;
    } else {
      bg = bgLight; colA = lightA; colB = lightB; colC = lightC;
    }

    // Map wave height to color blend
    float t = n * 0.5 + 0.5; // remap to [0, 1]
    vec3 accent;
    if (t < 0.33) {
      accent = mix(colA, colB, t / 0.33);
    } else if (t < 0.66) {
      accent = mix(colB, colC, (t - 0.33) / 0.33);
    } else {
      accent = mix(colC, colA, (t - 0.66) / 0.34);
    }

    // Very subtle blend — mostly background with a hint of color
    float intensity = 0.12 + 0.08 * abs(n);
    vec3 color = mix(bg, accent, intensity);

    fragColor = vec4(color, 1.0);
  }
`;

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('Ripple shader error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl) {
  const vs = createShader(gl, gl.VERTEX_SHADER, VERT);
  const fs = createShader(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;

  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn('Ripple program error:', gl.getProgramInfoLog(program));
    return null;
  }
  return program;
}

function getUniforms(gl, program) {
  const uniforms = {
    time: gl.getUniformLocation(program, 'u_time'),
    resolution: gl.getUniformLocation(program, 'u_resolution'),
    dark: gl.getUniformLocation(program, 'u_dark'),
    rippleCount: gl.getUniformLocation(program, 'u_ripple_count'),
    rippleCenters: [],
    rippleStarts: [],
    rippleMags: [],
  };

  for (let i = 0; i < MAX_RIPPLES; i++) {
    uniforms.rippleCenters[i] = gl.getUniformLocation(program, `u_ripple_center[${i}]`);
    uniforms.rippleStarts[i] = gl.getUniformLocation(program, `u_ripple_start[${i}]`);
    uniforms.rippleMags[i] = gl.getUniformLocation(program, `u_ripple_mag[${i}]`);
  }

  return uniforms;
}

function setupGeometry(gl, program) {
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1, 3, -1, -1, 3
  ]), gl.STATIC_DRAW);

  const aPos = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
}

export function initRipple() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.createElement('canvas');
  canvas.id = 'ripple-canvas';
  document.body.prepend(canvas);

  const gl = canvas.getContext('webgl2');
  if (!gl) return;

  // Dark mode detection
  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  let isDark = darkQuery.matches;
  darkQuery.addEventListener('change', (e) => { isDark = e.matches; });

  // Resize handler
  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.floor(w * DPR);
    canvas.height = Math.floor(h * DPR);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  resize();
  window.addEventListener('resize', resize);

  // Shader program
  const program = createProgram(gl);
  if (!program) return;
  gl.useProgram(program);

  setupGeometry(gl, program);
  const uniforms = getUniforms(gl, program);

  // Ripple state
  const ripples = [];
  const startTime = performance.now() / 1000;

  function addRipple(x, y) {
    const now = performance.now() / 1000 - startTime;
    const ux = x / window.innerWidth;
    const uy = 1.0 - y / window.innerHeight;

    if (ripples.length >= MAX_RIPPLES) {
      let weakest = 0;
      for (let i = 1; i < ripples.length; i++) {
        if (ripples[i].mag < ripples[weakest].mag) weakest = i;
      }
      ripples[weakest] = { cx: ux, cy: uy, start: now, mag: 1.0 };
    } else {
      ripples.push({ cx: ux, cy: uy, start: now, mag: 1.0 });
    }
  }

  document.addEventListener('pointerdown', (e) => {
    if (e.clientY < window.innerHeight) {
      addRipple(e.clientX, e.clientY);
    }
  });

  // Animation loop
  let faded = false;
  function frame() {
    requestAnimationFrame(frame);
    if (document.hidden) return;

    const now = performance.now() / 1000 - startTime;

    gl.uniform1f(uniforms.time, now);
    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
    gl.uniform1i(uniforms.dark, isDark ? 1 : 0);

    // Decay ripples
    for (let i = ripples.length - 1; i >= 0; i--) {
      ripples[i].mag *= 0.995;
      if (ripples[i].mag < 0.01) {
        ripples.splice(i, 1);
      }
    }

    gl.uniform1i(uniforms.rippleCount, ripples.length);
    for (let i = 0; i < ripples.length; i++) {
      gl.uniform2f(uniforms.rippleCenters[i], ripples[i].cx, ripples[i].cy);
      gl.uniform1f(uniforms.rippleStarts[i], ripples[i].start);
      gl.uniform1f(uniforms.rippleMags[i], ripples[i].mag);
    }

    gl.drawArrays(gl.TRIANGLES, 0, 3);

    if (!faded) {
      faded = true;
      requestAnimationFrame(() => { canvas.style.opacity = '1'; });
    }
  }

  requestAnimationFrame(frame);
}
