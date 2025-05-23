// components/FlowerCanvas.js
import React, { useEffect, useRef } from 'react';

export default function FlowerCanvas({ spriteSrc = "/flower-sprite.png", frameSize = 32, rows = 3, cols = 3, frameCount = 4 }) {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const flowerImage = new Image();
    flowerImage.src = spriteSrc;
    imageRef.current = flowerImage;

    let frame = 0;
    let animationFrame;

    flowerImage.onload = () => {
      const draw = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            ctx.drawImage(
              flowerImage,
              frame * frameSize, 0,
              frameSize, frameSize,
              col * frameSize, row * frameSize,
              frameSize, frameSize
            );
          }
        }

        frame = (frame + 1) % frameCount;
        animationFrame = requestAnimationFrame(draw);
      };
      draw();
    };

    return () => cancelAnimationFrame(animationFrame);
  }, [spriteSrc, frameSize, rows, cols, frameCount]);

  return (
    <canvas
      ref={canvasRef}
      width={cols * frameSize}
      height={rows * frameSize}
      className="mx-auto block rounded shadow-lg border border-purple-300"
    />
  );
}
