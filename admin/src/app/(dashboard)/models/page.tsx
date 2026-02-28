"use client";

import { useEffect, useState } from "react";
import { BrainCircuit, CheckCircle2, Cpu, Info, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getModels, selectModel } from "@/features/admin/api";
import type { ModelSelectionResponse } from "@/features/admin/types";

const MODEL_DESCRIPTIONS: Record<string, string> = {
  "yolo11n.pt": "Ultra-fast lightweight model. Ideal for real-time edge processing with minimal latency.",
  "yolo11s.pt": "Balanced detection model. Offers a compromise between speed and accuracy for most classrooms.",
  "yolo11m.pt": "High-precision medium model. Best for dense classrooms where detail is critical.",
  "yolo11l.pt": "Maximum accuracy large model. Highest detection rate, requires significant GPU power.",
  "yolo11x.pt": "Extreme performance model. State-of-the-art accuracy with the highest parameter count.",
};

export default function ModelsPage() {
  const { notify } = useToast();
  const [data, setData] = useState<ModelSelectionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setData(await getModels());
    } catch (err) {
      notify({
        tone: "danger",
        title: "Models load failed",
        description: err instanceof Error ? err.message : "Could not fetch models.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSelectModel(fileName: string) {
    setSwitchingId(fileName);
    try {
      await selectModel(fileName);
      notify({
        tone: "success",
        title: "Intelligence Switched",
        description: `Backend brain updated to ${fileName}.`,
      });
      await load();
    } catch (err) {
      notify({
        tone: "danger",
        title: "Deployment failed",
        description: err instanceof Error ? err.message : "Could not set active model.",
      });
    } finally {
      setSwitchingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader
          title={<><Cpu className="h-5 w-5" />A.I. Models</>}
          description="Manage behavioral detection architectures and inference weights."
        />
        {data?.models.some(m => m.is_current) && (
          <Badge tone="success" className="h-8 rounded-full px-3 text-xs font-medium border-success/20 bg-success/5 text-success">
            System Operational
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="overflow-hidden shadow-none border-border">
              <CardHeader className="space-y-2">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-10 w-full" />
              </CardFooter>
            </Card>
          ))
        ) : data?.models.length ? (
          data?.models.map((model) => {
            const isCurrent = model.is_current;
            const isSwitching = switchingId === model.file_name;
            const description = MODEL_DESCRIPTIONS[model.file_name] || "Standard YOLO detection weights.";

            return (
              <Card
                key={model.file_name}
                className={cn(
                  "relative flex flex-col h-full transition-all border-border shadow-none hover:shadow-sm",
                  isCurrent && "border-primary/50 bg-primary/[0.01] shadow-sm ring-1 ring-primary/10"
                )}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        {model.file_name.toUpperCase().replace(".PT", "")}
                        {isCurrent && <CheckCircle2 className="h-4 w-4 text-primary" />}
                      </CardTitle>
                      <CardDescription className="text-xs font-medium text-muted-foreground uppercase tracking-tight">
                        Inference Architecture
                      </CardDescription>
                    </div>
                    {isCurrent && (
                      <Badge tone="success" className="text-[10px] h-5 rounded-full px-2">
                        Active
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="rounded-xl bg-muted/30 p-4 border border-border/50">
                    <div className="flex gap-3 text-muted-foreground">
                      <Info className="h-4 w-4 shrink-0 mt-0.5 text-primary/70" />
                      <p className="text-sm leading-relaxed text-foreground/80">
                        {description}
                      </p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full h-10 rounded-lg font-bold"
                    variant={isCurrent ? "outline" : "default"}
                    disabled={isCurrent || isSwitching}
                    onClick={() => handleSelectModel(model.file_name)}
                  >
                    {isSwitching ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Syncing...</>
                    ) : isCurrent ? (
                      <><CheckCircle2 className="mr-2 h-4 w-4" /> Operational</>
                    ) : (
                      "Set Active Brain"
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full border border-dashed rounded-3xl h-80 flex flex-col items-center justify-center text-center p-8 bg-muted/5">
            <BrainCircuit className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-bold">No AI Weights Found</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
              Please verify that your weights directory contains valid detection models.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
