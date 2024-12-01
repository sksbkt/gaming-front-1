import About from "./components/About";
import Contact from "./components/Contact";
import Features from "./components/Features";
import Footer from "./components/Footer";
import Hero from "./components/Hero";
import NavBar from "./components/NavBar";
import Story from "./components/Story";
const App = () => {
  return (
    // ? overflow-y-hidden is used to hide the scroll bar on the right side of the screen which is weird
    <main className="relative min-h-screen w-screen overflow-x-hidden overflow-y-hidden">
      <NavBar />
      <Hero />
      <About />
      <Features />
      <Story />
      <Contact />
      <Footer />
    </main>
  );
};

export default App;
