import type { Scenario } from "./scenarios";

export const CORRECT_MIN = 2;
export const WRONG_MIN = 5;
export const COMMS_MIN = 1;
export const WRONG_BLAST = 20;
export const EXPECTED_UPDATES = 2;

export interface Score {
  mttr: number; // minutes
  correctness: number; // 0-100
  communication: number; // 0-100
  mttrScore: number; // 0-100
  total: number; // 0-1000
}

export function computeScore(
  s: Pick<Scenario, "parMinutes">,
  minutes: number,
  correctPicks: number,
  wrongPicks: number,
  updates: number,
  resolved: boolean,
): Score {
  const picks = correctPicks + wrongPicks;
  const correctness = picks === 0 ? 0 : Math.round((correctPicks / picks) * 100);
  const mttrScore = resolved ? Math.max(0, Math.min(100, 100 - (minutes - s.parMinutes) * 5)) : 0;
  const communication = Math.round((Math.min(updates, EXPECTED_UPDATES) / EXPECTED_UPDATES) * 100);
  const total = Math.round((0.4 * correctness + 0.35 * mttrScore + 0.25 * communication) * 10);
  return { mttr: minutes, correctness, communication, mttrScore, total };
}

export interface LeaderEntry {
  name: string;
  scenario: string;
  total: number;
  mttr: number;
  date: string;
}

const KEY = "oncall-rpg-leaderboard";
export function loadBoard(): LeaderEntry[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}
export function saveEntry(e: LeaderEntry) {
  const b = [...loadBoard(), e].sort((a, b) => b.total - a.total).slice(0, 50);
  localStorage.setItem(KEY, JSON.stringify(b));
}

export function writePostmortem(
  s: Scenario,
  log: { t: number; text: string }[],
  score: Score,
  resolved: boolean,
): string {
  const ts = (m: number) => `02:${String(m).padStart(2, "0")}`;
  return `# Postmortem: ${s.title} (${s.severity})

**Service:** ${s.service}
**Status:** ${resolved ? "Resolved" : "Unresolved — escalated"}
**MTTR:** ${score.mttr} min (par ${s.parMinutes})

## Summary
${s.brief}

## Alerts
${s.alerts.map((a) => `- ${a}`).join("\n")}

## Root cause
${s.rootCause}

## Resolution
${resolved ? s.fix : "Responder did not reach mitigation; incident escalated."}

## Timeline (UTC)
${log.map((l) => `- ${ts(l.t)} — ${l.text}`).join("\n")}

## Scores
- Correctness: ${score.correctness}%
- MTTR score: ${score.mttrScore}%
- Communication: ${score.communication}%
- **Total: ${score.total}/1000**

## Action items
- [ ] Add alert/test covering: ${(s.rootCause.split(".")[0] ?? "").toLowerCase()}
- [ ] Update runbook for ${s.service}
- [ ] Blameless review scheduled
`;
}
