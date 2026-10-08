// Block Renderer: Rechen-Pass (Volumen-Raymarching, Samples aufsummieren) + HDR-Pass. Besitzt Akkumulationspuffer und die zwei Uniform-Puffer.
import { WGSL_P, WGSL_Q } from '../wgsl/gemeinsam.js';
import { WGSL_KOPF } from '../wgsl/kopf.js';
import { WGSL_ZUFALL } from '../wgsl/zufall.js';
import { WGSL_RAUSCHEN } from '../wgsl/rauschen.js';
import { WGSL_FARBE } from '../wgsl/farbe.js';
import { WGSL_MEDIUM } from '../wgsl/medium.js';
import { WGSL_LICHT } from '../wgsl/licht.js';
import { WGSL_RECHNEN_KERN } from '../wgsl/rechnen.js';
import { WGSL_HDR } from '../wgsl/hdr.js';
import { schreibeP, schreibeQ } from './parameter.js';

export const RECHEN_CODE = [WGSL_P, WGSL_KOPF, WGSL_ZUFALL, WGSL_RAUSCHEN, WGSL_FARBE, WGSL_MEDIUM, WGSL_LICHT, WGSL_RECHNEN_KERN].join('\n');
export const HDR_CODE = [WGSL_P, WGSL_Q, WGSL_HDR].join('\n');

export class Renderer {
  constructor(device) {
    this.device = device;
    this.p = device.createBuffer({ size: 13 * 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.q = device.createBuffer({ size: 4 * 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.smp = device.createSampler({ magFilter: 'linear', minFilter: 'linear', addressModeU: 'repeat', addressModeV: 'clamp-to-edge' });
    this.module = [device.createShaderModule({ code: RECHEN_CODE }), device.createShaderModule({ code: HDR_CODE })];
    this.pRechnen = device.createComputePipeline({ layout: 'auto', compute: { module: this.module[0], entryPoint: 'main' } });
    this.pHdr = device.createComputePipeline({ layout: 'auto', compute: { module: this.module[1], entryPoint: 'main' } });
    this.acc = null; this.bgR = null; this.bgH = null; this.w = 0; this.h = 0;
  }
  setzeKarte(tex) { this.karte = tex; this.bgR = null; }
  groesse(w, h) { this.acc?.destroy(); this.w = w; this.h = h; this.acc = this.device.createBuffer({ size: w * h * 16, usage: GPUBufferUsage.STORAGE }); this.bgR = null; this.bgH = null; }
  gruppen(hdrTex) {
    const d = this.device, e = (binding, resource) => ({ binding, resource });
    if (!this.bgR) this.bgR = d.createBindGroup({ layout: this.pRechnen.getBindGroupLayout(0), entries: [e(0, { buffer: this.p }), e(1, { buffer: this.acc }), e(2, this.karte.createView()), e(3, this.smp)] });
    if (!this.bgH || this.hdrTex !== hdrTex) { this.hdrTex = hdrTex; this.bgH = d.createBindGroup({ layout: this.pHdr.getBindGroupLayout(0), entries: [e(0, { buffer: this.p }), e(1, { buffer: this.q }), e(2, { buffer: this.acc }), e(3, hdrTex.createView())] }); }
  }
  // st = Steuerung (siehe parameter.js schreibeP); rechnen = false: nur HDR neu füllen (Nachbearbeitungsregler), Samples bleiben
  kodiere(enc, W, seed, st, rechnen) {
    this.device.queue.writeBuffer(this.p, 0, schreibeP(W, this.w, this.h, seed, st));
    this.device.queue.writeBuffer(this.q, 0, schreibeQ(W, seed, this.w / this.h));
    const cp = enc.beginComputePass();
    if (rechnen) {
      const b = st.modus === 0 ? st.block : 1;
      const nx = Math.ceil(Math.ceil(this.w / b) / 8), ny = Math.ceil((st.modus === 0 ? Math.ceil(this.h / b) : st.rows) / 8);
      cp.setPipeline(this.pRechnen); cp.setBindGroup(0, this.bgR); cp.dispatchWorkgroups(nx, ny);
    }
    cp.setPipeline(this.pHdr); cp.setBindGroup(0, this.bgH); cp.dispatchWorkgroups(Math.ceil(this.w / 8), Math.ceil(this.h / 8));
    cp.end();
  }
}
