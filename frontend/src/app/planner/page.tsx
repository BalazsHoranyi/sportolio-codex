import React from "react";

import { AuthenticatedAppShell } from "../../components/navigation/authenticated-app-shell";
import { CycleCreationFlow } from "../../features/planner/components/cycle-creation-flow";

export const dynamic = "force-dynamic";

export default async function PlannerPage() {
  return (
    <AuthenticatedAppShell
      activeItem="planner"
      title="Planner"
      description="Cycle planning and block design context."
    >
      <section className="planner-page-utility" aria-label="Planner tools">
        <a className="button button-secondary" href="/routine">
          Open routine builder
        </a>
      </section>
      <CycleCreationFlow />
    </AuthenticatedAppShell>
  );
}
