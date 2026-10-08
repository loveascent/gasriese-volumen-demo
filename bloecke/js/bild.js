// Block Bild: lädt eine Äquirektangular-Karte (URL oder Datei) als sRGB-Textur. Gibt { tex, info } zurück.
export async function ladeKarte(device, quelle, name) {
  const blob = typeof quelle === 'string' ? await (await fetch(quelle)).blob() : quelle;
  const bmp = await createImageBitmap(blob, { colorSpaceConversion: 'none' });
  const tex = device.createTexture({ size: [bmp.width, bmp.height], format: 'rgba8unorm-srgb', usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT });
  device.queue.copyExternalImageToTexture({ source: bmp }, { texture: tex }, [bmp.width, bmp.height]);
  return { tex, info: `${name} ${bmp.width}×${bmp.height}` };
}
export function platzhalter(device) {
  const tex = device.createTexture({ size: [1, 1], format: 'rgba8unorm-srgb', usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT });
  device.queue.writeTexture({ texture: tex }, new Uint8Array([200, 160, 120, 255]), { bytesPerRow: 4 }, [1, 1]);
  return tex;
}
