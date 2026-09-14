import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import HelpGrid from '../components/HelpGrid';
import CallSection from '../components/CallSection';
import Footer from '../components/Footer';
import PageBackground from '../components/PageBackground';

export default function Home() {
  return (
    <PageBackground>
      <Navbar />
      <Hero />
      <HelpGrid />
      <CallSection />
      <Footer />
    </PageBackground>
  );
}