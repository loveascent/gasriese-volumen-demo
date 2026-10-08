// Block Sprache: Deutsch/Englisch umschaltbar. Deutsch steht im HTML bzw. in parameter.js (SPEC), hier nur die englischen Texte je Schlüssel (data-t="schlüssel").
// Sprache folgt dem Browser (de* = Deutsch, sonst Englisch), merkt sich die Wahl (nur wenn Speicher erlaubt ist).
const EN = {
  intro: 'Tech demo: own implementation of a technique shown in a public Blender tutorial (see README). No simulation: texture → density field → volume rendering, plus cinematic post-processing. Drag = rotate, wheel = zoom, H = toggle panel. Code in blocks: <code>bloecke/</code>.',
  b_reset: '↺ Reset all', b_cam: '↺ Camera', hint: 'Double-click a slider = reset only that one',
  sm_farbe: 'Colour source (image texture)', sm_dichte: 'Density field (Mix → Gradient → ColorRamp)', sm_vol: 'Colour (hue/saturation/value) & volume',
  sm_atm: 'Atmosphere (second Principled Volume)', sm_licht: 'Sun, camera & render', sm_kino: 'Cinematic post-processing (extra, not part of the technique)', sm_proc: 'Procedural parameters (estimated)',
  l_karte: 'Map', l_modus: 'Mode', l_vektor: 'Vector', l_rampe: 'ColorRamp', l_format: 'Format', l_datei: 'own map (or drop onto the page)',
  o_modus0: 'Image texture (main path)', o_modus1: "Procedural: noise → Voronoi (tutorial's closing trick)",
  o_zentr1: 'centred (mapping −0.5)', o_zentr0: 'Generated 0…1 uncentred (as in the tutorial, artefacts)',
  o_rampe0: 'Constant (final state in the tutorial)', o_rampe1: 'Linear (intermediate state, soft)',
  o_format0: 'Full frame', o_format1: 'Scope 2.39:1', o_format2: 'Univisium 2:1',
  s_rotZ: 'Rotation Z (object)', s_mixF: 'Mix factor f (texture → distortion)', s_rampT: 'ColorRamp white position t', s_invert: 'Invert factor', s_R: 'Cube half-edge R (scene units)',
  s_hue: 'Hue (0.5 = neutral)', s_sat: 'Saturation', s_val: 'Value', s_dichte: 'Planet density', s_aniso: 'Anisotropy g (HG)',
  s_atmD: 'Atmosphere density', s_atmW: 'Ramp white position', s_atmR: 'Colour R', s_atmG: 'Colour G', s_atmB: 'Colour B',
  s_sunS: 'Sun strength (W/m²)', s_sunAz: 'Sun azimuth', s_sunEl: 'Sun elevation', s_expo: 'Exposure', s_dist: 'Camera distance', s_fov: 'Field of view',
  s_schritt: 'Step size (scene units)', s_spp: 'Samples per frame', s_skala: 'Resolution (factor)', s_maxS: 'Final samples',
  s_pSkala: 'Voronoi scale', s_pNoise: 'Noise scale', s_pDist: 'Distortion (noise → Voronoi)', s_pZ: 'Stretch Z (bands)', s_pDet: 'Noise detail',
  s_bloom: 'Bloom strength', s_bloomS: 'Bloom threshold', s_korn: 'Film grain', s_vign: 'Vignette', s_chroma: 'Chromatic aberration (lens)', s_grade: 'Grading (teal/orange)', s_sterne: 'Stars',
  st_samples: 'Samples', st_done: 'done', st_ms: 'ms/frame', st_prev: 'Preview', st_refine: 'Refining',
  st_gpu: 'Tip: probably running on the integrated GPU. Set Chrome to "High performance" in the Windows graphics settings', lang: 'DE',
};
const DE_TASTE = 'EN';
let lang = 'de';
try { lang = localStorage.getItem('lang') || ((navigator.language || 'de').toLowerCase().startsWith('de') ? 'de' : 'en'); } catch { lang = (navigator.language || 'de').toLowerCase().startsWith('de') ? 'de' : 'en'; }

export const aktuelleSprache = () => lang;
// Text für Statuszeile u. Ä.: Schlüssel + deutscher Standard
export const t = (key, de) => (lang === 'en' && EN[key] ? EN[key] : de);

export function uebersetze(wurzel = document) {
  wurzel.querySelectorAll('[data-t]').forEach((el) => {
    const html = el.hasAttribute('data-html');
    if (el.dataset.de === undefined) el.dataset.de = html ? el.innerHTML : el.textContent;
    const text = lang === 'en' && EN[el.dataset.t] ? EN[el.dataset.t] : el.dataset.de;
    if (html) el.innerHTML = text; else el.textContent = text;
  });
  document.documentElement.lang = lang;
  const b = document.getElementById('sprache'); if (b) b.textContent = lang === 'en' ? EN.lang : DE_TASTE;
}
export function wechsleSprache() {
  lang = lang === 'en' ? 'de' : 'en';
  try { localStorage.setItem('lang', lang); } catch { /* Speicher gesperrt */ }
  uebersetze();
}
