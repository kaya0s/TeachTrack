"use client";

import Section from "./Section";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Sparkles, Eye, ShieldCheck, BarChart3, Cloud } from "lucide-react";

export default function About() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.92, 1, 0.92]);

  return (
    <Section
      id="overview"
      title="Overview"
      subtitle="The TeachTrack Platform"
      verticalTitle="Overview"
    >
      <div ref={ref} className="grid gap-12 lg:grid-cols-12 items-center">
        {/* Left Column Text Content */}
        <div className="lg:col-span-7 space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 border border-accent/30 bg-accent/[0.08] px-3.5 py-1.5 rounded-sm">
              <Sparkles size={14} className="text-accent" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground/80">
                Next-Gen Classroom Intelligence
              </span>
            </div>

            <h3 className="text-2xl sm:text-3xl md:text-4xl leading-[1.25] text-foreground font-black uppercase tracking-tight">
              Empowering educators with <span className="text-accent">real-time vision</span>, behavioral analytics, and exam proctoring.
            </h3>
          </div>

          <p className="text-sm md:text-base leading-relaxed text-foreground/70 font-light">
            TeachTrack transforms standard classroom cameras into an intelligent pedagogical assistant. By leveraging state-of-the-art computer vision and deep learning models, TeachTrack measures active student engagement, flags fatigue or distractions, and safeguards academic integrity during exams without invading student privacy.
          </p>

          {/* Key Value Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-4 border border-foreground/10 bg-foreground/[0.01] rounded-sm space-y-1.5">
              <div className="flex items-center gap-2 text-accent">
                <Eye size={16} />
                <span className="text-[10px] font-black uppercase tracking-wider">Live Dual Modes</span>
              </div>
              <p className="text-xs text-foreground/60 leading-relaxed">
                Seamlessly toggle between Lecture engagement tracking and strict Exam phone proctoring on the fly.
              </p>
            </div>

            <div className="p-4 border border-foreground/10 bg-foreground/[0.01] rounded-sm space-y-1.5">
              <div className="flex items-center gap-2 text-accent">
                <ShieldCheck size={16} />
                <span className="text-[10px] font-black uppercase tracking-wider">Academic Integrity</span>
              </div>
              <p className="text-xs text-foreground/60 leading-relaxed">
                Instant critical alerts and visual snapshots when unauthorized gadgets are detected in exams.
              </p>
            </div>

            <div className="p-4 border border-foreground/10 bg-foreground/[0.01] rounded-sm space-y-1.5">
              <div className="flex items-center gap-2 text-accent">
                <BarChart3 size={16} />
                <span className="text-[10px] font-black uppercase tracking-wider">Actionable Analytics</span>
              </div>
              <p className="text-xs text-foreground/60 leading-relaxed">
                Comprehensive weekly engagement trends, behavioral distributions, and mode switch audit histories.
              </p>
            </div>

            <div className="p-4 border border-foreground/10 bg-foreground/[0.01] rounded-sm space-y-1.5">
              <div className="flex items-center gap-2 text-accent">
                <Cloud size={16} />
                <span className="text-[10px] font-black uppercase tracking-wider">Cloud Resilient</span>
              </div>
              <p className="text-xs text-foreground/60 leading-relaxed">
                Automated database dumps synced securely to Google Drive via OAuth 2.0 with superuser control.
              </p>
            </div>
          </div>

          <p className="text-xs text-foreground/50 italic border-l-2 border-accent/40 pl-4 py-1">
            Designed for teachers, trusted by administrators. Simple setup, zero-downtime monitoring, and dependable insights.
          </p>
        </div>

        {/* Right Column Visual Mockup */}
        <div className="lg:col-span-5 relative group flex justify-center">
          <motion.div
            style={{ scale }}
            className="relative aspect-square w-full max-w-[420px] overflow-hidden border border-foreground/10 bg-foreground/[0.02] shadow-2xl flex items-center justify-center p-2 rounded-sm"
          >
            <img
              src="/images/step5.png"
              alt="TeachTrack overview visual"
              className="h-full w-full object-contain rounded-sm"
            />

            {/* Subtle decorative accents */}
            <div className="absolute top-0 right-0 h-16 w-16 border-t-2 border-r-2 border-accent/40 pointer-events-none" />
            <div className="absolute bottom-0 left-0 h-16 w-16 border-b-2 border-l-2 border-accent/30 pointer-events-none" />
          </motion.div>
        </div>
      </div>
    </Section>
  );
}
