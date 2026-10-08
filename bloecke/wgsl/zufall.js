// Block Zufall: PCG-Hash, Zufallszahl 0…1 je Pixel/Sample.
export const WGSL_ZUFALL = /* wgsl */`
// ---------- Zufall (PCG) ----------
fn pcg(v: u32) -> u32 { let s = v * 747796405u + 2891336453u; let w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u; return (w >> 22u) ^ w; }
fn rnd(s: ptr<function, u32>) -> f32 { *s = pcg(*s); return f32(*s) / 4294967295.0; }
`;
