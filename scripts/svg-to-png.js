// 将 SVG 图标转换为 PNG
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, '../public/icons');

// 所有需要转换的文件
const files = [
  'icon-72x72.svg',
  'icon-96x96.svg',
  'icon-128x128.svg',
  'icon-144x144.svg',
  'icon-152x152.svg',
  'icon-192x192.svg',
  'icon-384x384.svg',
  'icon-512x512.svg',
  'icon-192x192-maskable.svg',
  'icon-512x512-maskable.svg'
];

async function convertSvgToPng() {
  console.log('Converting SVG to PNG...\n');

  for (const file of files) {
    const svgPath = path.join(iconsDir, file);
    const pngPath = path.join(iconsDir, file.replace('.svg', '.png'));

    try {
      await sharp(svgPath)
        .png()
        .toFile(pngPath);

      console.log(`✓ ${file} -> ${file.replace('.svg', '.png')}`);
    } catch (error) {
      console.error(`✗ Failed to convert ${file}:`, error.message);
    }
  }

  console.log('\n✓ All icons converted successfully!');
}

convertSvgToPng().catch(console.error);
