// Block Rauschen: Hash-Value-Noise, fBm, Voronoi (Chebyshev). Nur für den prozeduralen Schluss-Trick des Tutorials.
export const WGSL_RAUSCHEN = /* wgsl */`
// ---------- Hilfen: Hash-Rauschen (für den prozeduralen Weg) ----------
fn ihash(v: vec3<i32>) -> u32 {
  var x = (bitcast<u32>(v.x) * 1597334673u) ^ (bitcast<u32>(v.y) * 3812015801u) ^ (bitcast<u32>(v.z) * 2798796415u);
  x = (x ^ (x >> 16u)) * 0x7feb352du; x = (x ^ (x >> 15u)) * 0x846ca68bu; return x ^ (x >> 16u);
}
fn h01(v: vec3<i32>) -> f32 { return f32(ihash(v)) / 4294967295.0; }
fn vnoise(p: vec3<f32>) -> f32 {
  let i = vec3<i32>(floor(p)); let f = fract(p); let u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  let a = mix(mix(h01(i), h01(i + vec3<i32>(1,0,0)), u.x), mix(h01(i + vec3<i32>(0,1,0)), h01(i + vec3<i32>(1,1,0)), u.x), u.y);
  let b = mix(mix(h01(i + vec3<i32>(0,0,1)), h01(i + vec3<i32>(1,0,1)), u.x), mix(h01(i + vec3<i32>(0,1,1)), h01(i + vec3<i32>(1,1,1)), u.x), u.y);
  return mix(a, b, u.z);
}
fn fbm(p: vec3<f32>, detail: f32) -> f32 {          // Node: Noise Texture (Detail, Roughness 0,5)
  var s = 0.0; var a = 0.5; var q = p; var norm = 0.0;
  for (var o = 0; o < 8; o++) { if (f32(o) > detail) { break; } s += a * vnoise(q); norm += a; a *= 0.5; q *= 2.0; }
  return s / norm;
}
fn voronoiCheb(x: vec3<f32>) -> vec3<f32> {        // Node: Voronoi Texture (F1, Chebyshev) → Ausgang „Color“ (Zufallsfarbe der Zelle)
  let ip = vec3<i32>(floor(x)); let fp = fract(x);
  var best = 1e9; var cell = vec3<i32>(0);
  for (var k = -1; k <= 1; k++) { for (var j = -1; j <= 1; j++) { for (var i = -1; i <= 1; i++) {
    let o = vec3<i32>(i, j, k); let c = ip + o;
    let jit = vec3<f32>(h01(c + vec3<i32>(11, 3, 7)), h01(c + vec3<i32>(5, 17, 2)), h01(c + vec3<i32>(13, 9, 19)));
    let dv = abs(vec3<f32>(o) + jit - fp);
    let d = max(dv.x, max(dv.y, dv.z));                 // Chebyshev-Abstand
    if (d < best) { best = d; cell = c; }
  } } }
  return vec3<f32>(h01(cell + vec3<i32>(1, 0, 0)), h01(cell + vec3<i32>(0, 1, 0)), h01(cell + vec3<i32>(0, 0, 1)));
}
`;
