// ============================================================
// lib/analytics.ts
//
// Small, dependency-free heuristics that turn raw attendance /
// leave / feedback rows into the scores the Analytics, Risk Radar,
// Predictive Absenteeism and Workforce Planning pages render.
//
// None of this is a trained model — it's transparent, rule-based
// scoring so the numbers stay explainable in a demo. Swap these
// out for a real model later without touching the page components,
// since every page only imports the named functions below.
// ============================================================

export type AttendanceRow = {
  date: string; // YYYY-MM-DD
  status: "present" | "absent" | "half_day" | "leave" | string;
};

export type LeaveRow = {
  start_date: string;
  end_date: string;
  status: "pending" | "approved" | "rejected" | string;
  leave_type?: string;
  created_at?: string;
};

export function daysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
}

export function tenureMonths(dateJoined: string | null | undefined): number {
  if (!dateJoined) return 0;
  const joined = new Date(dateJoined + "T00:00:00");
  const now = new Date();
  return Math.max(0, (now.getFullYear() - joined.getFullYear()) * 12 + (now.getMonth() - joined.getMonth()));
}

// ---------- attendance summaries ----------

export function attendanceSummary(records: AttendanceRow[]) {
  const total = records.length;
  const present = records.filter((r) => r.status === "present").length;
  const absent = records.filter((r) => r.status === "absent").length;
  const halfDay = records.filter((r) => r.status === "half_day").length;
  const leave = records.filter((r) => r.status === "leave").length;
  const presentRate = total ? Math.round(((present + halfDay * 0.5) / total) * 100) : 100;
  return { total, present, absent, halfDay, leave, presentRate };
}

// ---------- predictive absenteeism (heuristic) ----------
// Blends a long baseline (last 90 days) with a short recent window
// (last 14 days) so a recent uptick in absences moves the needle
// faster than a single old blip would.
export function predictAbsenteeism(records: AttendanceRow[]) {
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  const now = sorted.length ? new Date(sorted[sorted.length - 1].date + "T00:00:00") : new Date();
  const cutoff = (days: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
  };
  const baseline90 = sorted.filter((r) => r.date >= cutoff(90));
  const recent14 = sorted.filter((r) => r.date >= cutoff(14));

  const missRate = (rows: AttendanceRow[]) => {
    if (!rows.length) return 0;
    const misses = rows.filter((r) => r.status === "absent" || r.status === "half_day").length;
    return misses / rows.length;
  };

  const baseRate = missRate(baseline90);
  const recentRate = missRate(recent14);
  // Weighted blend: recent behavior counts for 60%, long baseline for 40%.
  const blended = recentRate * 0.6 + baseRate * 0.4;
  const riskPercent = Math.round(Math.min(blended * 140, 96)); // scale + cap for readability

  let label: "Low" | "Moderate" | "Elevated" = "Low";
  if (riskPercent >= 55) label = "Elevated";
  else if (riskPercent >= 28) label = "Moderate";

  const trendingUp = recentRate > baseRate + 0.05;
  return { riskPercent, label, trendingUp, baseRate: Math.round(baseRate * 100), recentRate: Math.round(recentRate * 100) };
}

// ---------- leave-overuse score ----------

export function leaveOveruseScore(leaves: LeaveRow[], windowMonths = 6) {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - windowMonths);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const approved = leaves.filter((l) => l.status === "approved" && l.start_date >= cutoffStr);
  const totalDays = approved.reduce((sum, l) => sum + daysBetween(l.start_date, l.end_date), 0);
  // 12+ approved leave days in the window is treated as the top of the scale.
  const score = Math.round(Math.min((totalDays / 12) * 100, 100));
  return { totalDays, score, requestCount: approved.length };
}

// ---------- feedback-sentiment risk ----------
// Lower average rating -> higher risk. A person with no feedback on
// file contributes a neutral (mid-scale) risk rather than 0 or 100,
// so silence doesn't read as either great or terrible.
export function feedbackSentimentRisk(avgRating: number | null) {
  if (avgRating == null) return 50;
  return Math.round(Math.max(0, Math.min(100, (5 - avgRating) * 25)));
}

// ---------- tenure risk ----------
// New hires (<3 months) and long-plateaued tenure (>60 months with
// no structural change tracked here) both nudge risk up slightly;
// the sweet spot in the middle scores lowest.
export function tenureRisk(months: number) {
  if (months < 3) return 65;
  if (months < 12) return 30;
  if (months < 60) return 15;
  return 40;
}

export type RiskDimensions = {
  attendanceRisk: number;
  leaveOveruse: number;
  feedbackRisk: number;
  tenureRisk: number;
};

export function overallRisk(dims: RiskDimensions) {
  return Math.round((dims.attendanceRisk + dims.leaveOveruse + dims.feedbackRisk + dims.tenureRisk) / 4);
}

export function buildRiskProfile(input: {
  attendance: AttendanceRow[];
  leaves: LeaveRow[];
  avgFeedbackRating: number | null;
  dateJoined: string | null;
}): { dimensions: RiskDimensions; overall: number; absenteeism: ReturnType<typeof predictAbsenteeism> } {
  const absenteeism = predictAbsenteeism(input.attendance);
  const leave = leaveOveruseScore(input.leaves);
  const dimensions: RiskDimensions = {
    attendanceRisk: absenteeism.riskPercent,
    leaveOveruse: leave.score,
    feedbackRisk: feedbackSentimentRisk(input.avgFeedbackRating),
    tenureRisk: tenureRisk(tenureMonths(input.dateJoined)),
  };
  return { dimensions, overall: overallRisk(dimensions), absenteeism };
}

export function average(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7); // YYYY-MM
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}
