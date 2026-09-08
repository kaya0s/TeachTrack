"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Section from "./Section";

const steps = [
    {
        id: "01",
        tag: "INSTALLATION",
        title: "Install the app",
        subtitle: "Android APK",
        description:
            "Install TeachTrack on your Android device. Once the APK package is ready, download and install it, then grant camera and local network permissions.",
        image: "/images/step1.png",
        tip: "Ensure your device is running Android 8.0 or later.",
    },
    {
        id: "02",
        tag: "AUTH",
        title: "Sign in / Access",
        subtitle: "Authentication",
        description:
            "Sign in using email/password or one-tap Google Sign-In. If you forget your password, use the email verification code flow to reset securely.",
        image: "/images/step2.png",
        tip: "Password recovery codes expire in 10 minutes.",
    },
    {
        id: "03",
        tag: "SETUP",
        title: "Select class & mode",
        subtitle: "Configuration",
        description:
            "Choose your assigned Subject and Section, and pick your initial activity mode (Lecture or Exam). Confirm expected attendance before starting.",
        image: "/images/step3.png",
        tip: "You can change activity modes live at any time.",
    },
    {
        id: "04",
        tag: "AI MONITOR",
        title: "Live monitor & switch",
        subtitle: "Real-time Telemetry",
        description:
            "Watch real-time engagement and posture streams. Switch seamlessly between Lecture and Exam modes live in session without resetting camera feeds.",
        image: "/images/step4.png",
        tip: "Zero detector downtime during mode transitions.",
    },
    {
        id: "05",
        tag: "PROCTORING",
        title: "Gadget alerts & review",
        subtitle: "Integrity & Insights",
        description:
            "Receive instant critical alerts when smartphones or unauthorized gadgets are spotted in exam mode. Review full post-session metrics and timelines.",
        image: "/images/step5.png",
        tip: "Exam gadget metrics adhere to strict privacy purging.",
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
        "group relative h-full w-full overflow-hidden text-left p-7 md:p-9 flex flex-col justify-between transition-all duration-300 hover:bg-accent/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60";
    const stepPreviewClassName = "h-full w-full object-cover grayscale contrast-125 brightness-75 opacity-40 group-hover:scale-105 transition-transform duration-700";

    return (
        <Section id="how-to-use" title="Steps" subtitle="How To Use" verticalTitle="Guide" className="py-20 md:py-24">
            {/* Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-px border border-foreground/10 bg-foreground/10 overflow-hidden mt-6 shadow-sm">
                {/* Step 1 - Large Feature Card */}
                <div className="md:col-span-8 md:row-span-2 overflow-hidden bg-background">
                    <button onClick={() => openStep(0)} className={`${stepCardClassName} min-h-[340px] sm:min-h-[400px] md:h-[680px]`}>
                        <div className="absolute inset-0">
                            <img src={steps[0].image} alt={`${steps[0].title} preview`} className={stepPreviewClassName} />
                            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-background/50" />
                            <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-background/30" />
                        </div>
                        <div className="relative z-10 flex items-center justify-between w-full">
                            <div className="flex items-center gap-2.5">
                                <span className="px-2.5 py-1 bg-accent/15 border border-accent/30 text-accent text-[9px] font-black uppercase tracking-wider font-mono">
                                    {steps[0].tag}
                                </span>
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground/50">
                                    / Step {steps[0].id}
                                </span>
                            </div>
                            <span className="text-xs text-accent opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 font-semibold">
                                View Details <ArrowRight size={14} />
                            </span>
                        </div>
                        <div className="relative z-10 space-y-4 max-w-xl">
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-accent block">
                                {steps[0].subtitle}
                            </span>
                            <h3 className="text-3xl sm:text-4xl md:text-6xl font-black tracking-tight leading-none uppercase">
                                {steps[0].title}
                            </h3>
                            <p className="text-xs sm:text-sm md:text-base text-foreground/75 font-light leading-relaxed">
                                {steps[0].description}
                            </p>
                        </div>
                    </button>
                </div>

                {/* Step 2 */}
                <div className="md:col-span-4 overflow-hidden border-b md:border-b-0 border-foreground/10 bg-background">
                    <button onClick={() => openStep(1)} className={`${stepCardClassName} min-h-[220px] md:h-[340px]`}>
                        <div className="absolute inset-0">
                            <img src={steps[1].image} alt={`${steps[1].title} preview`} className={stepPreviewClassName} />
                            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-background/50" />
                        </div>
                        <div className="relative z-10 flex items-center justify-between w-full">
                            <span className="px-2.5 py-1 bg-accent/15 border border-accent/30 text-accent text-[9px] font-black uppercase tracking-wider font-mono">
                                {steps[1].tag}
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground/50">
                                / {steps[1].id}
                            </span>
                        </div>
                        <div className="relative z-10 space-y-2">
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-accent block">{steps[1].subtitle}</span>
                            <h3 className="text-xl sm:text-2xl font-black tracking-tight leading-tight uppercase">{steps[1].title}</h3>
                            <p className="text-xs text-foreground/70 font-light leading-relaxed line-clamp-2">{steps[1].description}</p>
                        </div>
                    </button>
                </div>

                {/* Step 3 */}
                <div className="md:col-span-4 overflow-hidden bg-background">
                    <button onClick={() => openStep(2)} className={`${stepCardClassName} min-h-[220px] md:h-[340px]`}>
                        <div className="absolute inset-0">
                            <img src={steps[2].image} alt={`${steps[2].title} preview`} className={stepPreviewClassName} />
                            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-background/50" />
                        </div>
                        <div className="relative z-10 flex items-center justify-between w-full">
                            <span className="px-2.5 py-1 bg-accent/15 border border-accent/30 text-accent text-[9px] font-black uppercase tracking-wider font-mono">
                                {steps[2].tag}
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground/50">
                                / {steps[2].id}
                            </span>
                        </div>
                        <div className="relative z-10 space-y-2">
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-accent block">{steps[2].subtitle}</span>
                            <h3 className="text-xl sm:text-2xl font-black tracking-tight leading-tight uppercase">{steps[2].title}</h3>
                            <p className="text-xs text-foreground/70 font-light leading-relaxed line-clamp-2">{steps[2].description}</p>
                        </div>
                    </button>
                </div>

                {/* Step 4 */}
                <div className="md:col-span-6 overflow-hidden border-t border-foreground/10 bg-background">
                    <button onClick={() => openStep(3)} className={`${stepCardClassName} min-h-[220px] md:h-[320px]`}>
                        <div className="absolute inset-0">
                            <img src={steps[3].image} alt={`${steps[3].title} preview`} className={stepPreviewClassName} />
                            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-background/50" />
                        </div>
                        <div className="relative z-10 flex items-center justify-between w-full">
                            <span className="px-2.5 py-1 bg-accent/15 border border-accent/30 text-accent text-[9px] font-black uppercase tracking-wider font-mono">
                                {steps[3].tag}
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground/50">
                                / {steps[3].id}
                            </span>
                        </div>
                        <div className="relative z-10 space-y-2">
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-accent block">{steps[3].subtitle}</span>
                            <h3 className="text-xl sm:text-3xl font-black tracking-tight leading-tight uppercase">{steps[3].title}</h3>
                            <p className="text-xs text-foreground/70 font-light leading-relaxed">{steps[3].description}</p>
                        </div>
                    </button>
                </div>

                {/* Step 5 */}
                <div className="md:col-span-6 overflow-hidden border-t border-l md:border-t md:border-l-0 border-foreground/10 bg-background">
                    <button onClick={() => openStep(4)} className={`${stepCardClassName} min-h-[220px] md:h-[320px]`}>
                        <div className="absolute inset-0">
                            <img src={steps[4].image} alt={`${steps[4].title} preview`} className={stepPreviewClassName} />
                            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-background/50" />
                        </div>
                        <div className="relative z-10 flex items-center justify-between w-full">
                            <span className="px-2.5 py-1 bg-accent/15 border border-accent/30 text-accent text-[9px] font-black uppercase tracking-wider font-mono">
                                {steps[4].tag}
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground/50">
                                / {steps[4].id}
                            </span>
                        </div>
                        <div className="relative z-10 space-y-2">
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-accent block">{steps[4].subtitle}</span>
                            <h3 className="text-xl sm:text-3xl font-black tracking-tight leading-tight uppercase">{steps[4].title}</h3>
                            <p className="text-xs text-foreground/70 font-light leading-relaxed">{steps[4].description}</p>
                        </div>
                    </button>
                </div>
            </div>

            {/* Modal Dialog */}
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
                                <button onClick={closeModal} className="absolute inset-0 bg-background/85 backdrop-blur-md" aria-label="Close step modal" />

                                <div
                                    role="dialog"
                                    aria-modal="true"
                                    aria-label={`Step ${currentStep.id}`}
                                    className="relative z-10 flex max-h-[92svh] w-full max-w-4xl flex-col overflow-hidden border border-accent/40 bg-background shadow-2xl"
                                >
                                    <button
                                        onClick={closeModal}
                                        className="absolute right-3 top-3 rounded-full border border-foreground/15 p-2 text-foreground/70 transition-colors hover:border-accent hover:text-accent md:right-4 md:top-4 z-20"
                                        aria-label="Close"
                                    >
                                        <X size={18} />
                                    </button>

                                    <div className="border-b border-foreground/10 p-4 pr-16 md:p-6 md:pr-20 bg-foreground/[0.02]">
                                        <div className="flex items-center gap-3">
                                            <span className="px-2.5 py-1 bg-accent/15 border border-accent/30 text-accent text-[10px] font-black uppercase tracking-wider font-mono">
                                                {currentStep.tag}
                                            </span>
                                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground/70">
                                                Step {currentStep.id} of {steps.length}
                                            </span>
                                            <div className="h-px flex-1 bg-foreground/10" />
                                        </div>
                                    </div>

                                    <div className="overflow-y-auto px-6 py-8 md:p-10">
                                        <AnimatePresence mode="wait" custom={direction}>
                                            <motion.div
                                                key={currentStep.id}
                                                custom={direction}
                                                initial={{ x: direction >= 0 ? 60 : -60, opacity: 0 }}
                                                animate={{ x: 0, opacity: 1 }}
                                                exit={{ x: direction >= 0 ? -60 : 60, opacity: 0 }}
                                                transition={{ duration: 0.2, ease: "easeOut" }}
                                                className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 items-center"
                                            >
                                                <div className="order-2 md:order-1 space-y-5">
                                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent block">
                                                        {currentStep.subtitle}
                                                    </span>
                                                    <h3 className="text-3xl md:text-4xl font-black uppercase tracking-tight leading-tight">
                                                        {currentStep.title}
                                                    </h3>
                                                    <p className="text-sm md:text-base text-foreground/80 leading-relaxed font-light">
                                                        {currentStep.description}
                                                    </p>

                                                    <div className="p-3.5 border border-accent/25 bg-accent/[0.05] rounded-sm space-y-1">
                                                        <span className="text-[9px] font-black uppercase tracking-wider text-accent block">Pro Tip</span>
                                                        <p className="text-xs text-foreground/75 font-medium">{currentStep.tip}</p>
                                                    </div>

                                                    <p className="text-[11px] text-foreground/40 italic">Use ← Left / Right → keys to navigate.</p>
                                                </div>
                                                <div className="order-1 md:order-2 flex items-center justify-center overflow-hidden border border-foreground/10 bg-foreground/[0.02] p-2">
                                                    <img
                                                        src={currentStep.image}
                                                        alt={`${currentStep.title} visual`}
                                                        className="max-h-[44svh] w-full object-contain md:max-h-[50svh]"
                                                    />
                                                </div>
                                            </motion.div>
                                        </AnimatePresence>
                                    </div>

                                    <div className="grid grid-cols-2 border-t border-foreground/10 bg-foreground/[0.02]">
                                        <button
                                            onClick={() => activeStep !== null && goToStep(activeStep - 1, -1)}
                                            className="flex items-center justify-center gap-2 border-r border-foreground/10 px-4 py-4 text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] text-foreground/80 transition-colors hover:bg-accent/10 hover:text-accent"
                                        >
                                            <ChevronLeft size={18} /> Previous
                                        </button>
                                        <button
                                            onClick={() => activeStep !== null && goToStep(activeStep + 1, 1)}
                                            className="flex items-center justify-center gap-2 px-4 py-4 text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] text-foreground/80 transition-colors hover:bg-accent/10 hover:text-accent"
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
