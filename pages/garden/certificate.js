// pages/garden/certificate.js
import { useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { Button } from '../../components/ui/button';
import useSound from 'use-sound';

export default function CertificatePage() {
  const [badges, setBadges] = useState([]);
  const ref = useRef(null);
  const [play] = useSound('/sounds/cheer.mp3', { volume: 0.5 });

  useEffect(() => {
    const unlocked = [];
    const types = ['first-bloom', 'gardener', 'fanatic', 'master', 'waterer'];
    types.forEach((type) => {
      if (localStorage.getItem(`badge_${type.replace('-', ' ')}`)) {
        unlocked.push(`/badges/${type}.png`);
      }
    });
    setBadges(unlocked);
    play();
  }, [play]);

  const handleDownload = async () => {
    const canvas = await html2canvas(ref.current);
    const link = document.createElement('a');
    link.download = 'sharon-garden-certificate.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  const handleInstagramShare = async () => {
    const canvas = await html2canvas(ref.current);
    const link = document.createElement('a');
    link.download = 'sharon-story.png';
    link.href = canvas.toDataURL();
    link.click();
    alert('📲 Image downloaded! Now share it as a story on Instagram.');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 to-purple-100 p-6 flex flex-col items-center justify-center">
      <div ref={ref} className="bg-white border-4 border-purple-300 shadow-xl rounded-2xl px-10 py-8 w-[700px] text-center">
        <h1 className="text-3xl font-bold text-purple-700 mb-2">🌸 Sharon's Garden Certificate</h1>
        <p className="text-gray-600 mb-6">In recognition of the emotions nurtured and flowers bloomed 🌼</p>

        <div className="flex flex-wrap justify-center gap-4">
          {badges.map((src, i) => (
            <img
              key={i}
              src={src}
              alt="badge"
              className="w-24 h-24 object-contain border rounded shadow"
            />
          ))}
        </div>

        <p className="text-sm text-gray-500 mt-6">sharons-garden.vercel.app</p>
      </div>

      <div className="flex gap-4 mt-6">
        <Button onClick={handleDownload}>📥 Download Certificate</Button>
        <Button onClick={handleInstagramShare} variant="outline">📸 Share to IG Story</Button>
      </div>
    </div>
  );
}
