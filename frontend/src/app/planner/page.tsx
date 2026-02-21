import React from "react";
import Link from "next/link";

import { AuthenticatedAppShell } from "../../components/navigation/authenticated-app-shell";
import { Button } from "../../components/ui/button";
import { BentoGrid, BentoGridItem } from "../../components/ui/bento-grid";
import { CycleCreationFlow } from "../../features/planner/components/cycle-creation-flow";

export const dynamic = "force-dynamic";

export default async function PlannerPage() {
  return (
    <AuthenticatedAppShell
      activeItem="planner"
      title="Planner"
      description="Cycle planning and block design context."
    >
      <section
        className="planner-route-shell"
        aria-label="Planner bento layout"
      >
        <BentoGrid className="planner-route-bento">
          <BentoGridItem as="section" className="planner-route-utility">
            <p className="eyebrow">Tools</p>
            <h2>Plan and routine workspace</h2>
            <p className="planner-route-copy">
              Build macro to micro structure in planner, then jump into the
              routine editor for exercise-level authoring.
            </p>
            <Button asChild variant="secondary">
              <Link href="/routine">Open routine builder</Link>
            </Button>
          </BentoGridItem>

          <BentoGridItem
            as="section"
            className="planner-route-flow bento-grid-item-plain"
          >
            <CycleCreationFlow />
          </BentoGridItem>
        </BentoGrid>
      </section>
    </AuthenticatedAppShell>
  );
}
