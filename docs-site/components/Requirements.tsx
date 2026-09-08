"use client";

import Section from "./Section";
import { CheckCircle2, Globe, Camera, Smartphone, ShieldCheck, Sliders, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const requirementCards = [
  {
    tag: "AUTH",
    title: "Account Access",
    icon: <ShieldCheck size={20} />,
    description: "Verified credentials and identity recovery flow.",
    points: [
      "Active teacher account via email/password or Google Sign-In.",
      "Email verification-code flow available for self-service password resets.",
    ],
  },
  {
    tag: "HARDWARE",
    title: "Device & Power",
    icon: <Smartphone size={20} />,
    description: "Mobile hardware requirements for uninterrupted capture.",
    points: [
      "Android phone or tablet with smooth camera sensor support.",
      "Continuous power connection recommended for long exam & lecture sessions.",
    ],
  },
  {
    tag: "VISION",
    title: "Camera & Desk Angle",
    icon: <Camera size={20} />,
    description: "Optimal framing for student engagement & gadget detection.",
    points: [
      "Elevated camera position overlooking students and desk surfaces.",
      "Balanced ambient lighting ensures high confidence in YOLO object detection.",
    ],
  },
  {
    tag: "MODES",
    title: "Activity Modes",
    icon: <Sliders size={20} />,
    description: "Configurable session types tailored to class dynamics.",
    points: [
      "Lecture Mode: Tracks on-task, sleeping, posture & engagement.",
      "Exam Mode: Activates strict smartphone detection & high-priority alerts.",
    ],
  },
  {
    tag: "NETWORK",
    title: "Network & Server Sync",
    icon: <Globe size={20} />,
    description: "Low-latency streaming to FastAPI & Cloud Storage.",
    points: [
      "Stable Wi-Fi/data connection for real-time telemetry streaming.",
      "Ensure the backend API endpoint and Drive backup services are accessible.",
    ],
  },
];

export default function Requirements() {
  return (
    <Section
      id="requirements"
      title="Requirements"
      subtitle="Prerequisites & Setup"
      verticalTitle="Ready"
      className="py-20 md:py-24"
    >
      <div className="grid gap-6 lg:grid-cols-12 items-stretch">
        {/* Left Checklist Summary Card */}
        <div className="lg:col-span-4 flex flex-col justify-between border border-accent/20 bg-foreground/[0.02] p-8 md:p-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-28 w-28 border-t border-r border-accent/30 pointer-events-none" />
          <div className="absolute bottom-0 left-0 h-28 w-28 border-b border-l border-accent/20 pointer-events-none" />

          <div className="space-y-6 relative z-10">
            <div className="inline-flex items-center gap-2.5 border border-accent/30 bg-accent/[0.08] px-3.5 py-1.5 rounded-sm">
              <Sparkles size={14} className="text-accent" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground/80">
                Pre-Flight Checklist
              </span>
            </div>

            <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tight leading-tight">
              Ready for smooth <span className="text-accent">monitoring</span>.
            </h3>

            <p className="text-xs md:text-sm text-foreground/65 leading-relaxed font-light">
              TeachTrack combines real-time vision telemetry with academic integrity safeguards. Verify these core readiness steps before entering class.
            </p>

            <div className="space-y-3 pt-2">
              {[
                "Authenticate with active teacher account",
                "Assign Subject & Section to class",
                "Position camera with wide desk coverage",
                "Select initial Mode (Lecture or Exam)",
                "Verify live server telemetry connection",
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 text-xs text-foreground/75 font-medium">
                  <CheckCircle2 size={15} className="text-accent shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-8 mt-8 border-t border-foreground/10 text-[10px] uppercase tracking-[0.25em] text-foreground/40 font-mono">
            TeachTrack System Requirements v2.4
          </div>
        </div>

        {/* Right Bento Grid */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {requirementCards.map((card, idx) => (
            <motion.div
              key={card.title}
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2 }}
              className={`border border-foreground/10 bg-background p-6 md:p-7 flex flex-col justify-between transition-colors duration-300 hover:border-accent/40 hover:bg-foreground/[0.01] ${
                idx === 4 ? "sm:col-span-2" : ""
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-accent/[0.08] border border-accent/20 text-accent">
                      {card.icon}
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-[0.25em] text-accent/80 font-mono">
                      {card.tag}
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="text-base md:text-lg font-black uppercase tracking-tight">
                    {card.title}
                  </h4>
                  <p className="text-xs text-foreground/50 mt-1 font-light">
                    {card.description}
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-foreground/5">
                  {card.points.map((p, pIdx) => (
                    <div key={pIdx} className="flex items-start gap-2 text-xs text-foreground/70 leading-relaxed">
                      <span className="text-accent mt-1 text-[8px]">▪</span>
                      <span>{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}
