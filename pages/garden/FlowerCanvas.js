// components/FlowerCanvas.js
import { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';

const flowerSprite = new Image();
flowerSprite.src = '/sprites/flowers.png'; // Assume a sprite sheet with frames

const spriteSize = 32; // size per sprite
const flowersPerRow = 5; // sprite sheet layout

export default function FlowerCanvas({ flowers }) {
  const canvasRef = useRef();
  const { theme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pixelRatio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth * pixelRatio;
    const height = canvas.clientHeight * pixelRatio;
    canvas.width = width;
    canvas.height = height;
    ctx.scale(pixelRatio, pixelRatio);

    ctx.fillStyle = theme === 'dark' ? '#0f172a' : '#fef2f2';
    ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);

    flowers.forEach((flower, index) => {
      const x = (index % 10) * (spriteSize + 16) + 20;
      const y = Math.floor(index / 10) * (spriteSize + 24) + 20;

      const spriteIndex = getSpriteIndex(flower);
      const sx = (spriteIndex % flowersPerRow) * spriteSize;
      const sy = Math.floor(spriteIndex / flowersPerRow) * spriteSize;

      ctx.drawImage(flowerSprite, sx, sy, spriteSize, spriteSize, x, y, spriteSize, spriteSize);
    });
  }, [flowers, theme]);

  return (
    <div className="overflow-auto border rounded-xl bg-white dark:bg-gray-900">
      <canvas
        ref={canvasRef}
        className="w-full h-[500px]"
        style={{ width: '100%', height: '500px' }}
      />
    </div>
  );
}

function getSpriteIndex(flower) {
  const typeMap = {
    Hope: 0,
    Joy: 1,
    Memory: 2,
    Love: 3,
    Strength: 4
  };
  return typeMap[flower.type] || 0;
}
