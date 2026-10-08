// Block Main: verbindet Oberfläche, Renderer und Nachbild. Zwei Betriebsarten:
//  Vorschau   – bei Bewegung/Reglern: ganzes Bild in groben Blöcken (Blockgröße regelt sich auf ~60 fps),
//  Verfeinern – in Ruhe: volle Auflösung, je Bild nur so viele Zeilen, wie das Zeitbudget erlaubt (Zeilenzahl regelt sich auf ~60 fps).
// Test-Zugriff: window.__arg.
import { neuW, KARTEN } from './parameter.js';
import { baueOberflaeche } from './oberflaeche.js';
import { ladeKarte, platzhalter } from './bild.js';
import { Renderer } from './renderer.js';
import { Nachbild } from './nachbild.js';
import { t as tr } from './sprache.js';

const st = document.getElementById('st');
const zeigeFehler = (t) => { const f = document.getElementById('fehler'); f.style.display = 'block'; f.textContent = t; };
const BLOCK = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24];   // mögliche Blockgrößen der Vorschau
const RUHE_MS = 150;                                         // so lange nichts geändert → Verfeinern
const ZIEL_MS = 22;                                          // darüber: zu langsam (60 fps = 16,7 ms, Puffer für Schwankung)

async function main() {
  if (!navigator.gpu) { zeigeFehler('WebGPU nicht verfügbar (https oder localhost + aktueller Chrome nötig).'); return; }
  const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
  if (!adapter) { zeigeFehler('Kein WebGPU-Adapter.'); return; }
  const device = await adapter.requestDevice();
  device.addEventListener?.('uncapturederror', (e) => zeigeFehler('GPU-Fehler: ' + e.error.message));
  const gpuName = `${adapter.info.vendor} ${adapter.info.architecture}`;
  const maybeIgpu = /amd|intel/i.test(adapter.info.vendor);
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
  let texInfo = '', rw = 0, rh = 0;
  // Zustand der Schleife
  let modus = 'vorschau', stufe = 3, rows = 64, sweep = 0, cursor = 0, seed = 0, fertig = false, postDirty = true;
  let letzteAenderung = performance.now(), ema = 16.7, tLetzt = performance.now(), nr = 0, sperreBis = 0, letzteSteigerung = -1e9, gut = 0;
  R.setzeKarte(platzhalter(device));

  const aendere = () => { modus = 'vorschau'; sweep = 0; cursor = 0; fertig = false; letzteAenderung = performance.now(); };
  async function karte(quelle, name) {
    try { const k = await ladeKarte(device, quelle, name); R.setzeKarte(k.tex); texInfo = k.info; }
    catch (e) { texInfo = 'Bild-Fehler: ' + e.message; }
    aendere();
  }
  function groesse() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const bw = Math.max(1, cv.clientWidth), bh = Math.max(1, cv.clientHeight);
    const w = Math.max(64, Math.min(2560, Math.floor(bw * dpr * W.skala))), h = Math.max(64, Math.floor(w * bh / bw));
    if (w === rw && h === rh && R.acc) return;
    rw = w; rh = h; cv.width = w; cv.height = h;
    R.groesse(w, h); N.groesse(w, h); rows = Math.max(8, Math.floor(h / 8)); aendere();
  }
  const ui = baueOberflaeche(W, {
    aendert: (art) => { if (art === 'post') postDirty = true; else aendere(); },
    karte: (i) => karte(KARTEN[i].url, KARTEN[i].name),
    datei: (f) => karte(f, f.name),
    groesse,
  });
  new ResizeObserver(groesse).observe(cv);
  window.__arg = { W, setze: (o) => { Object.assign(W, o); ui.sync(); groesse(); aendere(); }, karte, stand: () => ({ frame: sweep * W.spp, gpuName, texInfo, rw, rh, modus, block: BLOCK[stufe], rows, ema: +ema.toFixed(1), fertig }) };

  groesse();
  await karte(KARTEN[W.karte].url, KARTEN[W.karte].name);

  // Regler: hält die Bildzeit bei ~60 fps. Zu langsam → weniger Arbeit je Bild; lange gut → vorsichtig mehr (mit Sperre nach Fehlversuch).
  function regle() {
    nr++;
    const verfeinern = modus === 'verfeinern';
    if (ema > ZIEL_MS) {
      if (nr - letzteSteigerung < 60) sperreBis = nr + 900;     // gerade erst gesteigert und gescheitert → eine Weile nicht wieder versuchen
      if (verfeinern) rows = Math.max(4, Math.floor(rows * 0.75)); else stufe = Math.min(BLOCK.length - 1, stufe + 1);
      gut = 0; ema = 16.7;
    } else if (ema < ZIEL_MS - 4) {
      gut++;
      if (gut > 45 && nr >= sperreBis) {
        if (verfeinern) rows = Math.min(rh, Math.ceil(rows * 1.2)); else stufe = Math.max(0, stufe - 1);
        gut = 0; letzteSteigerung = nr;
      }
    }
  }

  function bild() {
    const jetzt = performance.now(), dt = jetzt - tLetzt; tLetzt = jetzt;
    if (dt < 250 && !document.hidden) ema = ema * 0.88 + dt * 0.12;
    if (modus === 'vorschau' && jetzt - letzteAenderung > RUHE_MS) { modus = 'verfeinern'; sweep = 0; cursor = 0; }
    const arbeitet = !fertig;
    if (arbeitet || postDirty) {
      R.gruppen(N.hdr);
      const b = BLOCK[stufe];
      let steuer;
      if (modus === 'vorschau') steuer = { modus: 0, row0: 0, rows: rh, block: b, spp: 1 };
      else steuer = { modus: sweep === 0 ? 1 : 2, row0: cursor, rows: Math.min(rows, rh - cursor), block: b, spp: W.spp };
      const enc = device.createCommandEncoder();
      R.kodiere(enc, W, ++seed, steuer, arbeitet);
      N.kodiere(enc, ctx.getCurrentTexture().createView());
      device.queue.submit([enc.finish()]);
      if (arbeitet) {
        regle();
        if (modus === 'verfeinern') {
          cursor += steuer.rows;
          if (cursor >= rh) { cursor = 0; sweep++; if (sweep * W.spp >= W.maxS) fertig = true; }
        }
      }
      postDirty = false;
    }
    const pct = Math.min(100, Math.round(((sweep + cursor / rh) * W.spp / W.maxS) * 100));
    const was = modus === 'vorschau' ? `${tr('st_prev', 'Vorschau')} 1/${BLOCK[stufe]}` : fertig ? tr('st_done', 'fertig') : `${tr('st_refine', 'Verfeinern')} ${pct}%`;
    st.textContent = `${gpuName} · ${rw}×${rh} · ${was} · ${ema.toFixed(0)} ms · ${tr('st_samples', 'Samples')} ${Math.min(sweep * W.spp, W.maxS)}/${W.maxS} · ${texInfo}` + (maybeIgpu && ema > 30 ? ' · ' + tr('st_gpu', 'Tipp: läuft vermutlich auf der integrierten Grafik – Chrome in den Windows-Grafikeinstellungen auf „Hohe Leistung“ stellen') : '');
    requestAnimationFrame(bild);
  }
  requestAnimationFrame(bild);
}
main().catch((e) => zeigeFehler('Fehler: ' + (e.stack || e)));
