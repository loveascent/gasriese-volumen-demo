// Block HDR: Akkumulationspuffer (Summe der Samples) → Mittelwert × Belichtung → HDR-Textur. Optional Sternenhimmel hinter der Atmosphäre.
// Nur Kino-Zusatz, nicht Teil des Verfahrens (im Tutorial: World-Stärke 0 = schwarz). Schalter Q[1].z.
export const WGSL_HDR = /* wgsl */`
@group(0) @binding(2) var<storage, read> acc: array<vec4<f32>>;
@group(0) @binding(3) var hdr: texture_storage_2d<rgba16float, write>;

fn h1(p: vec3<f32>) -> f32 { return fract(sin(dot(p, vec3<f32>(127.1, 311.7, 74.7))) * 43758.5453); }

// Sterne: Raster über der Blickrichtung, je Zelle höchstens ein Stern, Größe ≈ Pixelwinkel
fn sterne(rd: vec3<f32>, pixWinkel: f32) -> vec3<f32> {
  var s = vec3<f32>(0.0);
  for (var lage = 0; lage < 2; lage++) {
    let S = select(70.0, 190.0, lage == 1);
    let p = rd * S;
    let id = floor(p);
    let h = h1(id + f32(lage) * 17.0);
    if (h < 0.07) {
      let c = id + vec3<f32>(h1(id + 3.1), h1(id + 7.7), h1(id + 11.3));
      let d = length(p - c);
      let r = max(S * pixWinkel * 0.6, 1e-4);
      let hell = pow(h1(id + 5.5), 5.0) * 1.6 + 0.06;
      let farbe = mix(vec3<f32>(1.0, 0.82, 0.62), vec3<f32>(0.7, 0.82, 1.0), h1(id + 9.9));
      s += farbe * hell * exp(-(d * d) / (r * r));
    }
  }
  return s * Q[1].z;
}

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let W = u32(P[0].x); let H = u32(P[0].y);
  if (gid.x >= W || gid.y >= H) { return; }
  let a = acc[gid.y * W + gid.x];
  var lin = a.rgb / max(a.w, 1.0);
  if (Q[1].z > 0.0) {
    let aspect = P[0].x / P[0].y;
    let ndc = ((vec2<f32>(f32(gid.x), f32(gid.y)) + 0.5) / vec2<f32>(P[0].x, P[0].y) * 2.0 - 1.0) * vec2<f32>(1.0, -1.0);
    let rd = normalize(P[4].xyz + (P[2].xyz * (ndc.x * aspect) + P[3].xyz * ndc.y) * P[1].w);
    // Strahl gegen die Atmosphärenkugel (Radius R): außerhalb ist sie leer, dort gehören Sterne hin
    let ro = P[1].xyz; let R = P[6].x;
    let b = dot(ro, rd); let c = dot(ro, ro) - R * R;
    if (b * b - c < 0.0 || b > 0.0) { lin += sterne(rd, 2.0 * P[1].w / P[0].y); }
  }
  textureStore(hdr, vec2<i32>(i32(gid.x), i32(gid.y)), vec4<f32>(lin * P[11].x, 1.0));
}
`;
