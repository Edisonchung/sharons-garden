// pages/_app.js
import { useEffect, useState } from 'react';
import Navbar from '../components/ui/Navbar';
import '../styles/globals.css';
import '../styles/canvas.css';
import '../styles/FlowerCanvas.css';

export default function MyApp({ Component, pageProps }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Only run after the component mounts (client-side)
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    // Prevents hydration mismatch during SSR
    return null;
  }

  return (
    <>
      <Navbar />
      <Component {...pageProps} />
    </>
  );
}
