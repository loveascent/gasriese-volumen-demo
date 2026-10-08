// Block Bindungen: Würfel-Dichtefeld braucht Akkumulationspuffer, Bildkarte und Sampler (nur im Rechen-Pass).
export const WGSL_KOPF = /* wgsl */`
@group(0) @binding(1) var<storage, read_write> acc: array<vec4<f32>>;
@group(0) @binding(2) var tex: texture_2d<f32>;
@group(0) @binding(3) var smp: sampler;
`;
