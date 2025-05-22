import Navbar from '../components/ui/Navbar';
import '../styles/globals.css';
export default function MyApp({ Component, pageProps }) {
  return (
    <>
      <Navbar />
      <Component {...pageProps} />
    </>
  );
}
