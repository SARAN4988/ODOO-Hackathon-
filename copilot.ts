// ============================================================
// lib/copilot.ts
//
// The "Agentic HR Copilot" answer engine. It's rule-based, not an
// LLM call — it matches the question against a set of intents, each
// of which runs a small read-only "action" against the data already
// fetched for this request (attendance, leave, skills, feedback,
// payroll) and returns a plain-language answer. New intents are just
// new entries in INTENTS below; nothing else needs to change.
// ============================================================

import { attendanceSummary, buildRiskProfile, type AttendanceRow, type LeaveRow } from "./analytics";

export type CopilotUser = {
  id: string;
  full_name: string;
  department: string | null;
  date_joined: string | null;
};

export type CopilotData = {
  today: string; // YYYY-MM-DD
  employees: CopilotUser[];
  attendanceToday: { user_id: string; status: string; check_in: string | null; check_out: string | null }[];
  attendanceHistory: (AttendanceRow & { user_id: string })[]; // last ~90 days, all employees
  leaves: (LeaveRow & { user_id: string })[]; // last ~12 months, all employees
  skills: { user_id: string; skill_name: string; proficiency: number }[];
  feedback: { user_id: string; rating: number }[];
};

export type CopilotAnswer = { answer: string; kind: string };

function deptFilter(question: string, departments: string[]): string | null {
  const q = question.toLowerCase();
  return departments.find((d) => q.includes(d.toLowerCase())) ?? null;
}

function nameOf(data: CopilotData, id: string) {
  return data.employees.find((e) => e.id === id)?.full_name ?? "Unknown";
}

// ---------- individual intent handlers ----------

function whoIsOnLeaveToday(data: CopilotData): CopilotAnswer {
  const onLeave = data.leaves.filter(
    (l) => l.status === "approved" && l.start_date <= data.today && l.end_date >= data.today
  );
  if (!onLeave.length) return { answer: "Nobody is on approved leave today.", kind: "leave_today" };
  const names = onLeave.map((l) => nameOf(data, l.user_id));
  return { answer: `On leave today (${names.length}): ${names.join(", ")}.`, kind: "leave_today" };
}

function whoIsAbsentToday(data: CopilotData): CopilotAnswer {
  const absent = data.attendanceToday.filter((a) => a.status === "absent");
  if (!absent.length) return { answer: "Nobody is marked absent today.", kind: "absent_today" };
  const names = absent.map((a) => nameOf(data, a.user_id));
  return { answer: `Absent today (${names.length}): ${names.join(", ")}.`, kind: "absent_today" };
}

function whoIsWorkingNow(data: CopilotData): CopilotAnswer {
  const working = data.attendanceToday.filter((a) => a.check_in && !a.check_out);
  if (!working.length) return { answer: "Nobody is currently checked in.", kind: "working_now" };
  const names = working.map((a) => nameOf(data, a.user_id));
  return { answer: `Checked in right now (${names.length}): ${names.join(", ")}.`, kind: "working_now" };
}

function pendingLeaveRequests(data: CopilotData): CopilotAnswer {
  const pending = data.leaves.filter((l) => l.status === "pending");
  if (!pending.length) return { answer: "No pending leave requests. 🎉", kind: "pending_leave" };
  const lines = pending.map(
    (l) => `${nameOf(data, l.user_id)} (${l.leave_type ?? "leave"}, ${l.start_date} → ${l.end_date})`
  );
  return {
    answer: `${pending.length} pending leave request${pending.length === 1 ? "" : "s"}:\n- ${lines.join("\n- ")}`,
    kind: "pending_leave",
  };
}

function attendanceRate(data: CopilotData, question: string): CopilotAnswer {
  const departments = Array.from(new Set(data.employees.map((e) => e.department || "Unassigned")));
  const dept = deptFilter(question, departments);
  const ids = new Set(
    dept ? data.employees.filter((e) => (e.department || "Unassigned") === dept).map((e) => e.id) : data.employees.map((e) => e.id)
  );
  const rows = data.attendanceHistory.filter((a) => ids.has(a.user_id));
  const { presentRate, total } = attendanceSummary(rows);
  if (!total) {
    return { answer: dept ? `No attendance history for ${dept} yet.` : "No attendance history yet.", kind: "attendance_rate" };
  }
  return {
    answer: `${dept ? `${dept} attendance` : "Org-wide attendance"} rate over the last ~90 days: ${presentRate}%.`,
    kind: "attendance_rate",
  };
}

function headcount(data: CopilotData, question: string): CopilotAnswer {
  const departments = Array.from(new Set(data.employees.map((e) => e.department || "Unassigned")));
  const dept = deptFilter(question, departments);
  if (dept) {
    const count = data.employees.filter((e) => (e.department || "Unassigned") === dept).length;
    return { answer: `${dept} has ${count} employee${count === 1 ? "" : "s"}.`, kind: "headcount" };
  }
  const byDept = new Map<string, number>();
  for (const e of data.employees) {
    const d = e.department || "Unassigned";
    byDept.set(d, (byDept.get(d) ?? 0) + 1);
  }
  const lines = Array.from(byDept.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([d, c]) => `${d}: ${c}`);
  return { answer: `${data.employees.length} employees total.\n- ${lines.join("\n- ")}`, kind: "headcount" };
}

function topRisk(data: CopilotData): CopilotAnswer {
  const feedbackByUser = new Map<string, number[]>();
  for (const f of data.feedback) {
    const arr = feedbackByUser.get(f.user_id) ?? [];
    arr.push(f.rating);
    feedbackByUser.set(f.user_id, arr);
  }
  const scored = data.employees.map((e) => {
    const ratings = feedbackByUser.get(e.id) ?? [];
    const avgFeedbackRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
    const { overall } = buildRiskProfile({
      attendance: data.attendanceHistory.filter((a) => a.user_id === e.id),
      leaves: data.leaves.filter((l) => l.user_id === e.id),
      avgFeedbackRating,
      dateJoined: e.date_joined,
    });
    return { name: e.full_name, department: e.department || "Unassigned", overall };
  });
  const top = scored.sort((a, b) => b.overall - a.overall).slice(0, 5);
  if (!top.length) return { answer: "No employees to score yet.", kind: "top_risk" };
  const lines = top.map((t) => `${t.name} (${t.department}) — risk ${t.overall}/100`);
  return { answer: `Highest overall risk right now:\n- ${lines.join("\n- ")}`, kind: "top_risk" };
}

function skillCoverage(data: CopilotData, question: string): CopilotAnswer {
  const uniqueSkills = Array.from(new Set(data.skills.map((s) => s.skill_name)));
  const q = question.toLowerCase();
  const matched = uniqueSkills.find((s) => q.includes(s.toLowerCase()));
  if (!matched) {
    return {
      answer: uniqueSkills.length
        ? `I couldn't tell which skill you meant. Logged skills include: ${uniqueSkills.slice(0, 12).join(", ")}${
            uniqueSkills.length > 12 ? ", …" : ""
          }.`
        : "No skills have been logged yet.",
      kind: "skill_coverage",
    };
  }
  const rows = data.skills.filter((s) => s.skill_name === matched);
  const strong = rows.filter((r) => r.proficiency >= 4);
  const names = rows.map((r) => `${nameOf(data, r.user_id)} (${r.proficiency}/5)`);
  return {
    answer: `${matched}: ${rows.length} people know it, ${strong.length} are strong (4+/5).\n- ${names.join("\n- ")}`,
    kind: "skill_coverage",
  };
}

function help(): CopilotAnswer {
  return {
    answer:
      "I can answer questions about today's data — try things like:\n" +
      "- Who's on leave today?\n" +
      "- Who's absent today?\n" +
      "- Who's checked in right now?\n" +
      "- Any pending leave requests?\n" +
      "- What's the attendance rate for Engineering?\n" +
      "- Who's highest risk right now?\n" +
      "- How many employees do we have?\n" +
      "- Who knows React?",
    kind: "help",
  };
}

// ---------- intent router ----------
// Ordered by specificity: more specific phrasing is checked first so
// e.g. "pending leave" doesn't get swallowed by the generic "leave" match.

type Intent = { test: (q: string) => boolean; run: (data: CopilotData, question: string) => CopilotAnswer };

const INTENTS: Intent[] = [
  { test: (q) => /pending.*(leave|request)|leave.*pending/.test(q), run: (d) => pendingLeaveRequests(d) },
  { test: (q) => /(who'?s|who is).*(on leave|leave today)|leave today/.test(q), run: (d) => whoIsOnLeaveToday(d) },
  { test: (q) => /(who'?s|who is).*absent|absent today/.test(q), run: (d) => whoIsAbsentToday(d) },
  { test: (q) => /(who'?s|who is).*(working|checked in|clocked in)|working (now|right now)/.test(q), run: (d) => whoIsWorkingNow(d) },
  { test: (q) => /(top |highest |most )?(at )?risk/.test(q), run: (d) => topRisk(d) },
  { test: (q) => /attendance rate|attendance %|present(ce)? rate/.test(q), run: (d, q) => attendanceRate(d, q) },
  { test: (q) => /headcount|how many (employees|people|staff)/.test(q), run: (d, q) => headcount(d, q) },
  { test: (q) => /skill|know(s)?\s|coverage/.test(q), run: (d, q) => skillCoverage(d, q) },
  { test: () => true, run: () => help() },
];

export function answerQuery(question: string, data: CopilotData): CopilotAnswer {
  const q = question.trim().toLowerCase();
  if (!q || /^(hi|hello|hey|help)\b/.test(q)) return help();
  const intent = INTENTS.find((i) => i.test(q));
  return (intent ?? INTENTS[INTENTS.length - 1]).run(data, q);
}
