// Block Kino-Abschluss: HDR + Bloom → Farbsaum → AgX → Grading (kühle Schatten, warme Lichter) → Vignette → Körnung → Letterbox.
// Alles Kino-Zusatz hinter Q; mit Q[0].x = 0 (Bloom), Q[0].z/w = 0, Q[1].x/w = 0 und Letterbox 0 bleibt nur AgX = Verfahren pur.
import { WGSL_AGX } from './agx.js';
export const WGSL_KINO = WGSL_AGX + /* wgsl */`
@group(0) @binding(0) var<uniform> Q: array<vec4<f32>, 4>;
@group(0) @binding(1) var hdrT: texture_2d<f32>;
@group(0) @binding(2) var bloomT: texture_2d<f32>;
@group(0) @binding(3) var smp: sampler;

@vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4<f32> {
  let p = array<vec2<f32>, 3>(vec2<f32>(-1.0, -1.0), vec2<f32>(3.0, -1.0), vec2<f32>(-1.0, 3.0));
  return vec4<f32>(p[i], 0.0, 1.0);
}
fn hash12(p: vec2<f32>) -> f32 { var q = fract(vec3<f32>(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }

@fragment fn fs(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
  let dim = vec2<f32>(textureDimensions(hdrT));
  let uv = pos.xy / dim;
  let aspect = dim.x / dim.y;
  let m = uv - 0.5;
  // Farbsaum (chromatische Aberration) zum Rand hin
  let ca = Q[1].x * 0.012 * dot(m, m);
  let cr = vec2<f32>(m.x, m.y) * ca;
  let b = Q[0].x;
  let r = textureSampleLevel(hdrT, smp, uv + cr, 0.0).r + textureSampleLevel(bloomT, smp, uv + cr, 0.0).r * b;
  let g = textureSampleLevel(hdrT, smp, uv, 0.0).g + textureSampleLevel(bloomT, smp, uv, 0.0).g * b;
  let bl = textureSampleLevel(hdrT, smp, uv - cr, 0.0).b + textureSampleLevel(bloomT, smp, uv - cr, 0.0).b * b;
  var c = agx(vec3<f32>(r, g, bl));
  // Grading: kühle Schatten, warme Lichter (Teal/Orange, dezent)
  let l = dot(c, vec3<f32>(0.2126, 0.7152, 0.0722));
  let tone = mix(vec3<f32>(-0.06, 0.0, 0.08), vec3<f32>(0.08, 0.025, -0.06), smoothstep(0.15, 0.85, l));
  c = clamp(c * (vec3<f32>(1.0) + tone * Q[1].w * 2.0), vec3<f32>(0.0), vec3<f32>(1.0));
  // Vignette
  let v = dot(m * vec2<f32>(aspect, 1.0), m * vec2<f32>(aspect, 1.0));
  c *= 1.0 - Q[0].w * smoothstep(0.05, 0.9, v);
  // Filmkorn (hell/dunkel, nicht in den tiefsten Schwarz)
  let n = hash12(pos.xy + Q[2].x * 61.7) + hash12(pos.xy * 1.3 + Q[2].x * 17.3) - 1.0;
  c += n * Q[0].z * (0.3 + 0.7 * sqrt(l + 0.05));
  c = clamp(oetf(max(c, vec3<f32>(0.0))), vec3<f32>(0.0), vec3<f32>(1.0));
  // Letterbox: Q[1].y = Zielseitenverhältnis (0 = aus)
  if (Q[1].y > 0.0) {
    let halbHoehe = 0.5 * aspect / Q[1].y;
    if (abs(m.y) > halbHoehe) { c = vec3<f32>(0.0); }
  }
  return vec4<f32>(c, 1.0);
}
`;
