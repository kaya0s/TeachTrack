"use client";

import Section from "./Section";
import { CheckCircle2, Globe, Camera, Smartphone, ShieldCheck } from "lucide-react";

const requirementCards = [
  {
    title: "Account Access",
    icon: <ShieldCheck size={18} />,
    points: [
      "A valid teacher account (email/password or Google Sign-In).",
      "If you forget your password, use verification-code reset.",
    ],
  },
  {
    title: "Device",
    icon: <Smartphone size={18} />,
    points: [
      "Android phone/tablet recommended for live sessions.",
      "Keep the device plugged in for long monitoring sessions.",
    ],
  },
  {
    title: "Camera & Permissions",
    icon: <Camera size={18} />,
    points: [
      "Camera permission is required to start monitoring.",
      "Place the camera where students are clearly visible (good lighting helps).",
    ],
  },
  {
    title: "Network",
    icon: <Globe size={18} />,
    points: [
      "Stable Wi‑Fi/data connection for real-time updates and alerts.",
      "If you're on a school network, ensure the backend URL is reachable.",
    ],
  },
];

export default function Requirements() {
  return (
    <Section
      id="requirements"
      title="Requirements"
      subtitle="Before You Start"
      verticalTitle="Ready"
      className="py-20 md:py-24"
    >
      <div className="grid gap-px border border-foreground/5 bg-foreground/5 md:grid-cols-12 overflow-hidden">
        <div className="md:col-span-5 bg-background p-10 md:p-12">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-3 border border-accent/25 bg-accent/[0.05] px-4 py-2">
              <CheckCircle2 size={16} className="text-accent" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-foreground/70">
                Quick Checklist
              </span>
            </div>
            <p className="text-base md:text-lg leading-relaxed text-foreground/70">
              TeachTrack works best with a stable camera view and reliable internet.
              Use this checklist to avoid common setup issues before starting a session.
            </p>
            <ul className="space-y-3 text-sm text-foreground/60">
              <li>• Sign in successfully</li>
              <li>• Confirm your subjects/sections exist</li>
              <li>• Allow camera permission</li>
              <li>• Test connection to the server</li>
            </ul>
          </div>
        </div>

        <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-px bg-foreground/5">
          {requirementCards.map((card) => (
            <div key={card.title} className="bg-background p-8 md:p-10">
              <div className="flex items-center gap-3">
                <span className="text-accent/90">{card.icon}</span>
                <h3 className="text-sm font-black uppercase tracking-[0.25em]">
                  {card.title}
                </h3>
              </div>
              <div className="mt-6 space-y-3 text-sm text-foreground/60">
                {card.points.map((p) => (
                  <p key={p} className="leading-relaxed">
                    {p}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

