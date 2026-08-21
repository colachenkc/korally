import { redirect } from "next/navigation";

import { API_V1 } from "@/lib/api-client";
import type { Stage } from "@/types/models";

async function firstIndividualStageId(): Promise<number | null> {
  try {
    const res = await fetch(`${API_V1}/stages`, { cache: "no-store" });
    if (!res.ok) return null;
    const stages = (await res.json()) as Stage[];
    // Prefer stages that are NOT team-type (name doesn't contain 團).
    const indiv = stages.find((s) => !s.name.includes("團")) ?? stages[0];
    return indiv ? indiv.id : null;
  } catch {
    return null;
  }
}

export default async function ParticipantsIndex() {
  const id = await firstIndividualStageId();
  redirect(id != null ? `/participants/${id}` : "/admin/groups");
}
