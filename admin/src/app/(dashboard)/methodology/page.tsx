"use client";

import { useEffect, useState } from "react";
import { 
  Calculator, 
  Camera, 
  CheckCircle2, 
  Info, 
  TrendingUp, 
  UserPlus, 
  Users, 
  Scale, 
  Zap,
  HelpCircle,
  BarChart4
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSettings } from "@/features/admin/api";
import { AdminSettings } from "@/features/admin/types";
import { Badge } from "@/components/ui/badge";

export default function MethodologyPage() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);

  useEffect(() => {
    getSettings().then(setSettings).catch(console.error);
  }, []);

  const weights = settings?.engagement_weights?.LECTURE || {
    on_task: 1.0,
    using_phone: 1.2,
    sleeping: 1.5,
    off_task: 1.0,
    not_visible: 0.0
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeader 
        title={<><BarChart4 className="h-5 w-5" />Analytics Methodology</>} 
        description="A transparent guide to how TeachTrack calculates classroom engagement."
      />

      {/* Hero Breakdown */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-wider text-[10px]">
              <UserPlus className="h-3 w-3" /> Step 1: Baseline
            </div>
            <CardTitle className="text-lg">AI Detection</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The system identifies students currently <strong>in the camera's view</strong>. This "Visible Sample" becomes the basis for the current snapshot's engagement score.
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-wider text-[10px]">
              <Camera className="h-3 w-3" /> Step 2: Behavior Analysis
            </div>
            <CardTitle className="text-lg">YOLO Inference</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The AI counts <strong>specific behaviors</strong> (On-Task, Phone, Sleep) for only the detected students. Students out of frame are counted as "Not Visible" but do not penalize the score.
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-wider text-[10px]">
              <Calculator className="h-3 w-3" /> Step 3: Scoring
            </div>
            <CardTitle className="text-lg">Visibility-Based Avg</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Engagement is calculated by taking the weighted behaviors of <strong>observed students</strong> and dividing by the <strong>number of students seen</strong>.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* The Formula Section */}
      <Card className="overflow-hidden border-border/40">
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-8 text-center text-white">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/60 mb-4">The Engagement Formula</p>
          <div className="mx-auto flex flex-col md:flex-row items-center justify-center gap-4 text-xl md:text-2xl font-light">
            <div className="flex items-center gap-2">
              <span className="text-success">(On Task &times; {weights.on_task})</span>
              <span className="text-white/40">&mdash;</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-danger">(Sleep &times; {weights.sleeping})</span>
              <span className="text-white/20">+</span>
              <span className="text-danger">(Phone &times; {weights.using_phone})</span>
              <span className="text-white/20">+</span>
              <span className="text-danger">(Off Task &times; {weights.off_task})</span>
            </div>
            <div className="h-px w-24 bg-white/20 md:hidden" />
            <div className="hidden md:block h-12 w-px bg-white/20" />
            <div className="flex flex-col items-center">
                <span className="text-sm text-white/40 mb-1">divided by</span>
                <span className="font-bold border-t border-white/20 pt-1">Total Visible Sample</span>
            </div>
          </div>
          <div className="mt-8 flex justify-center gap-6 text-[10px] uppercase font-bold text-white/40">
              <div className="flex items-center gap-1"><Zap className="h-3 w-3 text-warning" /> Clamped [0% to 100%]</div>
              <div className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-success" /> FOV Adaptive</div>
          </div>
        </div>
      </Card>

      {/* Behavior Calibration Legend */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">Current Scoring Rules</CardTitle>
                <Scale className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground italic leading-relaxed">
                   Rules are configured in System Settings. These modifiers determine how severely different behaviors impact the class average.
                </p>
                <div className="space-y-2.5">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-success/5 border border-success/10">
                        <span className="text-sm font-medium">On-Task Reward</span>
                        <Badge tone="success">+{weights.on_task} points</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-danger/5 border border-danger/10">
                        <span className="text-sm font-medium">Sleeping Penalty</span>
                        <Badge tone="danger">-{weights.sleeping} points</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-danger/5 border border-danger/10">
                        <span className="text-sm font-medium">Phone Usage Penalty</span>
                        <Badge tone="danger">-{weights.using_phone} points</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-danger/5 border border-danger/10">
                        <span className="text-sm font-medium">Generic Off-Task Penalty</span>
                        <Badge tone="danger">-{weights.off_task} points</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-warning/5 border border-warning/10 opacity-50">
                        <span className="text-sm font-medium text-muted-foreground">Invisible Penalty (Legacy)</span>
                        <Badge tone="warning">0.0 (Ignored)</Badge>
                    </div>
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-base">Why Visibility-Based Normalization?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
                <div className="flex items-start gap-3">
                    <div className="mt-1 rounded-full bg-primary/10 p-2">
                        <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold">Hardware Adaptability</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                            Classrooms have different dimensions and camera setups. By calculating engagement based on detected students, we provide a fair metric that isn't penalized by limited camera field-of-view (FOV).
                        </p>
                    </div>
                </div>
                <div className="flex items-start gap-3">
                    <div className="mt-1 rounded-full bg-secondary/20 p-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold">Statistically Sound Sampling</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                            The students in range of the camera act as a representative sample of the class's current state. This ensures the engagement score accurately reflects the intensity of observed behavior.
                        </p>
                    </div>
                </div>
                <div className="rounded-lg bg-muted/40 p-3 flex items-center gap-3 text-xs border border-border/50">
                    <Info className="h-4 w-4 shrink-0 text-primary" />
                    <span>Administrators can toggle these values to match the specific educational environment of the school.</span>
                </div>
            </CardContent>
        </Card>
      </div>

      {/* Help Section */}
      <div className="flex flex-col items-center justify-center p-8 bg-card border rounded-2xl text-center space-y-4">
          <HelpCircle className="h-8 w-8 text-primary/50" />
          <div>
              <h3 className="font-bold">Have questions about the math?</h3>
              <p className="text-sm text-muted-foreground">Adjust your scoring thresholds in the System Settings to refine the sensitivity.</p>
          </div>
      </div>
    </div>
  );
}
