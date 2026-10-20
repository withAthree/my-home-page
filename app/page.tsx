import siteConfig from "@/data/site.config";
import ContentProvider from "@/components/ContentProvider";
import StarField from "@/components/StarField";
import Loader from "@/components/Loader";
import Cursor from "@/components/Cursor";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Projects from "@/components/Projects";
import Timeline from "@/components/Timeline";
import Gallery from "@/components/Gallery";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <ContentProvider>
      <Loader name={siteConfig.profile.name} />
      <Cursor />
      <StarField />
      <div className="noise" aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />

      <Navbar />

      <div className="page">
        <main>
          <Hero />
          <About />
          <Projects />
          <Timeline />
          <Gallery />
          <Contact />
        </main>
        <Footer />
      </div>
    </ContentProvider>
  );
}
