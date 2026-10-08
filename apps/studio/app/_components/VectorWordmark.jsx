'use client';

// Adapted from the Vector Wordmark — Originkit source supplied by the user.
import { useEffect, useRef, useState } from 'react';

const MAX_DPR = 2;
const REF_WIDTH = 1200;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const fract = x => x - Math.floor(x);

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;
const FRAG = `
precision mediump float;
uniform sampler2D uMap;
uniform vec2 uRes, uAtlas, uPtr, uV0, uV1, uV2;
uniform float uReach, uHalf;
uniform vec3 uText, uShade;
uniform vec4 uAccent;
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
vec2 blurRG(vec2 uv, float e) {
  vec4 sum = vec4(0.0);
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float th = radians(fi / 6.0 * 360.0);
    vec2 off = vec2(cos(th), sin(th)) * (hash(vec2(fi, uv.x + uv.y)) + e);
    sum += texture2D(uMap, uv + off * e);
  }
  return (sum / 6.0).rg;
}
vec2 segment(vec2 p, vec2 a, vec2 b) {
  vec2 ab = b - a;
  float t = clamp(dot(p - a, ab) / max(dot(ab, ab), 0.00001), 0.0, 1.0);
  return vec2(length(p - a - ab * t), t);
}
float stroke(float d, float lw, float px) { return 1.0 - smoothstep(lw, lw + px, d); }
float dashedLine(vec2 p, vec2 a, vec2 b, float lw, float px) {
  vec2 s = segment(p, a, b);
  return stroke(s.x, lw, px) * step(0.5, fract(s.y * length(b - a) * 100.0));
}
float boxEdge(vec2 p, vec2 c, float h, float lw, float px) {
  vec2 q = abs(p - c) - vec2(h);
  float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
  return stroke(abs(d), lw, px);
}
void main() {
  float aspect = uRes.x / uRes.y;
  vec2 E = (vUv * uRes - (uRes - uAtlas) * 0.5) / uAtlas;
  float inside = step(0.0, E.x) * step(E.x, 1.0) * step(0.0, E.y) * step(E.y, 1.0);
  vec2 safeUv = clamp(E, 0.0, 1.0);
  float b = clamp(1.0 - E.y * 3.5, 0.0, 1.0) * 0.008;
  vec2 soft = blurRG(safeUv, b);
  vec2 sharp = blurRG(safeUv, b * 0.1);
  float d = length((vUv - uPtr) / vec2(1.0, aspect));
  float k = 1.0 - pow(smoothstep(0.0, max(uReach, 0.0001), d), 3.0);
  float mask = mix(soft.r, sharp.g, k) * inside;
  vec3 fill = mix(uShade, uText, smoothstep(0.0, 1.0, E.y));
  vec2 P = vec2(vUv.x * aspect, vUv.y);
  float px = 1.0 / uRes.y;
  float lw = px * 0.2;
  float lines = max(max(dashedLine(P, uV0, uV1, lw, px), dashedLine(P, uV1, uV2, lw, px)), dashedLine(P, uV2, uV0, lw, px));
  float boxes = max(max(boxEdge(P, uV0, uHalf, lw, px), boxEdge(P, uV1, uHalf, lw, px)), boxEdge(P, uV2, uHalf, lw, px));
  float A = max(lines, boxes) * uAccent.a * (1.0 - vUv.y);
  vec4 card = vec4(fill * mask, mask);
  gl_FragColor = (vec4(uAccent.rgb * A, A) + card * (1.0 - A)) * pow(clamp(E.y, 0.0, 1.0), 0.7);
}`;

function programFor(gl) {
  const shaders = [];
  const program = gl.createProgram();
  try {
    for (const [type, source] of [[gl.VERTEX_SHADER, VERT], [gl.FRAGMENT_SHADER, FRAG]]) {
      const shader = gl.createShader(type);
      if (!shader) throw new Error('Shader unavailable');
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Shader compilation failed');
      gl.attachShader(program, shader);
    }
    gl.bindAttribLocation(program, 0, 'aPos');
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Shader linking failed');
    return program;
  } catch {
    gl.deleteProgram(program);
    return null;
  } finally {
    for (const shader of shaders) gl.deleteShader(shader);
  }
}

function buildAtlas(text, font, desiredPx, dpr, maxTexture) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  let px = Math.max(8, desiredPx * dpr);
  const measure = () => {
    ctx.font = `${font.style} ${font.weight} ${px}px ${font.family}`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${font.spacing * px}px`;
    const metrics = ctx.measureText(text);
    return { width: metrics.width, ascent: metrics.actualBoundingBoxAscent || px * 0.8, descent: metrics.actualBoundingBoxDescent || px * 0.22 };
  };
  let m = measure();
  const over = Math.max((m.width + px * 0.24) / maxTexture, (m.ascent + m.descent + px * 0.24) / maxTexture, 1);
  px /= over;
  m = measure();
  const pad = px * 0.12;
  canvas.width = Math.max(1, Math.ceil(m.width + pad * 2));
  canvas.height = Math.max(1, Math.ceil(m.ascent + m.descent + pad * 2));
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  measure(); // Canvas resizing resets the drawing state.
  ctx.textBaseline = 'alphabetic';
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = '#f00';
  ctx.fillText(text, pad, pad + m.ascent);
  ctx.strokeStyle = '#0f0';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(1, (m.ascent + m.descent) * 4 / 440);
  ctx.setLineDash([0, Math.max(2, (m.ascent + m.descent) * 12 / 440)]);
  ctx.strokeText(text, pad, pad + m.ascent);
  return { canvas, width: canvas.width * desiredPx / px, height: canvas.height * desiredPx / px };
}

// Resolve valid CSS colors (including custom properties) once when props change.
function color(host, value, fallback) {
  const probe = document.createElement('span');
  probe.style.color = fallback;
  probe.style.color = value;
  probe.hidden = true;
  host.append(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d');
  if (!ctx) return [1, 1, 1, 1];
  ctx.fillStyle = resolved;
  ctx.fillRect(0, 0, 1, 1);
  return Array.from(ctx.getImageData(0, 0, 1, 1).data, channel => channel / 255);
}

export default function VectorWordmark({
  text = '네티움 스튜디오', background = '#080808', textColor = '#ffffff', shade = '#b8b8b8',
  accent = 'rgba(255,255,255,0.65)', reach = 245, speed = 32, damping = 60,
  font = {}, handles = {}, style,
}) {
  const hostRef = useRef(null);
  const canvasRef = useRef(null);
  const labels = useRef([]);
  const controller = useRef(null);
  const pausedRef = useRef(false);
  const [paused, setPaused] = useState(false);
  const [ready, setReady] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [contextVersion, setContextVersion] = useState(0);
  pausedRef.current = paused;
  const family = font.fontFamily || 'Arial, Helvetica, sans-serif';
  const weight = font.fontWeight || 800;
  const fontStyle = font.fontStyle || 'normal';
  const fontSize = parseFloat(font.fontSize || '265');
  const spacing = parseFloat(font.letterSpacing || '-0.055');
  const size = handles.size ?? 86;
  const spread = handles.spread ?? 27;
  const showLabels = handles.labels !== false;

  useEffect(() => {
    const host = hostRef.current, canvas = canvasRef.current;
    if (!host || !canvas) return;
    setReady(false);
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let disposed = false, raf = 0, last = 0, intersecting = true, lost = false;
    let boxW = 1, boxH = 1, dpr = 1, dirty = true, atlas;
    let hasPointer = false, drift = 0, sweepClock = 0;
    const target = { x: -0.45, y: 0.5 }, eased = { ...target };
    const cells = Array.from({ length: 3 }, () => ({ x: -0.5, y: 0.5 }));
    const verts = cells.map(cell => ({ ...cell }));
    // GLSL 1.00 shaders use a WebGL 1 context; no WebGL 2 shader mismatch.
    const gl = canvas.getContext('webgl', { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: true, powerPreference: 'low-power' });
    if (!gl) return;
    const program = programFor(gl);
    if (!program) return;
    const quad = gl.createBuffer(), texture = gl.createTexture();
    if (!quad || !texture) { gl.deleteBuffer(quad); gl.deleteTexture(texture); gl.deleteProgram(program); return; }
    const uniforms = Object.fromEntries(['Map', 'Res', 'Atlas', 'Ptr', 'Reach', 'Half', 'Text', 'Shade', 'Accent', 'V0', 'V1', 'V2'].map(name => [name, gl.getUniformLocation(program, `u${name}`)]));
    const tc = color(host, textColor, '#fff'), sc = color(host, shade, '#bbb'), ac = color(host, accent, '#fff');
    const maxTexture = Math.min(4096, gl.getParameter(gl.MAX_TEXTURE_SIZE));
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.disable(gl.BLEND);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const sync = () => {
      if (!dirty) return;
      dirty = false;
      boxW = Math.max(1, host.clientWidth); boxH = Math.max(1, host.clientHeight);
      dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(boxW * dpr));
      canvas.height = Math.max(1, Math.round(boxH * dpr));
      const next = buildAtlas(text || ' ', { family, weight, style: fontStyle, spacing }, Math.max(8, fontSize * boxW / REF_WIDTH), dpr, maxTexture);
      if (!next) return;
      const fit = Math.min(1, boxW * 0.98 / next.width, boxH * 0.9 / next.height);
      atlas = { width: next.width * fit, height: next.height * fit };
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, next.canvas);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    };
    const snap = (x, y, cw, ch) => {
      const found = [], cx = Math.floor(x / cw), cy = Math.floor(y / ch);
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
        const px = (cx + i + 0.5) * cw, py = (cy + j + 0.5) * ch;
        found.push({ x: px, y: py, distance: Math.hypot(px - x, py - y) });
      }
      found.sort((a, b) => a.distance - b.distance);
      cells.forEach((cell, i) => Object.assign(cell, found[i + 1]));
    };
    const step = dt => {
      const rate = Math.max(0, speed) / 50, aspect = boxW / boxH;
      const cw = Math.max(0.01, spread / 100), ch = cw * 0.6;
      if (!hasPointer) {
        const band = (atlas?.height || boxH) / boxH;
        target.x += dt * 0.5 * rate;
        target.y = (1 - band) / 2 + 0.28 * band;
        if (target.x > 1.45) { target.x = -0.45; eased.x = -0.45; }
        sweepClock += dt;
        if (sweepClock >= 0.2) { sweepClock = 0; snap(target.x * aspect, target.y, cw, ch); }
      } else snap(target.x * aspect, target.y, cw, ch);
      const damp = clamp(damping / 100 * 20 * dt, 0, 1);
      eased.x += (target.x - eased.x) * damp; eased.y += (target.y - eased.y) * damp;
      drift += dt * rate;
      cells.forEach((cell, i) => {
        const sx = Math.round(cell.x / cw - 0.5), sy = Math.round(cell.y / ch - 0.5);
        const h1 = fract(Math.sin(sx * 127.1 + sy * 311.7) * 43758.5453);
        const h2 = fract(Math.sin(sx * 269.5 + sy * 183.3) * 43758.5453);
        verts[i].x = cell.x + 0.08 * cw * Math.sin(drift * 1.3 + h1 * Math.PI * 2);
        verts[i].y = cell.y + 0.04 * ch * Math.sin(drift * 1.69 + h2 * Math.PI * 2);
      });
    };
    const draw = () => {
      if (!atlas || lost) return;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(uniforms.Map, 0);
      gl.uniform2f(uniforms.Res, boxW, boxH);
      gl.uniform2f(uniforms.Atlas, atlas.width, atlas.height);
      gl.uniform2f(uniforms.Ptr, eased.x, eased.y);
      gl.uniform1f(uniforms.Reach, Math.max(1, reach) / REF_WIDTH);
      gl.uniform3fv(uniforms.Text, tc.slice(0, 3)); gl.uniform3fv(uniforms.Shade, sc.slice(0, 3));
      gl.uniform4fv(uniforms.Accent, ac);
      const handleSize = size * Math.min(1, boxW / 900);
      gl.uniform1f(uniforms.Half, handleSize / 2 / boxH);
      verts.forEach((vert, i) => {
        gl.uniform2f(uniforms[`V${i}`], vert.x, vert.y);
        const label = labels.current[i];
        if (!label) return;
        const bx = vert.x / (boxW / boxH), by = vert.y;
        label.style.transform = `translate(${bx * boxW - handleSize / 2}px,${(1 - by) * boxH - handleSize / 2}px)`;
        label.textContent = `${Math.round(clamp(bx * 100, 0, 100))}, ${Math.round(clamp(by * 100, 0, 100))}`;
      });
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    const canAnimate = () => !disposed && !lost && !motion.matches && !pausedRef.current && intersecting && !document.hidden;
    const frame = now => {
      raf = 0;
      if (!canAnimate()) return;
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      sync(); step(dt); draw();
      raf = requestAnimationFrame(frame);
    };
    const gate = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0; last = 0;
      if (canAnimate()) raf = requestAnimationFrame(frame);
    };
    const resize = () => { dirty = true; if (!lost) { sync(); draw(); } gate(); };
    const onMove = event => {
      if (pausedRef.current || motion.matches) return;
      const rect = host.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      hasPointer = true;
      target.x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
      target.y = 1 - clamp((event.clientY - rect.top) / rect.height, 0, 1);
    };
    const onLeave = () => { hasPointer = false; };
    const onMotion = () => { setReduced(motion.matches); setReady(!motion.matches && !lost); gate(); };
    const onLost = event => { event.preventDefault(); lost = true; setReady(false); gate(); };
    const onRestored = () => { if (!disposed) setContextVersion(value => value + 1); };
    const ro = new ResizeObserver(resize);
    const io = new IntersectionObserver(entries => { intersecting = entries[0].isIntersecting; gate(); });
    ro.observe(host); io.observe(host);
    host.addEventListener('pointermove', onMove); host.addEventListener('pointerleave', onLeave);
    canvas.addEventListener('webglcontextlost', onLost); canvas.addEventListener('webglcontextrestored', onRestored);
    window.addEventListener('resize', resize); document.addEventListener('visibilitychange', gate);
    motion.addEventListener('change', onMotion);
    controller.current = { gate };
    sync(); step(0); draw(); onMotion();
    document.fonts?.ready.then(() => { if (!disposed) resize(); });
    return () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      controller.current = null;
      ro.disconnect(); io.disconnect();
      host.removeEventListener('pointermove', onMove); host.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('webglcontextlost', onLost); canvas.removeEventListener('webglcontextrestored', onRestored);
      window.removeEventListener('resize', resize); document.removeEventListener('visibilitychange', gate);
      motion.removeEventListener('change', onMotion);
      gl.deleteBuffer(quad); gl.deleteTexture(texture); gl.deleteProgram(program);
    };
  }, [text, family, weight, fontStyle, fontSize, spacing, textColor, shade, accent, reach, speed, damping, size, spread, contextVersion]);

  useEffect(() => { controller.current?.gate(); }, [paused]);

  return <div className="wordmark-block">
    <div ref={hostRef} className="vector-wordmark" data-ready={ready} role="img" aria-label={`${text} 인터랙티브 워드마크`} style={{ background, ...style }}>
      <span className="wordmark-fallback" aria-hidden="true" style={{ fontFamily: family, fontWeight: weight }}>{text}</span>
      <canvas ref={canvasRef} aria-hidden="true"/>
      {showLabels && [0, 1, 2].map(i => <span key={i} ref={el => { labels.current[i] = el; }} className="wordmark-coordinate" aria-hidden="true"/>)}
    </div>
    <div className="wordmark-caption"><span><i/> IDEAS, CONNECTED.</span>{ready && !reduced ? <button type="button" onClick={() => setPaused(value => !value)} aria-pressed={paused}>{paused ? '움직임 다시 시작' : '움직임 멈추기'} <span aria-hidden="true">{paused ? '▷' : 'Ⅱ'}</span></button> : <span>FROM A SPARK TO A STORY</span>}</div>
  </div>;
}
