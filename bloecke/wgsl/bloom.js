// Block Bloom: Mip-Pyramide (Abwärts mit Schwelle in der ersten Stufe, Aufwärts mit Zelt-Filter). Kino-Zusatz.
// Ein Modul, drei Einstiegspunkte: fsErst (HDR → Stufe 0, Schwelle), fsAb (Stufe i−1 → i), fsAuf (Stufe i + hochgerechnete Stufe i+1).
export const WGSL_BLOOM = /* wgsl */`
@group(0) @binding(0) var<uniform> Q: array<vec4<f32>, 4>;
@group(0) @binding(1) var src: texture_2d<f32>;
@group(0) @binding(2) var smp: sampler;
@group(0) @binding(3) var src2: texture_2d<f32>;

@vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4<f32> {
  let p = array<vec2<f32>, 3>(vec2<f32>(-1.0, -1.0), vec2<f32>(3.0, -1.0), vec2<f32>(-1.0, 3.0));
  return vec4<f32>(p[i], 0.0, 1.0);
}
fn tap4(t: texture_2d<f32>, uv: vec2<f32>, px: vec2<f32>) -> vec3<f32> {
  return 0.25 * (textureSampleLevel(t, smp, uv + px * vec2<f32>(-0.5, -0.5), 0.0).rgb + textureSampleLevel(t, smp, uv + px * vec2<f32>(0.5, -0.5), 0.0).rgb
               + textureSampleLevel(t, smp, uv + px * vec2<f32>(-0.5, 0.5), 0.0).rgb + textureSampleLevel(t, smp, uv + px * vec2<f32>(0.5, 0.5), 0.0).rgb);
}
@fragment fn fsErst(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
  let dim = vec2<f32>(textureDimensions(src)); let outDim = dim * 0.5;
  let uv = pos.xy / outDim; let px = 1.0 / dim;
  var c = (tap4(src, uv, px * 2.0) + tap4(src, uv + px * vec2<f32>(0.0, 0.0), px)) * 0.5;
  // weiche Schwelle (Knie): nur Helles bluten lassen
  let l = max(c.r, max(c.g, c.b)); let t = Q[0].y; let k = t * 0.5 + 1e-4;
  let w = clamp(l - t + k, 0.0, 2.0 * k); let soft = w * w / (4.0 * k + 1e-5);
  let f = max(soft, l - t) / max(l, 1e-5);
  return vec4<f32>(c * f, 1.0);
}
@fragment fn fsAb(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
  let dim = vec2<f32>(textureDimensions(src)); let outDim = max(dim * 0.5, vec2<f32>(1.0));
  let uv = pos.xy / outDim; let px = 1.0 / dim;
  return vec4<f32>((tap4(src, uv, px * 2.0) + tap4(src, uv, px)) * 0.5, 1.0);
}
@fragment fn fsAuf(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
  let dimA = vec2<f32>(textureDimensions(src2)); let uv = pos.xy / dimA;
  let dimB = vec2<f32>(textureDimensions(src)); let px = 1.0 / dimB;
  let up = 0.25 * (textureSampleLevel(src, smp, uv + px * vec2<f32>(-1.0, 0.0), 0.0).rgb + textureSampleLevel(src, smp, uv + px * vec2<f32>(1.0, 0.0), 0.0).rgb
                 + textureSampleLevel(src, smp, uv + px * vec2<f32>(0.0, -1.0), 0.0).rgb + textureSampleLevel(src, smp, uv + px * vec2<f32>(0.0, 1.0), 0.0).rgb) * 0.5
         + textureSampleLevel(src, smp, uv, 0.0).rgb * 0.5;
  return vec4<f32>(textureSampleLevel(src2, smp, uv, 0.0).rgb + up, 1.0);
}
`;
