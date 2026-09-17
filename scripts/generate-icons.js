const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const OUT_DIR = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(OUT_DIR, { recursive: true });

const CART_PATH =
  'M2 3h2l2.68 12.39A2 2 0 0 0 8.62 17h8.76a2 2 0 0 0 1.94-1.51L21 7H6';

function cartIcon({ background, radius, scale, offset }) {
  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
    <rect width="512" height="512" rx="${radius}" fill="${background}"/>
    <g transform="translate(${offset},${offset}) scale(${scale})"
       fill="none" stroke="#ffffff" stroke-width="1.3"
       stroke-linecap="round" stroke-linejoin="round">
      <path d="${CART_PATH}"/>
      <circle cx="9" cy="20" r="1" fill="#ffffff" stroke="none"/>
      <circle cx="17" cy="20" r="1" fill="#ffffff" stroke="none"/>
    </g>
  </svg>`;
}

const GREEN = '#2e7d32'; // mesmo verde de --verde em public/css/style.css

const variants = [
  // "any" icons: rounded square background
  { name: 'icon-192.png', size: 192, svg: cartIcon({ background: GREEN, radius: 96, scale: 13.33, offset: 96 }) },
  { name: 'icon-512.png', size: 512, svg: cartIcon({ background: GREEN, radius: 96, scale: 13.33, offset: 96 }) },
  // "maskable" icons: full-bleed square, glyph kept inside the safe zone
  { name: 'icon-maskable-192.png', size: 192, svg: cartIcon({ background: GREEN, radius: 0, scale: 9.6, offset: 140 }) },
  { name: 'icon-maskable-512.png', size: 512, svg: cartIcon({ background: GREEN, radius: 0, scale: 9.6, offset: 140 }) },
  // apple touch icon: flat square, iOS applies its own rounding
  { name: 'apple-touch-icon.png', size: 180, svg: cartIcon({ background: GREEN, radius: 0, scale: 9.6, offset: 140 }) },
];

(async () => {
  for (const v of variants) {
    await sharp(Buffer.from(v.svg)).resize(v.size, v.size).png().toFile(path.join(OUT_DIR, v.name));
    console.log('gerado:', v.name);
  }
})();
