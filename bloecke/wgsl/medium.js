// Block Medium: Planet (Mix → Gradient → Invert → ColorRamp → Principled Volume) + Atmosphäre, Add Shader. Hier steckt die Dichte-Mathematik des Tutorials.
export const WGSL_MEDIUM = /* wgsl */`
struct Medium { st: f32, ss: vec3<f32> };   // Extinktion σ_t, Streukoeffizient σ_s (RGB)

// Add Shader aus zwei Principled Volumes: Planet (Dichte-Feld) + Atmosphäre
fn medium(pO: vec3<f32>) -> Medium {
  var m: Medium; m.st = 0.0; m.ss = vec3<f32>(0.0);
  let R = P[6].x;
  if (max(abs(pO.x), max(abs(pO.y), abs(pO.z))) > R) { return m; }     // Volumen existiert nur im Würfel-Mesh
  let pn = pO / R;                                                      // Object-Koordinaten −1…1
  let r = length(pn);

  // --- Atmosphäre: Gradient (Spherical) → ColorRamp (Linear, 0 … Weiß-Position) → Dichte
  let ga = max(0.999999 - r, 0.0);
  let da = clamp(ga / max(P[8].z, 1e-4), 0.0, 1.0) * P[8].y;
  if (da > 0.0) { m.st += da; m.ss += da * P[9].rgb; }

  // --- Planet
  let f = P[6].z; let inv = P[6].w; let t = P[6].y;
  let rmax = select(1.0 - t, 1.0, P[11].w > 0.5) / max(1.0 - f, 0.05); // konservative Schale (nur wenn nicht invertiert)
  if (inv < 0.5 && r > rmax) { return m; }
  let C = baseColor(pn);                                                // Image Texture
  let q = mix(pn, pn * C, f);                                           // Mix Color (Multiply, Fac f): A = Object-Koord., B = Textur
  let g = max(0.999999 - length(q), 0.0);                               // Gradient Texture (Spherical), wie Blender: r = max(0,999999 − |p|, 0)
  let gi = mix(g, 1.0 - g, inv);                                        // Invert Color (Fac)
  let dConst = select(0.0, 1.0, gi >= t);                               // ColorRamp (Constant): 0 bis t schwarz, ab t weiß
  let dLin = clamp(gi / max(t, 1e-4), 0.0, 1.0);                        // ColorRamp (Linear): Verlauf schwarz (0) → weiß (t)
  let d = select(dConst, dLin, P[11].w > 0.5);
  if (d > 0.0) {
    var hsv = rgb2hsv(C);                                               // Hue/Saturation/Value
    hsv.x = fract(hsv.x + P[7].x + 0.5); hsv.y = clamp(hsv.y * P[7].y, 0.0, 1.0); hsv.z = hsv.z * P[7].z;
    let albedo = clamp(hsv2rgb(hsv), vec3<f32>(0.0), vec3<f32>(1.0));
    let sp = d * P[8].x;
    m.st += sp; m.ss += sp * albedo;
  }
  return m;
}
`;
