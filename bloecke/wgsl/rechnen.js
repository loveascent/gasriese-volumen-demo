// Block Rechnen: Compute-Kernel. Drei Betriebsarten (P[12].x): 0 = Vorschau (grobe Blöcke, ganzes Bild, schnell), 1 = Verfeinern erste Runde (überschreibt), 2 = Verfeinern weitere Runden (addiert).
// Verfeinern rechnet je Aufruf nur Zeilen row0 … row0+rows (P[12].y/.z), damit ein Bild nie länger als das Zeitbudget braucht (gleichmäßig 50–60 fps auf jeder GPU).
// acc.w: >0 = Anzahl verfeinerter Samples, <0 = Vorschauwert (−Samples), wird in hdr.js ausgewertet.
export const WGSL_RECHNEN_KERN = /* wgsl */`
fn schaetze(pix: vec2<f32>, skala: f32, spp: u32, rng: ptr<function, u32>) -> vec3<f32> {
  let aspect = P[0].x / P[0].y;
  let sun = normalize(toObj(P[5].xyz));
  let ro = toObj(P[1].xyz);
  var sum = vec3<f32>(0.0);
  for (var s = 0u; s < spp; s++) {
    let jit = vec2<f32>(rnd(rng), rnd(rng));
    let ndc = ((pix + jit * skala) / vec2<f32>(P[0].x, P[0].y) * 2.0 - 1.0) * vec2<f32>(1.0, -1.0);
    let rdW = normalize(P[4].xyz + (P[2].xyz * (ndc.x * aspect) + P[3].xyz * ndc.y) * P[1].w);
    sum += trace(ro, toObj(rdW), sun, rng);
  }
  return sum;
}

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let W = u32(P[0].x); let H = u32(P[0].y);
  let modus = u32(P[12].x); let row0 = u32(P[12].y); let rows = u32(P[12].z); let b = max(u32(P[12].w), 1u);
  let spp = max(u32(P[0].w), 1u);
  if (modus == 0u) {
    let x0 = gid.x * b; let y0 = gid.y * b;
    if (x0 >= W || y0 >= H) { return; }
    var rng = pcg(gid.x + gid.y * 4099u + u32(P[0].z) * 9781u + 1u);
    let sum = schaetze(vec2<f32>(f32(x0), f32(y0)), f32(b), spp, &rng);
    for (var j = 0u; j < b; j++) {
      for (var i = 0u; i < b; i++) {
        let x = x0 + i; let y = y0 + j;
        if (x < W && y < H) { acc[y * W + x] = vec4<f32>(sum, -f32(spp)); }
      }
    }
    return;
  }
  if (gid.y >= rows) { return; }
  let y = row0 + gid.y;
  if (gid.x >= W || y >= H) { return; }
  var rng = pcg(gid.x + y * W + u32(P[0].z) * 9781u + 1u);
  let sum = schaetze(vec2<f32>(f32(gid.x), f32(y)), 1.0, spp, &rng);
  let i = y * W + gid.x;
  if (modus == 1u) { acc[i] = vec4<f32>(sum, f32(spp)); } else { acc[i] += vec4<f32>(sum, f32(spp)); }
}
`;
