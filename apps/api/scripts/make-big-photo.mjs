// Dev helper: writes a 4,800 × 3,600 JPEG (a phone-sized photo) to the path given, for upload tests.
// Usage: node scripts/make-big-photo.mjs out.jpg
import { writeFileSync } from 'node:fs';
import { createCanvas } from '@napi-rs/canvas';

const [out = 'big-photo.jpg'] = process.argv.slice(2);
const canvas = createCanvas(4800, 3600);
const g = canvas.getContext('2d');
g.fillStyle = '#f4efe6';
g.fillRect(0, 0, 4800, 3600);
g.fillStyle = '#222';
g.font = '120px sans-serif';
g.fillText('ESTIMATE (test photo)', 200, 300);
for (let i = 0; i < 40; i++) {
  g.fillStyle = `hsl(${(i * 37) % 360} 60% 50%)`;
  g.fillRect(200 + (i % 8) * 520, 600 + Math.floor(i / 8) * 520, 480, 480);
}
writeFileSync(out, canvas.toBuffer('image/jpeg', 95));
console.log(out);
