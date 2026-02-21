import React from "react";

import { AuthenticatedAppShell } from "../../components/navigation/authenticated-app-shell";
import { TodayDashboard } from "../../features/today/today-dashboard";
import { loadTodayPageData } from "../../features/today/page-data";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const { snapshot, contributors, source } = await loadTodayPageData();

  return (
    <AuthenticatedAppShell
      activeItem="today"
      title="Today"
      description="Daily readiness and execution context."
    >
      <TodayDashboard
        snapshot={snapshot}
        contributors={contributors}
        dataSource={source}
      />
    </AuthenticatedAppShell>
  );
}
