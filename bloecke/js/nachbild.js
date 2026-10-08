// Block Nachbild: HDR-Textur, Bloom-Pyramide und Kino-Abschluss (Pipelines + Bindungen). Liest nur Q und die HDR-Textur, kennt die Planetenmathematik nicht.
import { WGSL_BLOOM } from '../wgsl/bloom.js';
import { WGSL_KINO } from '../wgsl/kino.js';

const STUFEN = 6;
const HDR = 'rgba16float';

export class Nachbild {
  constructor(device, format, qBuf) {
    this.device = device; this.q = qBuf; this.format = format;
    this.smp = device.createSampler({ magFilter: 'linear', minFilter: 'linear', addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge' });
    const bm = device.createShaderModule({ code: WGSL_BLOOM });
    const km = device.createShaderModule({ code: WGSL_KINO });
    const rp = (mod, fs, fmt) => device.createRenderPipeline({ layout: 'auto', vertex: { module: mod, entryPoint: 'vs' }, fragment: { module: mod, entryPoint: fs, targets: [{ format: fmt }] }, primitive: { topology: 'triangle-list' } });
    this.pErst = rp(bm, 'fsErst', HDR); this.pAb = rp(bm, 'fsAb', HDR); this.pAuf = rp(bm, 'fsAuf', HDR);
    this.pKino = rp(km, 'fs', format);
    this.module = [bm, km];
  }
  tex(w, h, extra = 0) { return this.device.createTexture({ size: [Math.max(1, w), Math.max(1, h)], format: HDR, usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT | extra }); }
  groesse(w, h) {
    for (const t of [this.hdr, ...(this.ab || []), ...(this.auf || [])]) t?.destroy();
    this.hdr = this.tex(w, h, GPUTextureUsage.STORAGE_BINDING);
    this.ab = []; this.auf = [];
    for (let i = 0; i < STUFEN; i++) this.ab.push(this.tex(w >> (i + 1), h >> (i + 1)));
    for (let i = 0; i < STUFEN - 1; i++) this.auf.push(this.tex(w >> (i + 1), h >> (i + 1)));
    const d = this.device, v = (t) => t.createView();
    const e = (b, r) => ({ binding: b, resource: r });
    this.bgErst = d.createBindGroup({ layout: this.pErst.getBindGroupLayout(0), entries: [e(0, { buffer: this.q }), e(1, v(this.hdr)), e(2, this.smp)] });
    this.bgAb = []; this.bgAuf = [];
    for (let i = 1; i < STUFEN; i++) this.bgAb.push(d.createBindGroup({ layout: this.pAb.getBindGroupLayout(0), entries: [e(1, v(this.ab[i - 1])), e(2, this.smp)] }));
    // Aufwärts: Stufe i (src2) + hochgerechnete Stufe i+1 (src = auf[i+1], unterste: ab[STUFEN−1])
    for (let i = 0; i < STUFEN - 1; i++) {
      const unten = i === STUFEN - 2 ? this.ab[STUFEN - 1] : this.auf[i + 1];
      this.bgAuf.push(d.createBindGroup({ layout: this.pAuf.getBindGroupLayout(0), entries: [e(1, v(unten)), e(2, this.smp), e(3, v(this.ab[i]))] }));
    }
    this.bgKino = d.createBindGroup({ layout: this.pKino.getBindGroupLayout(0), entries: [e(0, { buffer: this.q }), e(1, v(this.hdr)), e(2, v(this.auf[0])), e(3, this.smp)] });
  }
  // schreibt Bloom-Pyramide und Abschluss in den Befehlsstapel; HDR-Textur muss vorher befüllt sein
  kodiere(enc, canvasView) {
    const pass = (view, pipe, bg) => {
      const p = enc.beginRenderPass({ colorAttachments: [{ view, loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 1 } }] });
      p.setPipeline(pipe); p.setBindGroup(0, bg); p.draw(3); p.end();
    };
    pass(this.ab[0].createView(), this.pErst, this.bgErst);
    for (let i = 1; i < STUFEN; i++) pass(this.ab[i].createView(), this.pAb, this.bgAb[i - 1]);
    for (let i = STUFEN - 2; i >= 0; i--) pass(this.auf[i].createView(), this.pAuf, this.bgAuf[i]);
    pass(canvasView, this.pKino, this.bgKino);
  }
}
