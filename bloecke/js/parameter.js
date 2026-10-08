// Block Parameter: Regler-Tabelle, Standardwerte, Kameramathematik und das Packen in die zwei Uniform-Felder P (Rechnen) und Q (Kino).
// Eintrag: [Gruppe, Beschriftung, Schlüssel, min, max, Schritt, Standard, Einheit, 'post' = ändert nur die Nachbearbeitung, setzt die Samples nicht zurück]
export const SPEC = [
  ['g_farbe', 'Drehung Z (Objekt)', 'rotZ', 0, 360, 1, 0, '°'],
  ['g_dichte', 'Mix-Faktor f (Textur → Verzerrung)', 'mixF', 0, 1, 0.001, 0.054, ''],
  ['g_dichte', 'ColorRamp Weiß-Position t', 'rampT', 0, 0.95, 0.001, 0.2, ''],
  ['g_dichte', 'Invert-Faktor', 'invert', 0, 1, 1, 0, ''],
  ['g_dichte', 'Würfel-Halbkante R (Szenen-Einh.)', 'R', 10, 100, 1, 50, ''],
  ['g_volumen', 'Hue (0,5 = neutral)', 'hue', 0, 1, 0.005, 0.5, ''],
  ['g_volumen', 'Saturation', 'sat', 0, 3, 0.01, 1.15, ''],
  ['g_volumen', 'Value', 'val', 0, 3, 0.01, 1, ''],
  ['g_volumen', 'Dichte Planet', 'dichte', 0.05, 20, 0.05, 1, ''],
  ['g_volumen', 'Anisotropie g (HG)', 'aniso', -0.9, 0.9, 0.01, 0, ''],
  ['g_atm', 'Dichte Atmosphäre', 'atmD', 0, 0.3, 0.001, 0.03, ''],
  ['g_atm', 'Rampe Weiß-Position', 'atmW', 0.05, 1, 0.01, 1, ''],
  ['g_atm', 'Farbe R', 'atmR', 0, 1, 0.01, 0.9, ''],
  ['g_atm', 'Farbe G', 'atmG', 0, 1, 0.01, 0.75, ''],
  ['g_atm', 'Farbe B', 'atmB', 0, 1, 0.01, 0.7, ''],
  ['g_licht', 'Sonne Stärke (W/m²)', 'sunS', 0, 40, 0.5, 10, ''],
  ['g_licht', 'Sonne Azimut', 'sunAz', 0, 360, 1, 100, '°'],
  ['g_licht', 'Sonne Höhe', 'sunEl', -90, 90, 1, 8, '°'],
  ['g_licht', 'Belichtung', 'expo', 0.1, 8, 0.05, 1.3, '', 'post'],
  ['g_licht', 'Kamera Entfernung', 'dist', 80, 600, 1, 260, ''],
  ['g_licht', 'Bildwinkel', 'fov', 5, 90, 1, 30, '°'],
  ['g_licht', 'Schrittweite (Szenen-Einh.)', 'schritt', 0.05, 2, 0.01, 0.3, ''],
  ['g_licht', 'Samples pro Bild', 'spp', 1, 8, 1, 1, ''],
  ['g_licht', 'Auflösung (Faktor)', 'skala', 0.25, 2, 0.05, 1, ''],
  ['g_licht', 'Endsamples', 'maxS', 16, 4096, 16, 256, ''],
  ['g_proc', 'Voronoi-Skala', 'pSkala', 1, 40, 0.5, 10, ''],
  ['g_proc', 'Noise-Skala', 'pNoise', 0.5, 20, 0.5, 4, ''],
  ['g_proc', 'Verzerrung (Noise → Voronoi)', 'pDist', 0, 6, 0.05, 1.2, ''],
  ['g_proc', 'Streckung Z (Bänder)', 'pZ', 0.1, 8, 0.05, 3, ''],
  ['g_proc', 'Noise-Detail', 'pDet', 0, 7, 1, 3, ''],
  ['g_kino', 'Bloom Stärke', 'bloom', 0, 1.5, 0.01, 0.35, '', 'post'],
  ['g_kino', 'Bloom Schwelle', 'bloomS', 0.1, 4, 0.05, 0.9, '', 'post'],
  ['g_kino', 'Filmkorn', 'korn', 0, 0.15, 0.002, 0.018, '', 'post'],
  ['g_kino', 'Vignette', 'vign', 0, 1, 0.01, 0.45, '', 'post'],
  ['g_kino', 'Farbsaum (Linse)', 'chroma', 0, 3, 0.05, 0.5, '', 'post'],
  ['g_kino', 'Grading (Teal/Orange)', 'grade', 0, 1, 0.01, 0.5, '', 'post'],
  ['g_kino', 'Sterne', 'sterne', 0, 1.5, 0.05, 0.9, '', 'post'],
];
export const STD = Object.fromEntries(SPEC.map((s) => [s[2], s[6]]));
export const NEBEN = { yaw: 0.25, pitch: 0.12, modus: 0, zentriert: 1, rampe: 0, format: 2.39, karte: 0 };
export const neuW = () => ({ ...STD, ...NEBEN });
export const IST_POST = new Set(SPEC.filter((s) => s[8] === 'post').map((s) => s[2]));

// Bildkarten (Lizenz/Quelle: siehe README, Abschnitt Daten)
export const KARTEN = [
  { name: 'Jupiter 4096×2048 (Solar System Scope, CC BY 4.0)', url: 'karten/jupiter_4k_solarsystemscope.jpg' },
];

const norm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
const kreuz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

// Rechen-Uniform P (12 vec4): siehe WGSL-Blöcke (Index P[i].xyzw)
export function schreibeP(W, rw, rh, frame) {
  const cp = Math.cos(W.pitch), sp = Math.sin(W.pitch);
  const pos = [W.dist * Math.sin(W.yaw) * cp, -W.dist * Math.cos(W.yaw) * cp, W.dist * sp];
  const fwd = norm(pos.map((x) => -x));
  const right = norm(kreuz(fwd, [0, 0, 1])); const up = kreuz(right, fwd);
  const az = W.sunAz * Math.PI / 180, el = W.sunEl * Math.PI / 180;
  const sun = [Math.sin(az) * Math.cos(el), -Math.cos(az) * Math.cos(el), Math.sin(el)];
  const u = new Float32Array(48);
  u.set([rw, rh, frame, W.spp], 0);
  u.set([...pos, Math.tan(W.fov * Math.PI / 360)], 4);
  u.set([...right, W.modus], 8);
  u.set([...up, W.zentriert], 12);
  u.set([...fwd, W.rotZ * Math.PI / 180], 16);
  u.set([...sun, W.sunS], 20);
  u.set([W.R, W.rampT, W.mixF, W.invert], 24);
  u.set([W.hue, W.sat, W.val, W.schritt], 28);
  u.set([W.dichte, W.atmD, W.atmW, W.aniso], 32);
  u.set([W.atmR, W.atmG, W.atmB, 1024], 36);
  u.set([W.pSkala, W.pNoise, W.pDist, W.pZ], 40);
  u.set([W.expo, 0, W.pDet, W.rampe], 44);
  return u;
}
// Kino-Uniform Q (4 vec4)
export function schreibeQ(W, frame) {
  return new Float32Array([W.bloom, W.bloomS, W.korn, W.vign, W.chroma, W.format, W.sterne, W.grade, frame, 0, 0, 0, 0, 0, 0, 0]);
}
