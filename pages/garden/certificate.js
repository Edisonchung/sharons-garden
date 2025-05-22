// pages/garden/certificate.js
import { useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { Button } from '../../components/ui/button';
import Link from 'next/link';

export default function CertificatePage() {
  const [badges, setBadges] = useState([]);
  const certRef = useRef(null);

  useEffect(() => {
    const unlocked = [];
    const types = ['first-bloom', 'gardener', 'fanatic', 'master', 'waterer'];
    types.forEach((type) => {
      if (localStorage.getItem(`badge_${type.replace('-', ' ')}`)) {
        unlocked.push(`/badges/${type}.png`);
      }
    });
    setBadges(unlocked);
  }, []);

  const handleDownload = async () => {
    const element = certRef.current;
    const canvas = await html2canvas(element);
    const dataURL = canvas.toDataURL('image/png');

    const link = document.createElement('a');
    link.href = dataURL;
    link.download = 'sharons-garden-certificate.png';
    link.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 to-yellow-100 p-6 text-center">
      <h1 className="text-3xl font-bold text-purple-800 mb-4">🎓 Certificate of Bloom</h1>
      <p className="mb-6">Congratulations! You've cultivated your Garden of Emotions with Sharon 🌸</p>

      <div
        ref={certRef}
        className="bg-white border-4 border-purple-300 shadow-xl mx-auto p-6 rounded-xl w-full max-w-xl"
      >
        <h2 className="text-xl font-bold mb-4">🌼 Your Earned Badges</h2>
        <div className="grid grid-cols-3 gap-4 justify-items-center">
          {badges.length > 0 ? (
            badges.map((img, idx) => (
              <img
                key={idx}
                src={img}
                alt="badge"
                className="w-20 h-20 object-contain border rounded shadow"
              />
            ))
          ) : (
            <p className="text-gray-500 col-span-3">No badges unlocked yet.</p>
          )}
        </div>

        <div className="mt-6 text-sm text-gray-600">
          <p>Issued by Sharon's Garden 🌱</p>
          <p>{new Date().toLocaleDateString()}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-col items-center gap-4">
        <Button onClick={handleDownload}>📄 Download Certificate</Button>
        <Link href="/">
          <Button variant="outline">🏡 Back to Garden</Button>
        </Link>
      </div>
    </div>
  );
}
