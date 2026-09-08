"use client";

import Section from "./Section";
import { Code2, Database, Server, Smartphone, Cloud, Eye } from "lucide-react";

const stacks = [
  {
    title: "Flutter Client",
    icon: <Smartphone size={18} />,
    details: [
      "Feature-first structure (Auth, Dashboard, Session, Classroom, Notifications).",
      "Live activity mode toggle (Lecture <-> Exam) with zero camera reset.",
      "High-priority visual alert snackbars for exam gadget violations.",
      "Provider state management + Dio JWT interceptors & secure storage.",
    ],
  },
  {
    title: "FastAPI Backend",
    icon: <Server size={18} />,
    details: [
      "RESTful endpoints for auth, classrooms, sessions, alerts, and live mode switching.",
      "Atomic PATCH /api/v1/sessions/{id}/mode transitions with session_history audit trails.",
      "Automated volatile policy for exam proctoring metrics and log pruning.",
      "SQLAlchemy + MySQL 8; Alembic database migrations.",
    ],
  },
  {
    title: "Computer Vision & ML",
    icon: <Eye size={18} />,
    details: [
      "YOLOv8/v11 behavior telemetry and real-time student pose/gadget inference.",
      "Instant phone detection in Exam mode triggering critical alert snapshots.",
      "Dynamic model weight switching via Admin Settings API without backend restarts.",
    ],
  },
  {
    title: "Cloud Backup & Drive",
    icon: <Cloud size={18} />,
    details: [
      "Compressed mysqldump backups uploaded directly to Google Drive via OAuth 2.0 / token.json.",
      "Superuser manual trigger and history overview in the Admin portal.",
      "Backup lifecycle audits with automated quota handling and error telemetry.",
    ],
  },
  {
    title: "Admin Portal",
    icon: <Code2 size={18} />,
    details: [
      "Next.js 15 App Router panel with full Superuser & Teacher management controls.",
      "Session Intelligence with interactive mode switch timelines and alert center.",
      "College, Department, Major, Subject, Section hierarchy oversight.",
    ],
  },
  {
    title: "Database Architecture",
    icon: <Database size={18} />,
    details: [
      "MySQL 8+ schema with Alembic migration version control.",
      "Indexed session metrics, behavior logs, alerts, and audit logging tables.",
      "Safe transactional operations for teacher updates and backup records.",
    ],
  },
];

export default function DeveloperNotes() {
  return (
    <Section
      id="developer"
      title="Developer Notes"
      subtitle="Architecture & Setup"
      verticalTitle="Dev"
      className="py-20 md:py-24"
    >
      <div className="grid gap-px border border-foreground/5 bg-foreground/5 md:grid-cols-12 overflow-hidden">
        <div className="md:col-span-4 bg-background p-10 md:p-12">
          <div className="space-y-6">
            <p className="text-2xl md:text-3xl font-black tracking-tight">
              Run the complete TeachTrack suite locally.
            </p>
            <p className="text-sm md:text-base text-foreground/60 leading-relaxed">
              TeachTrack is organized into dedicated workspaces: <code className="text-accent text-xs">server/</code> (FastAPI), <code className="text-accent text-xs">client/</code> (Flutter), <code className="text-accent text-xs">admin/</code> (Next.js), and <code className="text-accent text-xs">docs-site/</code>.
            </p>

            <div className="space-y-4 border-l-2 border-accent/20 pl-6">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.5em] text-accent">
                  Backend (FastAPI)
                </div>
                <p className="mt-2 text-xs text-foreground/65 font-mono">
                  cd server && alembic upgrade head && uvicorn app.main:app --reload
                </p>
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.5em] text-accent">
                  Admin Portal (Next.js)
                </div>
                <p className="mt-2 text-xs text-foreground/65 font-mono">
                  cd admin && npm install && npm run dev
                </p>
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.5em] text-accent">
                  Mobile App (Flutter)
                </div>
                <p className="mt-2 text-xs text-foreground/65 font-mono">
                  cd client && flutter pub get && flutter run
                </p>
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.5em] text-accent">
                  Drive Backup Token
                </div>
                <p className="mt-2 text-xs text-foreground/65 font-mono">
                  python server/scripts/generate_drive_token.py
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-foreground/5">
          {stacks.map((s) => (
            <div key={s.title} className="bg-background p-6 md:p-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-accent/90">{s.icon}</span>
                  <h3 className="text-xs font-black uppercase tracking-[0.2em]">
                    {s.title}
                  </h3>
                </div>
                <div className="mt-5 space-y-2.5 text-xs text-foreground/60">
                  {s.details.map((d) => (
                    <p key={d} className="leading-relaxed">
                      • {d}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
