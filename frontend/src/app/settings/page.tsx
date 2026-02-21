import React from "react";

import { AuthenticatedAppShell } from "../../components/navigation/authenticated-app-shell";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  return (
    <AuthenticatedAppShell
      activeItem="settings"
      title="Settings"
      description="Account and app preferences."
    >
      <section className="settings-grid" aria-label="Settings preferences">
        <article className="settings-card">
          <h2>Timezone</h2>
          <p>America/New_York</p>
          <p className="settings-copy">
            Controls boundary calculations for daily readiness and plan windows.
          </p>
        </article>

        <article className="settings-card">
          <h2>Units</h2>
          <p>Strength: kg | Endurance: watts, km</p>
          <p className="settings-copy">
            Applied consistently across planner, routine, and analytics
            displays.
          </p>
        </article>

        <article className="settings-card">
          <h2>Notification digest</h2>
          <p>Daily summary at 06:00 local time</p>
          <p className="settings-copy">
            Includes readiness snapshot, high-risk flags, and missed-plan
            alerts.
          </p>
        </article>
      </section>
    </AuthenticatedAppShell>
  );
}
