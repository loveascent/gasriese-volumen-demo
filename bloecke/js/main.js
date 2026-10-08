// Block Main: verbindet Oberfläche, Renderer und Nachbild; Schleife mit progressiver Akkumulation. Test-Zugriff: window.__arg.
import { neuW, KARTEN } from './parameter.js';
import { baueOberflaeche } from './oberflaeche.js';
import { ladeKarte, platzhalter } from './bild.js';
import { Renderer } from './renderer.js';
import { Nachbild } from './nachbild.js';

const st = document.getElementById('st');
const zeigeFehler = (t) => { const f = document.getElementById('fehler'); f.style.display = 'block'; f.textContent = t; };

async function main() {
  if (!navigator.gpu) { zeigeFehler('WebGPU nicht verfügbar (https oder localhost + aktueller Chrome nötig).'); return; }
  const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
  if (!adapter) { zeigeFehler('Kein WebGPU-Adapter.'); return; }
  const device = await adapter.requestDevice();
  device.addEventListener?.('uncapturederror', (e) => zeigeFehler('GPU-Fehler: ' + e.error.message));
  const gpuName = `${adapter.info.vendor} ${adapter.info.architecture}`;
  const cv = document.getElementById('cv'); const ctx = cv.getContext('webgpu');
  const format = navigator.gpu.getPreferredCanvasFormat();
  ctx.configure({ device, format, alphaMode: 'opaque' });

  const R = new Renderer(device);
  const N = new Nachbild(device, format, R.q);
  for (const [n, m] of [['Rechnen', R.module[0]], ['HDR', R.module[1]], ['Bloom', N.module[0]], ['Kino', N.module[1]]]) {
    const fe = (await m.getCompilationInfo()).messages.filter((x) => x.type === 'error');
    if (fe.length) { zeigeFehler(`WGSL ${n}:\n` + fe.map((x) => `${x.lineNum}:${x.linePos} ${x.message}`).join('\n')); return; }
  }

  const W = neuW();
  let dirty = true, postDirty = true, frame = 0, texInfo = '', rw = 0, rh = 0;
  R.setzeKarte(platzhalter(device));

  async function karte(quelle, name) {
    try { const k = await ladeKarte(device, quelle, name); R.setzeKarte(k.tex); texInfo = k.info; }
    catch (e) { texInfo = 'Bild-Fehler: ' + e.message; }
    dirty = true;
  }
  function groesse() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(64, Math.min(2560, Math.floor(innerWidth * dpr * W.skala)));
    const h = Math.max(64, Math.floor(w * innerHeight / innerWidth));
    if (w === rw && h === rh && R.acc) return;
    rw = w; rh = h; cv.width = w; cv.height = h;
    R.groesse(w, h); N.groesse(w, h); dirty = true;
  }
  const ui = baueOberflaeche(W, {
    aendert: (art) => { if (art === 'post') postDirty = true; else dirty = true; },
    karte: (i) => karte(KARTEN[i].url, KARTEN[i].name),
    datei: (f) => karte(f, f.name),
    groesse,
  });
  window.__arg = { W, setze: (o) => { Object.assign(W, o); ui.sync(); groesse(); dirty = true; }, karte, stand: () => ({ frame, gpuName, texInfo, rw, rh }) };

  groesse();
  await karte(KARTEN[W.karte].url, KARTEN[W.karte].name);
  let tLetzt = performance.now(), ms = 0;
  function bild() {
    if (dirty) { frame = 0; dirty = false; postDirty = true; }
    const fertig = frame * W.spp >= W.maxS;
    if (!fertig || postDirty) {
      R.gruppen(N.hdr);
      const enc = device.createCommandEncoder();
      R.kodiere(enc, W, frame, !fertig);
      N.kodiere(enc, ctx.getCurrentTexture().createView());
      device.queue.submit([enc.finish()]);
      if (!fertig) frame++;
      postDirty = false;
    }
    const t = performance.now(); ms = ms * 0.9 + (t - tLetzt) * 0.1; tLetzt = t;
    st.textContent = `${gpuName} · ${rw}×${rh} · Samples ${Math.min(frame * W.spp, W.maxS)}/${W.maxS} · ${fertig ? 'fertig' : ms.toFixed(0) + ' ms/Bild'} · ${texInfo}`;
    requestAnimationFrame(bild);
  }
  requestAnimationFrame(bild);
}
main().catch((e) => zeigeFehler('Fehler: ' + (e.stack || e)));
