"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Requirements from "@/components/Requirements";
import Skills from "@/components/Skills";
import Team from "@/components/Team";
import Projects from "@/components/Projects";
import CVSection from "@/components/CVSection";
import FAQ from "@/components/FAQ";
import DeveloperNotes from "@/components/DeveloperNotes";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import LoadingScreen from "@/components/LoadingScreen";

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <AnimatePresence mode="wait">
        {isLoading && (
          <LoadingScreen key="loader" onComplete={() => setIsLoading(false)} />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoading ? 0 : 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <Navbar />
        <Hero />
        <About />
        <Requirements />
        <Skills />
        <Projects />
        <FAQ />
        <DeveloperNotes />
        <CVSection />
        <Team />
        <Contact />
        <Footer />
      </motion.div>
    </main>
  );
}
