"use client";

import Section from "./Section";
import { Code2, Database, Server, Smartphone } from "lucide-react";

const stacks = [
  {
    title: "Flutter Client",
    icon: <Smartphone size={18} />,
    details: [
      "Feature-first structure (Auth, Dashboard, Session, Classroom, Notifications).",
      "Provider state management + GetIt DI.",
      "Dio with JWT interceptors and secure storage.",
    ],
  },
  {
    title: "FastAPI Backend",
    icon: <Server size={18} />,
    details: [
      "REST API for auth, classroom data, sessions, alerts, and metrics.",
      "SQLAlchemy + MySQL; Alembic migrations.",
      "ML telemetry aggregation and engagement scoring.",
    ],
  },
  {
    title: "Admin Portal",
    icon: <Code2 size={18} />,
    details: [
      "Next.js admin panel with superuser tools.",
      "User/session oversight + alert center.",
      "Model operations (select active detector model).",
    ],
  },
  {
    title: "Database",
    icon: <Database size={18} />,
    details: [
      "MySQL 8+ recommended.",
      "Use Alembic migrations (no runtime auto-create).",
      "Seed helpers exist under `server/` for local demos.",
    ],
  },
];

export default function DeveloperNotes() {
  return (
    <Section
      id="developer"
      title="Developer Notes"
      subtitle="For Local Setup"
      verticalTitle="Dev"
      className="py-20 md:py-24"
    >
      <div className="grid gap-px border border-foreground/5 bg-foreground/5 md:grid-cols-12 overflow-hidden">
        <div className="md:col-span-5 bg-background p-10 md:p-12">
          <div className="space-y-6">
            <p className="text-2xl md:text-3xl font-black tracking-tight">
              Run the full system locally.
            </p>
            <p className="text-sm md:text-base text-foreground/60 leading-relaxed">
              TeachTrack is a multi-workspace repo: `server/` (FastAPI), `client/`
              (Flutter), `admin/` (Next.js), and this `docs-site/`. Use the
              READMEs inside each workspace for exact environment variables.
            </p>

            <div className="space-y-4 border-l-2 border-accent/20 pl-6">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.5em] text-accent">
                  Backend
                </div>
                <p className="mt-2 text-sm text-foreground/65">
                  `cd server` → install deps → `alembic upgrade head` → `uvicorn app.main:app --reload`
                </p>
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.5em] text-accent">
                  Admin
                </div>
                <p className="mt-2 text-sm text-foreground/65">
                  `cd admin` → `npm install` → `npm run dev`
                </p>
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.5em] text-accent">
                  Client
                </div>
                <p className="mt-2 text-sm text-foreground/65">
                  `cd client` → `flutter pub get` → create `client/.env` → `flutter run`
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-px bg-foreground/5">
          {stacks.map((s) => (
            <div key={s.title} className="bg-background p-8 md:p-10">
              <div className="flex items-center gap-3">
                <span className="text-accent/90">{s.icon}</span>
                <h3 className="text-sm font-black uppercase tracking-[0.25em]">
                  {s.title}
                </h3>
              </div>
              <div className="mt-6 space-y-3 text-sm text-foreground/60">
                {s.details.map((d) => (
                  <p key={d} className="leading-relaxed">
                    {d}
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

