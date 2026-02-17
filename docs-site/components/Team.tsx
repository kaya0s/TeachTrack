"use client";

import Section from "./Section";
import { motion } from "framer-motion";

const teamMembers = [
    {
        id: "01",
        name: "Kayaos",
        role: "Fullstack Developer",
        bio: "Built the app, backend server, and machine learning pipeline.",
        image: "/images/profile1.png",
    },
    {
        id: "02",
        name: "JASSEL",
        role: "DOCUMENTATION LEAD",
        bio: "Leads docs and onboarding.",
        image: "/images/profile2.png",
    },
    {
        id: "03",
        name: "JOSUA",
        role: "UI/UX Designer",
        bio: "Designs clean user interfaces.",
        image: "/images/profile3.png",
    },
];

export default function Team() {
    return (
        <Section id="team" title="Team" subtitle="People" verticalTitle="Team" className="py-20 md:py-24">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-px border border-foreground/5 bg-foreground/5 overflow-hidden">
                {teamMembers.map((m, idx) => (
                    <motion.div
                        key={m.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.2 }}
                        transition={{ duration: 0.8, delay: idx * 0.05, ease: [0.16, 1, 0.3, 1] }}
                        className="md:col-span-4 bg-background overflow-hidden"
                    >
                        <div className="relative h-full">
                            <div className="relative aspect-[4/5] w-full overflow-hidden border-b border-foreground/5 bg-foreground/[0.02]">
                                <img
                                    src={m.image}
                                    alt={m.name}
                                    className="h-full w-full object-cover"
                                />
                                <div className="absolute inset-0 pointer-events-none">
                                    <div className="absolute top-0 right-0 h-20 w-20 border-t border-r border-accent/25" />
                                    <div className="absolute bottom-0 left-0 h-20 w-20 border-b border-l border-accent/15" />
                                </div>
                            </div>

                            <div className="p-8 md:p-10 space-y-4">
                                <div className="flex items-center gap-3">
                                    <span className="text-[9px] font-black tracking-widest text-foreground/20">/ {m.id}</span>
                                    <div className="h-px flex-1 bg-foreground/5" />
                                    <span className="text-[11px] md:text-xs font-black uppercase tracking-[0.3em] text-accent/95">{m.role}</span>
                                </div>

                                <h3 className="text-2xl md:text-3xl font-black tracking-tighter leading-none uppercase">
                                    {m.name}
                                </h3>

                                <p className="text-sm text-foreground/50 font-light leading-relaxed">
                                    {m.bio}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </Section>
    );
}
