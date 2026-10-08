// Block Rechnen: Compute-Kernel, ein Thread je Pixel, Kamerastrahl, Samples, Akkumulation.
export const WGSL_RECHNEN_KERN = /* wgsl */`
@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let W = u32(P[0].x); let H = u32(P[0].y);
  if (gid.x >= W || gid.y >= H) { return; }
  var rng = pcg(gid.x + gid.y * W + u32(P[0].z) * 9781u + 1u);
  let spp = u32(P[0].w);
  let aspect = P[0].x / P[0].y;
  let sun = normalize(toObj(P[5].xyz));
  let ro = toObj(P[1].xyz);
  var sum = vec3<f32>(0.0);
  for (var s = 0u; s < spp; s++) {
    let jit = vec2<f32>(rnd(&rng), rnd(&rng));
    let ndc = ((vec2<f32>(f32(gid.x), f32(gid.y)) + jit) / vec2<f32>(P[0].x, P[0].y) * 2.0 - 1.0) * vec2<f32>(1.0, -1.0);
    let rdW = normalize(P[4].xyz + (P[2].xyz * (ndc.x * aspect) + P[3].xyz * ndc.y) * P[1].w);
    sum += trace(ro, toObj(rdW), sun, &rng);
  }
  let i = gid.y * W + gid.x;
  if (P[0].z < 0.5) { acc[i] = vec4<f32>(sum, f32(spp)); } else { acc[i] += vec4<f32>(sum, f32(spp)); }
}
`;
