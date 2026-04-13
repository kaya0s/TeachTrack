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
        q: "Why can’t I start a session?",
        a: "Check camera permission first, then confirm you selected a subject and section. If the app says you’re not authenticated, sign in again (your token may have expired).",
      },
      {
        q: "Why do I see 'No sessions recorded this week'?",
        a: "Weekly Trend only counts sessions that have a recorded start time in the last 7 days (local date). If your current session is still active, it will appear once it starts (today) or after it ends, depending on your version.",
      },
      {
        q: "Why are metrics/alerts delayed?",
        a: "Real-time metrics depend on network stability and backend processing. Try switching to a stronger connection and keep the device screen on during monitoring.",
      },
      {
        q: "My session history is empty.",
        a: "Pull to refresh the dashboard. If you recently ended a session, it may take a moment to sync. Ensure the backend URL is reachable on your network.",
      },
      {
        q: "Do I need to keep the phone plugged in?",
        a: "Recommended for longer sessions. Live monitoring can be battery-intensive due to camera usage and network activity.",
      },
    ],
    []
  );

  return (
    <Section id="faq" title="FAQ" subtitle="Troubleshooting" verticalTitle="Help">
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

