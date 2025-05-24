// pages/_app.js
import { useEffect, useState } from 'react';
import Head from 'next/head';
import Navbar from '../components/ui/Navbar';
import '../styles/globals.css';
import '../styles/canvas.css';
import '../styles/FlowerCanvas.css';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from 'next-themes';

export default function MyApp({ Component, pageProps }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true); // Fix hydration mismatch on iOS/Safari
  }, []);

  if (!isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black text-purple-700 dark:text-white">
        <p>Loading Sharon’s Garden... 🌸</p>
      </div>
    );
  }

  return (
    <ThemeProvider attribute="class" enableSystem={true} defaultTheme="light">
      <Head>
        <title>Sharon's Garden</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Grow and nurture your emotional garden." />
        <meta name="theme-color" content="#9333ea" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Navbar />
      <main className="min-h-screen">
        <Component {...pageProps} />
      </main>
      <Toaster position="bottom-center" toastOptions={{ duration: 3000 }} />
    </ThemeProvider>
  );
}
