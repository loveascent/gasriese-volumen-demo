// Block Licht: Objekt-Drehung, Begrenzungskugel, Sonnen-Transmittanz, Henyey-Greenstein, Einfachstreuung (trace).
export const WGSL_LICHT = /* wgsl */`
fn toObj(v: vec3<f32>) -> vec3<f32> { let c = cos(P[4].w); let s = sin(P[4].w); return vec3<f32>(c * v.x + s * v.y, -s * v.x + c * v.y, v.z); }

fn boundR() -> f32 {
  let R = P[6].x; let f = P[6].z; let t = P[6].y;
  let rmax = select(1.7321, max(1.0, select(1.0 - t, 1.0, P[11].w > 0.5) / max(1.0 - f, 0.05)), P[6].w < 0.5);
  return min(1.7321 * R, R * rmax);
}

// Transmittanz zur Sonne: exp(−∫σ_t ds) entlang der Sonnenrichtung (Cycles: Schattenstrahl)
fn sunT(p: vec3<f32>, sun: vec3<f32>, rng: ptr<function, u32>) -> f32 {
  let Rb = boundR();
  let b = dot(p, sun); let c = dot(p, p) - Rb * Rb;
  let te = -b + sqrt(max(b * b - c, 0.0));
  if (te <= 0.0) { return 1.0; }
  let hs = max(P[7].w * 2.0, te / 32.0);
  var t = rnd(rng) * hs; var tau = 0.0;
  for (var i = 0; i < 64; i++) {
    if (t >= te) { break; }
    tau += medium(p + sun * t).st * hs;
    if (tau > 12.0) { return 0.0; }
    t += hs;
  }
  return exp(-tau);
}

fn hg(cosT: f32, g: f32) -> f32 {                                       // Henyey-Greenstein, Principled Volume „Anisotropy“
  let d = 1.0 + g * g - 2.0 * g * cosT;
  return (1.0 - g * g) / (4.0 * PI * pow(max(d, 1e-4), 1.5));
}

// Einfachstreuung (Cycles-Standard: Volume Bounces = 0 → nur direktes Sonnenlicht)
// L = ∫ T(0,t) · σ_s(t) · f_HG(θ) · E_sonne · T_sonne(t) dt
fn trace(ro: vec3<f32>, rd: vec3<f32>, sun: vec3<f32>, rng: ptr<function, u32>) -> vec3<f32> {
  let Rb = boundR();
  let b = dot(ro, rd); let c = dot(ro, ro) - Rb * Rb; let disc = b * b - c;
  if (disc < 0.0) { return vec3<f32>(0.0); }
  let sq = sqrt(disc); let t0 = max(-b - sq, 0.0); let t1 = -b + sq;
  if (t1 <= 0.0) { return vec3<f32>(0.0); }
  let h = max(P[7].w, (t1 - t0) / P[9].w);
  var t = t0 + rnd(rng) * h;
  var T = 1.0; var L = vec3<f32>(0.0);
  let ph = hg(dot(-sun, rd), P[8].w) * P[5].w;
  for (var i = 0; i < 4096; i++) {
    if (t >= t1) { break; }
    let p = ro + rd * t;
    let m = medium(p);
    if (m.st > 0.0) {
      let a = exp(-m.st * h);
      L += T * (1.0 - a) / m.st * m.ss * (ph * sunT(p, sun, rng));
      T *= a;
      if (T < 0.003) { break; }
    }
    t += h;
  }
  return L;
}
`;
