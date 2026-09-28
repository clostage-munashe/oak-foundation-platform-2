import test from 'node:test';
import assert from 'node:assert/strict';
import QRCode from 'qrcode';
import { BinaryBitmap, HybridBinarizer, QRCodeReader, RGBLuminanceSource } from '@zxing/library';

test('entry-pass QR payload can be decoded by the scanner library', () => {
  const code = 'OAK-2026-12C7C6F47314E4F0037988D8690F88D0';
  const qr = QRCode.create(code, { errorCorrectionLevel: 'M' });
  const scale = 8;
  const margin = 4;
  const size = (qr.modules.size + margin * 2) * scale;
  const pixels = new Uint8ClampedArray(size * size).fill(255);
  for (let y = 0; y < qr.modules.size; y++) {
    for (let x = 0; x < qr.modules.size; x++) {
      if (!qr.modules.get(y, x)) continue;
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          pixels[((y + margin) * scale + dy) * size + (x + margin) * scale + dx] = 0;
        }
      }
    }
  }
  const bitmap = new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(pixels, size, size)));
  assert.equal(new QRCodeReader().decode(bitmap).getText(), code);
});
