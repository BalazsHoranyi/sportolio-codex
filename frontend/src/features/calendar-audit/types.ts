export interface AuditAxes {
  neural: number;
  metabolic: number;
  mechanical: number;
}

export interface WeeklyAuditContributor {
  sessionId: string;
  label: string;
  href?: string;
}

export interface WeeklyAuditPoint {
  date: string;
  completedAxes: AuditAxes;
  recruitmentOverlay: number;
  thresholdZoneState?: "low" | "moderate" | "high";
  contributors: WeeklyAuditContributor[];
}

export interface WeeklyAuditApiResponse {
  startDate: string;
  points: WeeklyAuditPoint[];
}
