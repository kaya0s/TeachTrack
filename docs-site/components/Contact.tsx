"use client";

import { useState } from "react";
import Section from "./Section";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Github, Linkedin, Mail, Instagram } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const formSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    message: z.string().min(10, "Message must be at least 10 characters"),
});

type FormData = z.infer<typeof formSchema>;

export default function Contact() {
    const [isSubmitted, setIsSubmitted] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset,
    } = useForm<FormData>({
        resolver: zodResolver(formSchema),
    });

    const onSubmit = (data: FormData) => {
        // Create mailto link with form data
        const subject = encodeURIComponent(`TeachTrack Contact: ${data.name}`);
        const body = encodeURIComponent(`Name: ${data.name}\nEmail: ${data.email}\n\nMessage:\n${data.message}`);
        const mailtoLink = `mailto:erwin.lanzaderas@gmail.com?subject=${subject}&body=${body}`;
        
        // Open user's email client
        window.location.href = mailtoLink;
        
        // Show success message
        setIsSubmitted(true);
        reset();
        setTimeout(() => setIsSubmitted(false), 5000);
    };

    return (
        <Section id="support" title="Support" subtitle="Help" verticalTitle="Support">
            <div className="grid gap-12 md:grid-cols-2">
                <div className="space-y-12">
                    <div className="space-y-4">
                        <h3 className="text-3xl font-bold">Need help?</h3>
                        <p className="text-lg text-foreground/60">
                            Send a message to support and include details about what you were doing when the issue happened.
                        </p>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center gap-6">
                            <a
                                href="https://github.com/kaya0s"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex h-12 w-12 items-center justify-center border border-foreground/10 transition-colors hover:border-accent"
                            >
                                <Github size={20} className="text-foreground/40 transition-colors group-hover:text-accent" />
                            </a>
                            <a
                                href="https://www.linkedin.com/in/erwin-lanzaderas-263812312/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex h-12 w-12 items-center justify-center border border-foreground/10 transition-colors hover:border-accent"
                            >
                                <Linkedin size={20} className="text-foreground/40 transition-colors group-hover:text-accent" />
                            </a>
                            <a
                                href="https://www.instagram.com/yaosthegreat/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex h-12 w-12 items-center justify-center border border-foreground/10 transition-colors hover:border-accent"
                            >
                                <Instagram size={20} className="text-foreground/40 transition-colors group-hover:text-accent" />
                            </a>
                            <a
                                href="mailto:erwin.lanzaderas@gmail.com"
                                className="group flex h-12 w-12 items-center justify-center border border-foreground/10 transition-colors hover:border-accent"
                            >
                                <Mail size={20} className="text-foreground/40 transition-colors group-hover:text-accent" />
                            </a>
                        </div>
                        <p className="text-xs uppercase tracking-[0.3em] text-foreground/30">
                            Support email: erwin.lanzaderas@gmail.com
                        </p>
                    </div>
                </div>

                <div className="relative">
                    <AnimatePresence mode="wait">
                        {!isSubmitted ? (
                            <motion.form
                                key="contact-form"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                onSubmit={handleSubmit(onSubmit)}
                                className="space-y-8"
                            >
                                <div className="grid gap-8 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/40">
                                            Name
                                        </label>
                                        <input
                                            {...register("name")}
                                            placeholder="Your Name"
                                            className="w-full border-b border-foreground/10 bg-transparent py-3 text-sm outline-none transition-colors focus:border-accent"
                                        />
                                        {errors.name && <p className="text-[10px] text-accent">{errors.name.message}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/40">
                                            Email
                                        </label>
                                        <input
                                            {...register("email")}
                                            placeholder="hello@example.com"
                                            className="w-full border-b border-foreground/10 bg-transparent py-3 text-sm outline-none transition-colors focus:border-accent"
                                        />
                                        {errors.email && <p className="text-[10px] text-accent">{errors.email.message}</p>}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/40">
                                        Message
                                    </label>
                                    <textarea
                                        {...register("message")}
                                        rows={4}
                                        placeholder="Describe the issue or question..."
                                        className="w-full border-b border-foreground/10 bg-transparent py-3 text-sm outline-none transition-colors focus:border-accent"
                                    />
                                    {errors.message && <p className="text-[10px] text-accent">{errors.message.message}</p>}
                                </div>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="group flex w-full items-center justify-center gap-3 bg-foreground py-4 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
                                >
                                    {isSubmitting ? "Sending..." : "Send Message"}
                                    {!isSubmitting && <Send size={16} className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />}
                                </button>
                            </motion.form>
                        ) : (
                            <motion.div
                                key="success-message"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex h-full min-h-[400px] flex-col items-center justify-center border border-accent/20 bg-accent/[0.02] p-8 text-center"
                            >
                                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-accent">
                                    <Send size={24} />
                                </div>
                                <h3 className="mb-2 text-2xl font-bold">Message Received.</h3>
                                <p className="text-foreground/60">
                                    Thank you for reaching out. I will get back to you within 24 hours.
                                </p>
                                <button
                                    onClick={() => setIsSubmitted(false)}
                                    className="mt-8 text-xs font-bold uppercase tracking-widest text-accent hover:underline"
                                >
                                    Send another message
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </Section>
    );
}
