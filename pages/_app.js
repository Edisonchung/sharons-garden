// pages/_app.js
import Navbar from '../components/ui/Navbar';
import '../styles/globals.css';
import '../styles/canvas.css'; // ✅ Import canvas styles globally
import '../styles/FlowerCanvas.css';


export default function MyApp({ Component, pageProps }) {
  return (
    <>
      <Navbar />
      <Component {...pageProps} />
    </>
  );
}
