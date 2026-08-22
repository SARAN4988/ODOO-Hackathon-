// ============================================================
// lib/skillIntelligence.ts
//
// Turns the raw `skills` rows into org-level intelligence: which
// skills are thin on the ground (gaps), and who could mentor whom.
// Same philosophy as lib/analytics.ts — small, named, explainable
// functions, no black box.
// ============================================================

export type SkillRow = { user_id: string; skill_name: string; category: string; proficiency: number };
export type EmployeeOption = { id: string; full_name: string; department: string | null };

export type SkillGap = {
  skill: string;
  category: string;
  coveragePct: number; // % of org that has logged this skill at all
  avgProficiency: number; // 0-5 across everyone who logged it
  peopleStrong: number; // proficiency >= 4
  severity: "Critical" | "Watch" | "Healthy";
};

export function analyzeSkillGaps(skills: SkillRow[], totalEmployees: number): SkillGap[] {
  const bySkill = new Map<string, SkillRow[]>();
  for (const s of skills) {
    const arr = bySkill.get(s.skill_name) ?? [];
    arr.push(s);
    bySkill.set(s.skill_name, arr);
  }

  const gaps: SkillGap[] = Array.from(bySkill.entries()).map(([skill, rows]) => {
    const coveragePct = totalEmployees ? Math.round((rows.length / totalEmployees) * 100) : 0;
    const avgProficiency = rows.length
      ? Math.round((rows.reduce((a, r) => a + r.proficiency, 0) / rows.length) * 10) / 10
      : 0;
    const peopleStrong = rows.filter((r) => r.proficiency >= 4).length;

    let severity: SkillGap["severity"] = "Healthy";
    if (coveragePct < 15 || peopleStrong === 0) severity = "Critical";
    else if (coveragePct < 35 || avgProficiency < 3) severity = "Watch";

    return { skill, category: rows[0]?.category || "General", coveragePct, avgProficiency, peopleStrong, severity };
  });

  const rank = { Critical: 0, Watch: 1, Healthy: 2 };
  return gaps.sort((a, b) => rank[a.severity] - rank[b.severity] || a.coveragePct - b.coveragePct);
}

export type MentorMatch = {
  skill: string;
  mentorId: string;
  mentorName: string;
  menteeId: string;
  menteeName: string;
  mentorLevel: number;
  menteeLevel: number;
};

export function findMentorMatches(
  skills: SkillRow[],
  employees: EmployeeOption[],
  limit = 12
): MentorMatch[] {
  const nameOf = new Map(employees.map((e) => [e.id, e.full_name]));
  const bySkill = new Map<string, SkillRow[]>();
  for (const s of skills) {
    const arr = bySkill.get(s.skill_name) ?? [];
    arr.push(s);
    bySkill.set(s.skill_name, arr);
  }

  const matches: MentorMatch[] = [];
  for (const [skill, rows] of bySkill) {
    const mentors = rows.filter((r) => r.proficiency >= 4).sort((a, b) => b.proficiency - a.proficiency);
    const mentees = rows.filter((r) => r.proficiency <= 2).sort((a, b) => a.proficiency - b.proficiency);
    if (!mentors.length || !mentees.length) continue;

    // Simple round-robin pairing so one mentor isn't stuck with every mentee.
    let i = 0;
    for (const mentee of mentees) {
      const mentor = mentors[i % mentors.length];
      if (mentor.user_id === mentee.user_id) continue;
      matches.push({
        skill,
        mentorId: mentor.user_id,
        mentorName: nameOf.get(mentor.user_id) ?? "Unknown",
        menteeId: mentee.user_id,
        menteeName: nameOf.get(mentee.user_id) ?? "Unknown",
        mentorLevel: mentor.proficiency,
        menteeLevel: mentee.proficiency,
      });
      i++;
    }
  }

  return matches.slice(0, limit);
}

// ---------- bipartite graph layout (employees <-> skills) ----------
// Plain trig-based circular layout — no graph library needed. Skills
// sit on an inner ring, employees on an outer ring; an edge is drawn
// for any proficiency >= 3 ("can do this well") link, capped so a
// large org still renders legibly.

export type GraphNode = { id: string; label: string; x: number; y: number; kind: "skill" | "employee" };
export type GraphEdge = { from: string; to: string; weight: number };

export function buildSkillGraph(
  skills: SkillRow[],
  employees: EmployeeOption[],
  opts: { maxSkills?: number; maxEmployees?: number; width?: number; height?: number } = {}
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const width = opts.width ?? 640;
  const height = opts.height ?? 640;
  const cx = width / 2;
  const cy = height / 2;

  // Rank skills by strong-proficiency headcount (most "in demand" first).
  const skillDemand = new Map<string, number>();
  for (const s of skills) {
    if (s.proficiency >= 3) skillDemand.set(s.skill_name, (skillDemand.get(s.skill_name) ?? 0) + 1);
  }
  const topSkills = Array.from(new Set(skills.map((s) => s.skill_name)))
    .sort((a, b) => (skillDemand.get(b) ?? 0) - (skillDemand.get(a) ?? 0))
    .slice(0, opts.maxSkills ?? 10);

  const relevantEmployeeIds = new Set(
    skills.filter((s) => topSkills.includes(s.skill_name) && s.proficiency >= 3).map((s) => s.user_id)
  );
  const topEmployees = employees.filter((e) => relevantEmployeeIds.has(e.id)).slice(0, opts.maxEmployees ?? 18);

  const skillNodes: GraphNode[] = topSkills.map((skill, i) => {
    const angle = (i / Math.max(1, topSkills.length)) * 2 * Math.PI;
    const r = Math.min(width, height) * 0.18;
    return { id: `skill:${skill}`, label: skill, kind: "skill", x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });

  const employeeNodes: GraphNode[] = topEmployees.map((emp, i) => {
    const angle = (i / Math.max(1, topEmployees.length)) * 2 * Math.PI;
    const r = Math.min(width, height) * 0.42;
    return {
      id: `emp:${emp.id}`,
      label: emp.full_name,
      kind: "employee",
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  });

  const edges: GraphEdge[] = skills
    .filter((s) => topSkills.includes(s.skill_name) && relevantEmployeeIds.has(s.user_id) && s.proficiency >= 3)
    .map((s) => ({ from: `emp:${s.user_id}`, to: `skill:${s.skill_name}`, weight: s.proficiency }));

  return { nodes: [...skillNodes, ...employeeNodes], edges };
}
