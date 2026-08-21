import { redirect } from "next/navigation";

import { API_V1 } from "@/lib/api-client";
import type { Stage } from "@/types/models";

async function firstTeamStageId(): Promise<number | null> {
  try {
    const res = await fetch(`${API_V1}/stages`, { cache: "no-store" });
    if (!res.ok) return null;
    const stages = (await res.json()) as Stage[];
    const teamStage = stages.find((s) => s.name.includes("團")) ?? stages[0];
    return teamStage ? teamStage.id : null;
  } catch {
    return null;
  }
}

export default async function TeamsIndex() {
  const id = await firstTeamStageId();
  redirect(id != null ? `/teams/${id}` : "/admin/groups");
}
