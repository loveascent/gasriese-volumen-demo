// Block Oberfläche: baut die Regler aus der Tabelle, verdrahtet Auswahlfelder, Maus (Drehen/Zoom) und Datei-Ziehen. Kennt keine GPU.
import { SPEC, STD, NEBEN, IST_POST, KARTEN } from './parameter.js';
import { uebersetze, wechsleSprache } from './sprache.js';

const stellen = (sp) => (sp[5] < 0.01 ? 3 : sp[5] < 1 ? 2 : 0);

export function baueOberflaeche(W, an) {
  // an = { aendert(art), karte(index), datei(file), groesse() }
  for (const sp of SPEC) {
    const [gid, name, key, mn, mx, step, val, einh] = sp;
    const l = document.createElement('label'); l.className = 'r'; l.title = 'Doppelklick = zurücksetzen';
    l.innerHTML = `<span class="n" data-t="s_${key}">${name}</span><input type="range" min="${mn}" max="${mx}" step="${step}" value="${val}" data-k="${key}"><output>${val}${einh}</output>`;
    document.getElementById(gid).appendChild(l);
  }
  const ks = document.getElementById('karte');
  KARTEN.forEach((k, i) => ks.add(new Option(k.name, i)));
  const sync = () => {
    document.querySelectorAll('input[data-k]').forEach((e) => { const sp = SPEC.find((s) => s[2] === e.dataset.k); e.value = W[e.dataset.k]; e.nextElementSibling.textContent = (+W[e.dataset.k]).toFixed(stellen(sp)) + sp[7]; });
    for (const id of ['modus', 'zentriert', 'rampe', 'format', 'karte']) document.getElementById(id).value = W[id];
  };
  sync();
  document.getElementById('pan').addEventListener('input', (e) => {
    const k = e.target.dataset?.k; if (!k) return;
    W[k] = +e.target.value; const sp = SPEC.find((s) => s[2] === k);
    e.target.nextElementSibling.textContent = (+W[k]).toFixed(stellen(sp)) + sp[7];
    if (k === 'skala') an.groesse();
    an.aendert(IST_POST.has(k) ? 'post' : 'neu');
  });
  for (const id of ['modus', 'zentriert', 'rampe', 'format']) {
    document.getElementById(id).onchange = (e) => { W[id] = +e.target.value; an.aendert(id === 'format' ? 'post' : 'neu'); };
  }
  ks.onchange = (e) => { W.karte = +e.target.value; an.karte(W.karte); };
  // Doppelklick auf eine Reglerzeile: nur diesen Wert auf den Standard
  document.getElementById('pan').addEventListener('dblclick', (e) => {
    const k = e.target.closest?.('label.r')?.querySelector('input[data-k]')?.dataset.k; if (!k) return;
    W[k] = STD[k]; sync(); if (k === 'skala') an.groesse(); an.aendert(IST_POST.has(k) ? 'post' : 'neu');
  });
  document.getElementById('resetKamera').onclick = () => { Object.assign(W, { yaw: NEBEN.yaw, pitch: NEBEN.pitch, dist: STD.dist, fov: STD.fov }); sync(); an.aendert('neu'); };
  document.getElementById('reset').onclick = () => { Object.assign(W, STD, NEBEN); sync(); an.groesse(); an.karte(W.karte); an.aendert('neu'); };
  document.getElementById('datei').onchange = (e) => { const f = e.target.files[0]; if (f) an.datei(f); };
  addEventListener('dragover', (e) => e.preventDefault());
  addEventListener('drop', (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) an.datei(f); });
  const cv = document.getElementById('cv'); let drag = null;
  cv.addEventListener('pointerdown', (e) => { drag = [e.clientX, e.clientY]; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointerup', () => { drag = null; });
  cv.addEventListener('pointermove', (e) => {
    if (!drag) return;
    W.yaw -= (e.clientX - drag[0]) * 0.005; W.pitch = Math.max(-1.5, Math.min(1.5, W.pitch + (e.clientY - drag[1]) * 0.005));
    drag = [e.clientX, e.clientY]; an.aendert('neu');
  });
  cv.addEventListener('wheel', (e) => { e.preventDefault(); W.dist = Math.max(80, Math.min(600, W.dist * Math.exp(e.deltaY * 0.001))); sync(); an.aendert('neu'); }, { passive: false });
  addEventListener('resize', () => an.groesse());
  document.getElementById('sprache').onclick = wechsleSprache;
  uebersetze();
  return { sync };
}
