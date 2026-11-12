// Calls this month and what came of them, per caller
export type CallerAct = { user_id: string; outcome: string | null; created_at: string };

export type CallerStats = { today: number; month: number; reached: number; interested: number; meetings: number };

// Calls this month and what came of them (reached = someone answered)
export function callerStats(acts: CallerAct[], id: string, now = new Date()): CallerStats {
  const mine = acts.filter((a) => a.user_id === id);
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  return {
    today: mine.filter((a) => new Date(a.created_at) >= dayStart).length,
    month: mine.length,
    reached: mine.filter((a) => a.outcome && !["no_answer", "wrong_number"].includes(a.outcome)).length,
    interested: mine.filter((a) => a.outcome === "interested").length,
    meetings: mine.filter((a) => a.outcome === "meeting").length,
  };
}
