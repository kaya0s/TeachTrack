"use client";

import Section from "./Section";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";

type FaqItem = {
  q: string;
  a: string;
};

export default function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const items = useMemo<FaqItem[]>(
    () => [
      {
        q: "How does Exam Gadget Detection work?",
        a: "When a session is in Exam mode, the computer vision engine intensifies mobile phone detection. If a student uses or holds a phone/gadget, the system immediately fires a high-priority CRITICAL alert and attaches an evidence snapshot for the proctor to review without disrupting the rest of the class.",
      },
      {
        q: "Can I switch between Lecture and Exam mode during an active session?",
        a: "Yes! While in the live monitoring screen, teachers can tap the mode toggle to seamlessly transition between Lecture and Exam mode. The camera stream and detector continue running uninterrupted, and all subsequent telemetry is stamped with the new mode.",
      },
      {
        q: "What is the privacy policy for Exam data?",
        a: "To protect student privacy and exam integrity, pure exam sessions operate under a volatile policy. Exam-specific proctoring telemetry and phone detections are active in real time for teacher alerts, but raw exam video frames and behavioral logs are purged when the session ends according to configured privacy retention rules.",
      },
      {
        q: "How does Google Drive Cloud Backup work?",
        a: "TeachTrack features automated and manual database backups. A compressed, encrypted MySQL dump is created and uploaded directly to a configured Google Drive folder using OAuth 2.0 user authorization, ensuring complete data durability with zero local disk bloat.",
      },
      {
        q: "Why can’t I start a session?",
        a: "Verify camera permissions on your device and ensure you have selected both a subject and a section. If you encounter an authentication error, your login token may have expired—simply sign out and sign back in.",
      },
      {
        q: "Why are live metrics or alert snapshots delayed?",
        a: "Live telemetry and snapshot uploads depend on network bandwidth and server responsiveness. Ensure the mobile device has a stable Wi-Fi connection and keep the screen active while monitoring.",
      },
      {
        q: "How can Administrators switch the active AI detector weights?",
        a: "Superusers can navigate to Settings / Model Operations in the Admin Web Portal to inspect available YOLO model weight files and select the active model for backend inference on the fly.",
      },
    ],
    []
  );

  return (
    <Section id="faq" title="FAQ" subtitle="Troubleshooting & Specs" verticalTitle="Help">
      <div className="border border-foreground/5">
        {items.map((item, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div key={item.q} className="border-b border-foreground/5 last:border-b-0">
              <button
                type="button"
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                className="flex w-full items-center justify-between gap-6 px-6 py-6 text-left md:px-10"
              >
                <div className="space-y-2">
                  <div className="text-[10px] font-black uppercase tracking-[0.4em] text-accent/80">
                    Q{String(idx + 1).padStart(2, "0")}
                  </div>
                  <h3 className="text-xl md:text-2xl font-black tracking-tight">
                    {item.q}
                  </h3>
                </div>
                <motion.span
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="shrink-0 text-foreground/50"
                >
                  <ChevronDown size={18} />
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-8 text-sm md:px-10 md:text-base text-foreground/65 leading-relaxed">
                      {item.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
