"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Section from "./Section";

const steps = [
    {
        id: "01",
        title: "Install the app",
        subtitle: "Android APK",
        description: "Download the APK and install it on your Android device. (APK link will be added soon.)",
        image: "/images/step1.png",
    },
    {
        id: "02",
        title: "Sign in / Create account",
        subtitle: "Access",
        description: "Open the app and sign in. If you are new, create an account to get started.",
        image: "/images/step2.png",
    },
    {
        id: "03",
        title: "Set up your class",
        subtitle: "Configuration",
        description: "Add your classroom details and ensure your setup is ready before starting a session.",
        image: "/images/step3.png",
    },
    {
        id: "04",
        title: "Start monitoring",
        subtitle: "Live session",
        description: "Start a session and follow the on-screen prompts to begin tracking and monitoring.",
        image: "/images/step4.png",
    },
    {
        id: "05",
        title: "Review results",
        subtitle: "Insights",
        description: "View summaries and insights after a session to support decisions and improvements.",
        image: "/images/step5.png",
    },
];

export default function Projects() {
    const [activeStep, setActiveStep] = useState<number | null>(null);
    const [direction, setDirection] = useState(0);
    const isModalOpen = activeStep !== null;
    const currentStep = activeStep !== null ? steps[activeStep] : null;

    const openStep = (index: number) => {
        setDirection(0);
        setActiveStep(index);
    };

    const closeModal = () => {
        setActiveStep(null);
        setDirection(0);
    };

    const goToStep = (nextIndex: number, nextDirection: number) => {
        setDirection(nextDirection);
        setActiveStep((nextIndex + steps.length) % steps.length);
    };

    useEffect(() => {
        if (!isModalOpen || activeStep === null) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                closeModal();
                return;
            }

            if (event.key === "ArrowRight") {
                event.preventDefault();
                goToStep(activeStep + 1, 1);
            }

            if (event.key === "ArrowLeft") {
                event.preventDefault();
                goToStep(activeStep - 1, -1);
            }
        };

        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", onKeyDown);

        return () => {
            document.body.style.overflow = "auto";
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [isModalOpen, activeStep]);

    const stepCardClassName =
        "group relative h-full w-full overflow-hidden text-left p-8 md:p-10 flex flex-col justify-end transition-colors duration-300 hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60";
    const stepPreviewClassName = "h-full w-full object-cover grayscale contrast-125 brightness-75 opacity-45";

    return (
        <Section id="how-to-use" title="Steps" subtitle="How To Use" verticalTitle="Guide" className="py-20 md:py-24">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-px border border-accent/20 bg-accent/20 overflow-hidden">
                <div className="md:col-span-8 md:row-span-2 overflow-hidden bg-background">
                    <button onClick={() => openStep(0)} className={`${stepCardClassName} h-[320px] sm:h-[380px] md:h-[701px] p-10 md:p-14`}>
                        <div className="absolute inset-0">
                            <img src={steps[0].image} alt={`${steps[0].title} preview`} className={stepPreviewClassName} />
                            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-background/40" />
                            <div className="absolute inset-0 bg-gradient-to-r from-background/70 to-background/40" />
                        </div>
                        <div className="relative z-10 space-y-6">
                            <div className="flex items-center gap-3">
                                <span className="text-[9px] font-black tracking-widest text-foreground/40">/ {steps[0].id}</span>
                                <div className="h-px flex-1 bg-accent/30" />
                                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-accent">{steps[0].subtitle}</span>
                            </div>
                            <h3 className="text-4xl md:text-6xl font-black tracking-tighter leading-none uppercase">
                                {steps[0].title}
                            </h3>
                            <p className="max-w-xl text-sm md:text-base text-foreground/80 font-light leading-relaxed">
                                {steps[0].description}
                            </p>
                        </div>
                        <div className="pointer-events-none absolute inset-0">
                            <div className="absolute top-0 right-0 h-32 w-32 border-t border-r border-accent/40" />
                            <div className="absolute bottom-0 left-0 h-32 w-32 border-b border-l border-accent/30" />
                        </div>
                    </button>
                </div>

                <div className="md:col-span-4 overflow-hidden border-b md:border-b-0 border-foreground/5 bg-background">
                    <button onClick={() => openStep(1)} className={`${stepCardClassName} h-[220px] sm:h-[260px] md:h-[350px]`}>
                        <div className="absolute inset-0">
                            <img src={steps[1].image} alt={`${steps[1].title} preview`} className={stepPreviewClassName} />
                            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-background/40" />
                            <div className="absolute inset-0 bg-gradient-to-r from-background/70 to-background/40" />
                        </div>
                        <div className="relative z-10 space-y-4">
                            <div className="flex items-center gap-3">
                                <span className="text-[9px] font-black tracking-widest text-foreground/40">/ {steps[1].id}</span>
                                <div className="h-px flex-1 bg-accent/30" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-accent">{steps[1].subtitle}</span>
                            <h3 className="text-2xl md:text-3xl font-black tracking-tighter leading-none uppercase">{steps[1].title}</h3>
                            <p className="text-sm text-foreground/80 font-light leading-relaxed">{steps[1].description}</p>
                        </div>
                    </button>
                </div>

                <div className="md:col-span-4 overflow-hidden bg-background">
                    <button onClick={() => openStep(2)} className={`${stepCardClassName} h-[220px] sm:h-[260px] md:h-[350px]`}>
                        <div className="absolute inset-0">
                            <img src={steps[2].image} alt={`${steps[2].title} preview`} className={stepPreviewClassName} />
                            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-background/40" />
                            <div className="absolute inset-0 bg-gradient-to-r from-background/70 to-background/40" />
                        </div>
                        <div className="relative z-10 space-y-4">
                            <div className="flex items-center gap-3">
                                <span className="text-[9px] font-black tracking-widest text-foreground/40">/ {steps[2].id}</span>
                                <div className="h-px flex-1 bg-accent/30" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-accent">{steps[2].subtitle}</span>
                            <h3 className="text-2xl md:text-3xl font-black tracking-tighter leading-none uppercase">{steps[2].title}</h3>
                            <p className="text-sm text-foreground/80 font-light leading-relaxed">{steps[2].description}</p>
                        </div>
                    </button>
                </div>

                <div className="md:col-span-6 overflow-hidden border-t border-foreground/5 bg-background">
                    <button onClick={() => openStep(3)} className={`${stepCardClassName} h-[210px] sm:h-[240px] md:h-[300px]`}>
                        <div className="absolute inset-0">
                            <img src={steps[3].image} alt={`${steps[3].title} preview`} className={stepPreviewClassName} />
                            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-background/40" />
                            <div className="absolute inset-0 bg-gradient-to-r from-background/70 to-background/40" />
                        </div>
                        <div className="relative z-10 space-y-4">
                            <div className="flex items-center gap-3">
                                <span className="text-[9px] font-black tracking-widest text-foreground/40">/ {steps[3].id}</span>
                                <div className="h-px flex-1 bg-accent/30" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-accent">{steps[3].subtitle}</span>
                            <h3 className="text-2xl md:text-4xl font-black tracking-tighter leading-none uppercase">{steps[3].title}</h3>
                            <p className="text-sm text-foreground/80 font-light leading-relaxed">{steps[3].description}</p>
                        </div>
                    </button>
                </div>

                <div className="md:col-span-6 overflow-hidden border-t border-l md:border-t md:border-l-0 border-foreground/5 bg-background">
                    <button onClick={() => openStep(4)} className={`${stepCardClassName} h-[210px] sm:h-[240px] md:h-[300px]`}>
                        <div className="absolute inset-0">
                            <img src={steps[4].image} alt={`${steps[4].title} preview`} className={stepPreviewClassName} />
                            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-background/40" />
                            <div className="absolute inset-0 bg-gradient-to-r from-background/70 to-background/40" />
                        </div>
                        <div className="relative z-10 space-y-4">
                            <div className="flex items-center gap-3">
                                <span className="text-[9px] font-black tracking-widest text-foreground/40">/ {steps[4].id}</span>
                                <div className="h-px flex-1 bg-accent/30" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-accent">{steps[4].subtitle}</span>
                            <h3 className="text-2xl md:text-4xl font-black tracking-tighter leading-none uppercase">{steps[4].title}</h3>
                            <p className="text-sm text-foreground/80 font-light leading-relaxed">{steps[4].description}</p>
                        </div>
                    </button>
                </div>
            </div>

            {typeof document !== "undefined" &&
                createPortal(
                    <AnimatePresence>
                        {isModalOpen && currentStep && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-[120] flex items-center justify-center p-4 md:p-8"
                            >
                                <button onClick={closeModal} className="absolute inset-0 bg-background/80 backdrop-blur-sm" aria-label="Close step modal" />

                                <div
                                    role="dialog"
                                    aria-modal="true"
                                    aria-label={`Step ${currentStep.id}`}
                                    className="relative z-10 flex max-h-[92svh] w-full max-w-4xl flex-col overflow-hidden border border-accent/30 bg-background shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
                                >
                                    <button
                                        onClick={closeModal}
                                        className="absolute right-3 top-3 rounded-full border border-foreground/15 p-2 text-foreground/70 transition-colors hover:border-accent hover:text-accent md:right-4 md:top-4"
                                        aria-label="Close"
                                    >
                                        <X size={18} />
                                    </button>

                                    <div className="border-b border-accent/20 p-4 pr-16 md:p-6 md:pr-20">
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-accent">Step {currentStep.id}</span>
                                            <div className="h-px flex-1 bg-accent/30" />
                                            <span className="text-xs uppercase tracking-[0.2em] text-foreground/60">
                                                {activeStep !== null ? `${activeStep + 1} / ${steps.length}` : ""}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="overflow-y-auto px-6 py-8 md:p-10">
                                        <AnimatePresence mode="wait" custom={direction}>
                                            <motion.div
                                                key={currentStep.id}
                                                custom={direction}
                                                initial={{ x: direction >= 0 ? 80 : -80, opacity: 0 }}
                                                animate={{ x: 0, opacity: 1 }}
                                                exit={{ x: direction >= 0 ? -80 : 80, opacity: 0 }}
                                                transition={{ duration: 0.25, ease: "easeOut" }}
                                                className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8"
                                            >
                                                <div className="order-2 md:order-1 space-y-5">
                                                    <span className="inline-block rounded-full border border-accent/40 px-4 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-accent">
                                                        {currentStep.subtitle}
                                                    </span>
                                                    <h3 className="text-3xl md:text-5xl font-black uppercase tracking-tighter leading-none">
                                                        {currentStep.title}
                                                    </h3>
                                                    <p className="text-base md:text-lg text-foreground/80 leading-relaxed">{currentStep.description}</p>
                                                    <p className="text-sm text-foreground/60">Use Left/Right arrow keys to move between steps.</p>
                                                </div>
                                                <div className="order-1 md:order-2 flex items-center justify-center overflow-hidden border border-accent/20 bg-foreground/[0.02]">
                                                    <img
                                                        src={currentStep.image}
                                                        alt={`${currentStep.title} visual`}
                                                        className="max-h-[46svh] w-full object-contain md:max-h-[56svh]"
                                                    />
                                                </div>
                                            </motion.div>
                                        </AnimatePresence>
                                    </div>

                                    <div className="grid grid-cols-2 border-t border-accent/20">
                                        <button
                                            onClick={() => activeStep !== null && goToStep(activeStep - 1, -1)}
                                            className="flex items-center justify-center gap-2 border-r border-accent/20 px-4 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-foreground/80 transition-colors hover:bg-accent/10 hover:text-accent"
                                        >
                                            <ChevronLeft size={18} /> Previous
                                        </button>
                                        <button
                                            onClick={() => activeStep !== null && goToStep(activeStep + 1, 1)}
                                            className="flex items-center justify-center gap-2 px-4 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-foreground/80 transition-colors hover:bg-accent/10 hover:text-accent"
                                        >
                                            Next <ChevronRight size={18} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>,
                    document.body
                )}
        </Section>
    );
}
