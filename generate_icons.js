const { createCanvas } = require('canvas');
const fs = require('fs');

// 确保icons目录存在
if (!fs.existsSync('icons')) {
    fs.mkdirSync('icons');
}

// 生成指定尺寸的图标
function generateIcon(size) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // 绘制背景
    ctx.fillStyle = '#1a73e8';
    ctx.fillRect(0, 0, size, size);

    // 绘制简单的缓存图标
    ctx.fillStyle = 'white';
    const padding = size * 0.25;
    const lineHeight = size * 0.15;
    const gap = size * 0.2;
    
    // 绘制三条线代表缓存内容
    for (let i = 0; i < 3; i++) {
        ctx.fillRect(
            padding,
            padding + (gap * i),
            size - (padding * 2),
            lineHeight
        );
    }

    // 保存为PNG
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(`icons/icon${size}.png`, buffer);
}

// 生成所有需要的尺寸
[16, 32, 48, 128].forEach(size => generateIcon(size));

console.log('图标生成完成！'); 