// ============================================================
// lib/digitalTwin.ts
//
// Builds a live, per-department "model" of the workforce (headcount,
// baseline attendance rate, payroll cost, average risk) from the same
// tables the rest of the app already reads — then lets the UI perturb
// that model (attendance shocks, leave surges, attrition, hiring) and
// see the projected effect instantly, client-side.
//
// This is intentionally a transparent arithmetic model, not a trained
// simulation — every number traces back to a named function here, so
// it stays explainable in a demo. Swap in a real simulation later
// without touching the page component, since it only imports the
// functions below.
// ============================================================

import { attendanceSummary, type AttendanceRow } from "./analytics";

export type DeptSnapshot = {
  department: string;
  headcount: number;
  presentRate: number; // 0-100, trailing 30 days
  avgMonthlyCost: number; // avg base_salary + allowances across the dept
  avgRisk: number; // 0-100, average overall risk score
};

export function buildDepartmentSnapshots(input: {
  employees: { id: string; department: string | null }[];
  attendanceByUser: Map<string, AttendanceRow[]>;
  monthlyCostByUser: Map<string, number>;
  riskByUser: Map<string, number>;
}): DeptSnapshot[] {
  const byDept = new Map<string, string[]>();
  for (const e of input.employees) {
    const dept = e.department || "Unassigned";
    const arr = byDept.get(dept) ?? [];
    arr.push(e.id);
    byDept.set(dept, arr);
  }

  return Array.from(byDept.entries()).map(([department, ids]) => {
    const rates = ids.map((id) => attendanceSummary(input.attendanceByUser.get(id) ?? []).presentRate);
    const costs = ids.map((id) => input.monthlyCostByUser.get(id) ?? 0);
    const risks = ids.map((id) => input.riskByUser.get(id) ?? 0);
    return {
      department,
      headcount: ids.length,
      presentRate: rates.length ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length) : 100,
      avgMonthlyCost: costs.length ? Math.round(costs.reduce((a, b) => a + b, 0) / costs.length) : 0,
      avgRisk: risks.length ? Math.round(risks.reduce((a, b) => a + b, 0) / risks.length) : 0,
    };
  });
}

export type ScenarioParams = {
  attendanceShockPct: number; // -30..+10, applied to presentRate
  leaveSurgePct: number; // 0..60, extra % of headcount effectively out at any time
  attritionCount: number; // employees lost from the selected department
  newHires: number; // employees added to the selected department, at dept avg cost
  targetDepartment: string | null; // department attrition/hires apply to; null = org-wide split
};

export type ScenarioResult = DeptSnapshot & {
  projectedHeadcount: number;
  projectedPresentRate: number;
  projectedMonthlyCost: number;
  projectedRisk: number;
  coverageVerdict: "Healthy" | "Tight" | "At risk";
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export function simulateScenario(snapshots: DeptSnapshot[], params: ScenarioParams): ScenarioResult[] {
  return snapshots.map((s) => {
    const isTarget = params.targetDepartment == null || params.targetDepartment === s.department;

    const headcountDelta = isTarget ? params.newHires - params.attritionCount : 0;
    const projectedHeadcount = Math.max(0, s.headcount + headcountDelta);

    // Attrition + leave surge both reduce effective coverage; attendance
    // shock can go either way (e.g. a wellness push).
    const leaveDrag = (params.leaveSurgePct / 100) * 100;
    const attritionDrag = s.headcount ? (Math.max(0, -headcountDelta) / s.headcount) * 100 : 0;
    const projectedPresentRate = Math.round(
      clamp(s.presentRate + params.attendanceShockPct - leaveDrag - attritionDrag, 0, 100)
    );

    const projectedMonthlyCost = Math.round(projectedHeadcount * s.avgMonthlyCost);

    // Risk rises as coverage falls and as newcomers (higher tenure risk)
    // dilute the department.
    const coverageGap = Math.max(0, s.presentRate - projectedPresentRate);
    const newHireDilution = projectedHeadcount ? (params.newHires / projectedHeadcount) * 20 : 0;
    const projectedRisk = Math.round(clamp(s.avgRisk + coverageGap * 0.8 + newHireDilution, 0, 100));

    let coverageVerdict: ScenarioResult["coverageVerdict"] = "Healthy";
    if (projectedPresentRate < 70 || projectedHeadcount === 0) coverageVerdict = "At risk";
    else if (projectedPresentRate < 85) coverageVerdict = "Tight";

    return {
      ...s,
      projectedHeadcount,
      projectedPresentRate,
      projectedMonthlyCost,
      projectedRisk,
      coverageVerdict,
    };
  });
}
