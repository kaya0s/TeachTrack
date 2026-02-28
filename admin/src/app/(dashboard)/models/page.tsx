"use client";

import { useEffect, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { getModels, selectModel } from "@/features/admin/api";
import type { ModelSelectionResponse } from "@/features/admin/types";

export default function ModelsPage() {
  const { notify } = useToast();
  const [data, setData] = useState<ModelSelectionResponse | null>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="space-y-4">
      <PageHeader title="Models" description="Control YOLO model selection for detector operations." />
      <Card>
        <CardHeader>
          <CardTitle>Available models</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <>
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </>
          ) : data?.models.length ? (
            data?.models.map((model) => (
              <div key={model.file_name} className="flex items-center justify-between rounded-md border p-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{model.file_name}</span>
                  {model.is_current ? <Badge tone="success">Current</Badge> : null}
                </div>
                <Button
                  size="sm"
                  variant={model.is_current ? "outline" : "default"}
                  disabled={model.is_current}
                  onClick={async () => {
                    try {
                      await selectModel(model.file_name);
                      notify({
                        tone: "success",
                        title: "Model switched",
                        description: `${model.file_name} is now active.`,
                      });
                      await load();
                    } catch (err) {
                      notify({
                        tone: "danger",
                        title: "Model switch failed",
                        description: err instanceof Error ? err.message : "Could not set active model.",
                      });
                    }
                  }}
                >
                  {model.is_current ? "Selected" : "Set active"}
                </Button>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No models available.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
