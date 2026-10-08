// Block Gemeinsam: Konstante PI und die zwei Uniform-Felder. P = Rechen-/Kamera-Parameter (12 vec4), Q = Kino-Nachbearbeitung (4 vec4).
// Belegung P siehe js/parameter.js (schreibeP), Belegung Q siehe js/parameter.js (schreibeQ).
export const WGSL_P = /* wgsl */`
const PI: f32 = 3.14159265358979;
@group(0) @binding(0) var<uniform> P: array<vec4<f32>, 12>;
`;
export const WGSL_Q = /* wgsl */`
@group(0) @binding(1) var<uniform> Q: array<vec4<f32>, 4>;
`;
