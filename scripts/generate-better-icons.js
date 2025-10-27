// 生成更美观的 PWA 图标
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const maskableSizes = [192, 512];

const iconsDir = path.join(__dirname, '../public/icons');

// 生成改进的 SVG 图标
function generateBetterSVG(size, isMaskable = false) {
  const padding = isMaskable ? size * 0.15 : 0;
  const contentSize = size - padding * 2;
  const centerX = size / 2;
  const centerY = size / 2;

  // 图标尺寸
  const iconScale = contentSize / size;
  const planeSize = size * 0.45 * iconScale;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- 渐变背景 -->
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#60a5fa;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:1" />
    </linearGradient>

    <!-- 飞机阴影 -->
    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="${size * 0.008}"/>
      <feOffset dx="${size * 0.004}" dy="${size * 0.008}" result="offsetblur"/>
      <feComponentTransfer>
        <feFuncA type="linear" slope="0.3"/>
      </feComponentTransfer>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- 背景 -->
  <rect width="${size}" height="${size}" fill="url(#bgGradient)" rx="${size * 0.18}"/>

  <!-- 装饰圆点 (可选) -->
  <circle cx="${size * 0.85}" cy="${size * 0.15}" r="${size * 0.04}" fill="white" opacity="0.2"/>
  <circle cx="${size * 0.15}" cy="${size * 0.85}" r="${size * 0.03}" fill="white" opacity="0.15"/>

  <!-- 飞机图标 -->
  <g transform="translate(${centerX}, ${centerY})" filter="url(#shadow)">
    <!-- 机身 -->
    <ellipse cx="0" cy="0" rx="${planeSize * 0.15}" ry="${planeSize * 0.45}"
             fill="white" transform="rotate(-45)"/>

    <!-- 主翼 -->
    <path d="M ${-planeSize * 0.35} ${-planeSize * 0.15}
             L ${-planeSize * 0.1} ${-planeSize * 0.3}
             L ${planeSize * 0.45} ${-planeSize * 0.05}
             L ${planeSize * 0.5} ${planeSize * 0.05}
             L ${planeSize * 0.15} ${planeSize * 0.1}
             L ${-planeSize * 0.15} ${planeSize * 0}
             Z"
          fill="white"
          stroke="white"
          stroke-width="${size * 0.003}"
          stroke-linejoin="round"/>

    <!-- 尾翼 -->
    <path d="M ${-planeSize * 0.35} ${-planeSize * 0.15}
             L ${-planeSize * 0.3} ${-planeSize * 0.35}
             L ${-planeSize * 0.15} ${-planeSize * 0.3}
             Z"
          fill="white"
          opacity="0.95"/>

    <path d="M ${-planeSize * 0.2} ${planeSize * 0.15}
             L ${-planeSize * 0.05} ${planeSize * 0.35}
             L ${planeSize * 0.05} ${planeSize * 0.25}
             L ${planeSize * 0.15} ${planeSize * 0.1}
             Z"
          fill="white"
          opacity="0.95"/>

    <!-- 窗户装饰 -->
    <circle cx="${planeSize * 0.05}" cy="${-planeSize * 0.05}"
            r="${planeSize * 0.06}" fill="#3b82f6" opacity="0.3"/>
    <circle cx="${planeSize * 0.2}" cy="${planeSize * 0.0}"
            r="${planeSize * 0.05}" fill="#3b82f6" opacity="0.3"/>
  </g>

  <!-- 文字标签 (仅在较大尺寸显示) -->
  ${size >= 192 ? `
  <text x="${centerX}" y="${size * 0.82}"
        font-family="Arial, -apple-system, sans-serif"
        font-size="${size * 0.11}"
        font-weight="600"
        fill="white"
        text-anchor="middle"
        opacity="0.95">AI 旅行</text>
  ` : ''}
</svg>`;
}

// 生成标准图标
console.log('Generating improved icons...\n');

sizes.forEach(size => {
  const svg = generateBetterSVG(size, false);
  const filename = `icon-${size}x${size}.svg`;
  fs.writeFileSync(path.join(iconsDir, filename), svg);
  console.log(`✓ Generated ${filename}`);
});

// 生成 maskable 图标
maskableSizes.forEach(size => {
  const svg = generateBetterSVG(size, true);
  const filename = `icon-${size}x${size}-maskable.svg`;
  fs.writeFileSync(path.join(iconsDir, filename), svg);
  console.log(`✓ Generated ${filename}`);
});

console.log('\n✓ All improved SVG icons generated!');
console.log('Run: node scripts/svg-to-png.js to convert to PNG');
