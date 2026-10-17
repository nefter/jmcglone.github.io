// Hero WebGL background. Loaded as a module on the home page only.
// three.js is imported lazily so it never blocks first paint.
// Static CSS gradient fallback stays in place when: reduced motion,
// no WebGL, or the module import fails.

(function () {
  'use strict';

  var canvas = document.getElementById('hero-canvas');
  if (!canvas) return;

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return; // keep CSS gradient fallback

  var start = function () {
    import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js')
      .then(init)
      .catch(function () { /* CSS gradient fallback stays */ });
  };

  if ('requestIdleCallback' in window) {
    requestIdleCallback(start, { timeout: 2000 });
  } else {
    setTimeout(start, 300);
  }

  function init(THREE) {
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: false,
        powerPreference: 'high-performance'
      });
    } catch (e) {
      return; // no WebGL: CSS gradient fallback stays
    }

    var scene = new THREE.Scene();
    var camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    var uniforms = {
      uTime: { value: 0 },
      uRes: { value: new THREE.Vector2(1, 1) },
      uMouse: { value: new THREE.Vector2(0, 0) }
    };

    var material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: [
        'varying vec2 vUv;',
        'void main() {',
        '  vUv = uv;',
        '  gl_Position = vec4(position.xy, 0.0, 1.0);',
        '}'
      ].join('\n'),
      fragmentShader: [
        'precision highp float;',
        'uniform float uTime;',
        'uniform vec2 uRes;',
        'uniform vec2 uMouse;',
        '',
        '// Simplex noise 2D (Ashima Arts / Stefan Gustavson, public domain)',
        'vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }',
        'vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }',
        'vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }',
        'float snoise(vec2 v) {',
        '  const vec4 C = vec4(0.211324865405187, 0.366025403784439,',
        '                      -0.577350269189626, 0.024390243902439);',
        '  vec2 i = floor(v + dot(v, C.yy));',
        '  vec2 x0 = v - i + dot(i, C.xx);',
        '  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);',
        '  vec4 x12 = x0.xyxy + C.xxzz;',
        '  x12.xy -= i1;',
        '  i = mod289(i);',
        '  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))',
        '                        + i.x + vec3(0.0, i1.x, 1.0));',
        '  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),',
        '                           dot(x12.zw, x12.zw)), 0.0);',
        '  m = m * m;',
        '  m = m * m;',
        '  vec3 x = 2.0 * fract(p * C.www) - 1.0;',
        '  vec3 h = abs(x) - 0.5;',
        '  vec3 ox = floor(x + 0.5);',
        '  vec3 a0 = x - ox;',
        '  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);',
        '  vec3 g;',
        '  g.x = a0.x * x0.x + h.x * x0.y;',
        '  g.yz = a0.yz * x12.xz + h.yz * x12.yw;',
        '  return 130.0 * dot(m, g);',
        '}',
        '',
        'float fbm(vec2 p) {',
        '  float v = 0.0;',
        '  float a = 0.5;',
        '  for (int i = 0; i < 4; i++) {',
        '    v += a * snoise(p);',
        '    p = p * 2.03 + vec2(11.7, 5.3);',
        '    a *= 0.5;',
        '  }',
        '  return v;',
        '}',
        '',
        'void main() {',
        '  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;',
        '  float t = uTime * 0.045;',
        '  vec2 q = uv * 1.5 + vec2(0.0, t * 0.3);',
        '',
        '  // domain warp',
        '  vec2 w = vec2(fbm(q + t), fbm(q - t * 0.7 + 5.2));',
        '  float n = fbm(q + 1.8 * w);',
        '  float n2 = fbm(q * 2.1 - w * 1.3 - t);',
        '',
        '  vec3 base = vec3(0.043, 0.055, 0.149);',
        '  vec3 indigo = vec3(0.263, 0.379, 0.878);',
        '  vec3 violet = vec3(0.486, 0.227, 0.929);',
        '  vec3 cyan = vec3(0.133, 0.827, 0.933);',
        '  vec3 warm = vec3(0.961, 0.655, 0.141);',
        '',
        '  vec3 col = base;',
        '  col += indigo * smoothstep(-0.15, 0.85, n) * 0.50;',
        '  col += violet * smoothstep(0.05, 0.95, n2) * 0.32;',
        '  col += cyan * smoothstep(0.35, 0.95, n * n2) * 0.38;',
        '  col += warm * pow(max(n2, 0.0), 3.0) * 0.10;',
        '',
        '  // soft glow that follows the pointer',
        '  vec2 m = (uMouse - 0.5 * uRes) / uRes.y;',
        '  col += cyan * 0.14 * exp(-4.5 * length(uv - m));',
        '',
        '  // vignette, keeps the edges calm and text legible',
        '  col *= 1.0 - 0.45 * dot(uv, uv);',
        '',
        '  gl_FragColor = vec4(col, 1.0);',
        '}'
      ].join('\n')
    });

    var mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);

    // Cap pixel ratio: plenty of fidelity for a soft gradient shader
    function devicePixelRatio() {
      var dpr = window.devicePixelRatio || 1;
      if (window.innerWidth < 768) return Math.min(dpr, 1.25);
      return Math.min(dpr, 1.75);
    }

    function resize() {
      var w = canvas.clientWidth;
      var h = canvas.clientHeight;
      renderer.setPixelRatio(devicePixelRatio());
      renderer.setSize(w, h, false);
      uniforms.uRes.value.set(w * devicePixelRatio(), h * devicePixelRatio());
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });

    // Smoothed pointer position (canvas space, device px)
    var mouseTarget = new THREE.Vector2(0, 0);
    var mouse = new THREE.Vector2(0, 0);
    window.addEventListener('pointermove', function (e) {
      var rect = canvas.getBoundingClientRect();
      mouseTarget.set(
        (e.clientX - rect.left) * devicePixelRatio(),
        (rect.height - (e.clientY - rect.top)) * devicePixelRatio()
      );
    }, { passive: true });

    // Pause rendering when tab hidden or hero off-screen
    var running = false;
    var rafId = null;

    function tick(now) {
      uniforms.uTime.value = now * 0.001;
      mouse.lerp(mouseTarget, 0.05);
      uniforms.uMouse.value.copy(mouse);
      renderer.render(scene, camera);
      rafId = requestAnimationFrame(tick);
    }

    function play() {
      if (running) return;
      running = true;
      rafId = requestAnimationFrame(tick);
    }

    function pause() {
      if (!running) return;
      running = false;
      cancelAnimationFrame(rafId);
    }

    document.addEventListener('visibilitychange', function () {
      document.hidden ? pause() : play();
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries[0].isIntersecting ? play() : pause();
      }, { threshold: 0 }).observe(canvas);
    } else {
      play();
    }
  }
})();
