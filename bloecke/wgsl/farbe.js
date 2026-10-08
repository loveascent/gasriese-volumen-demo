// Block Farbe: HSV-Node, Image Texture mit Kugelprojektion (Blender point_map_to_sphere), Farbquelle C (Bild oder prozedural).
export const WGSL_FARBE = /* wgsl */`
// ---------- Farbe ----------
fn rgb2hsv(c: vec3<f32>) -> vec3<f32> {
  let mx = max(c.r, max(c.g, c.b)); let mn = min(c.r, min(c.g, c.b)); let d = mx - mn;
  var h = 0.0;
  if (d > 1e-6) {
    if (mx == c.r) { h = ((c.g - c.b) / d) / 6.0; } else if (mx == c.g) { h = (2.0 + (c.b - c.r) / d) / 6.0; } else { h = (4.0 + (c.r - c.g) / d) / 6.0; }
    h = fract(h);
  }
  return vec3<f32>(h, select(0.0, d / mx, mx > 0.0), mx);
}
fn hsv2rgb(c: vec3<f32>) -> vec3<f32> {
  let k = vec3<f32>(1.0, 2.0 / 3.0, 1.0 / 3.0);
  let p = abs(fract(c.xxx + k) * 6.0 - 3.0);
  return c.z * mix(vec3<f32>(1.0), clamp(p - 1.0, vec3<f32>(0.0), vec3<f32>(1.0)), c.y);
}

// ---------- Node: Image Texture, Projektion „Sphere“ (Blenders point_map_to_sphere) ----------
fn texSphere(v: vec3<f32>) -> vec3<f32> {
  let len = length(v);
  var u = 0.0; var w = 0.0;
  if (len > 0.0) {
    if (!(v.x == 0.0 && v.y == 0.0)) { u = (1.0 - atan2(v.x, v.y) / PI) / 2.0; }   // wie Blender: atan(vin.x, vin.y)
    w = 1.0 - acos(clamp(v.z / len, -1.0, 1.0)) / PI;
  }
  return textureSampleLevel(tex, smp, vec2<f32>(u, 1.0 - w), 0.0).rgb;
}

// Farbe C an der Stelle pn (Objektkoordinaten, Würfel = −1…1)
fn baseColor(pn: vec3<f32>) -> vec3<f32> {
  if (P[2].w < 0.5) {
    // Texture Coordinate „Generated“ (0…1, Würfelmitte = 0,5) → Mapping → Image Texture
    let zentriert = P[3].w > 0.5;
    let vec = select(pn * 0.5 + vec3<f32>(0.5), pn, zentriert);
    return texSphere(vec);
  }
  // Prozedural: Texture Coordinate (Object) → Mapping → Noise → Mix → Voronoi (Chebyshev)
  let sc = P[10].x; let nsc = P[10].y; let dist = P[10].z; let zs = P[10].w; let det = P[11].z;
  let m = vec3<f32>(1.0, 1.0, zs);
  let a = pn * m * nsc;
  let n = vec3<f32>(fbm(a, det), fbm(a + vec3<f32>(17.3, 3.7, 9.1), det), fbm(a + vec3<f32>(5.2, 21.9, 13.3), det));
  let v = pn * m * sc + (n - vec3<f32>(0.5)) * 2.0 * dist;
  return voronoiCheb(v);
}
`;
