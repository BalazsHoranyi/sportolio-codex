import React from "react";

import { AuthenticatedAppShell } from "../../components/navigation/authenticated-app-shell";
import { RoutineCreationFlow } from "../../features/routine/components/routine-creation-flow";

export const dynamic = "force-dynamic";

export default async function RoutinePage() {
  return (
    <AuthenticatedAppShell
      activeItem="planner"
      title="Routine Builder"
      description="Build and refine strength or endurance routines."
      accentLabel="Planner"
    >
      <RoutineCreationFlow />
    </AuthenticatedAppShell>
  );
}
