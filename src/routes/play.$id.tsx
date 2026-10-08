import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Shell } from "@/components/Shell";
import { getScenario, type Scenario, type Tool } from "@/lib/scenarios";
import { computeScore, saveEntry, writePostmortem, CORRECT_MIN, WRONG_MIN, COMMS_MIN, WRONG_BLAST } from "@/lib/game";

export const Route = createFileRoute("/play/$id")({
  loader: ({ params }) => {
    const s = getScenario(params.id);
    if (!s) throw notFound();
    return { title: s.title, brief: s.brief };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.title} — On-Call RPG` },
          { name: "description", content: loaderData.brief },
          { property: "og:title", content: `${loaderData.title} — On-Call RPG` },
          { property: "og:description", content: loaderData.brief },
        ]
      : [{ title: "Not found" }, { name: "robots", content: "noindex" }],
  }),
  component: Play,
});

const TOOLS: { id: Tool; label: string }[] = [
  { id: "logs", label: "LOGS" },
  { id: "metrics", label: "METRICS" },
  { id: "runbook", label: "RUNBOOK" },
  { id: "comms", label: "COMMS" },
];

function series(s: Scenario, progress: number) {
  const { base, spike } = s.metric;
  const level = spike - (spike - base) * progress;
  return Array.from({ length: 40 }, (_, i) => {
    const v = i < 10 ? base : level;
    return v + Math.sin(i * 1.7) * (spike - base) * 0.04;
  });
}

function Sparkline({ data, max }: { data: number[]; max: number }) {
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 100},${40 - (v / max) * 38}`).join(" ");
  return (
    <svg viewBox="0 0 100 40" className="h-24 w-full" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Play() {
  const { id } = Route.useParams();
  const s = getScenario(id)!;
  const [tool, setTool] = useState<Tool>("metrics");
  const [step, setStep] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [blast, setBlast] = useState(10);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [updates, setUpdates] = useState(0);
  const [used, setUsed] = useState<string[]>([]);
  const [log, setLog] = useState<{ t: number; text: string; kind: "ok" | "bad" | "info" }[]>([
    { t: 0, text: `PAGE: ${s.alerts.join(" | ")}`, kind: "bad" },
  ]);
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);

  const resolved = step >= s.solution.length;
  const failed = blast >= 100;
  const over = resolved || failed;
  const score = useMemo(() => computeScore(s, minutes, correct, wrong, updates, resolved), [s, minutes, correct, wrong, updates, resolved]);

  function act(aid: string) {
    if (over) return;
    const a = s.actions.find((x) => x.id === aid)!;
    if (a.tool === "comms") {
      const t = minutes + COMMS_MIN;
      setMinutes(t);
      setUpdates((u) => u + 1);
      setLog((l) => [...l, { t, text: a.output, kind: "info" }]);
      return;
    }
    if (s.solution[step] === aid) {
      const t = minutes + CORRECT_MIN;
      setMinutes(t);
      setCorrect((c) => c + 1);
      setStep(step + 1);
      setUsed((u) => [...u, aid]);
      setLog((l) => [...l, { t, text: `${a.label} → ${a.output}`, kind: "ok" }]);
      if (step + 1 >= s.solution.length) setLog((l) => [...l, { t, text: "✔ INCIDENT RESOLVED. Alerts cleared.", kind: "ok" }]);
    } else {
      const t = minutes + WRONG_MIN;
      setMinutes(t);
      setWrong((w) => w + 1);
      setBlast((b) => Math.min(100, b + WRONG_BLAST));
      setLog((l) => [...l, { t, text: `${a.label} → ${a.output}  [blast radius +${WRONG_BLAST}%]`, kind: "bad" }]);
    }
  }

  const pm = over ? writePostmortem(s, log, score, resolved) : "";

  return (
    <Shell>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold text-primary">{s.title}</h1>
        <span className="text-sm text-muted-foreground">{s.severity} · {s.service}</span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{s.brief}</p>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="clock" value={`02:${String(minutes).padStart(2, "0")}`} />
        <Stat label="mttr par" value={`${s.parMinutes}m`} />
        <Stat label="status updates" value={String(updates)} />
        <div className="panel p-3">
          <div className="text-xs text-muted-foreground">blast radius</div>
          <div className="mt-2 h-3 w-full bg-muted">
            <div className="h-full bg-destructive transition-all" style={{ width: `${blast}%` }} />
          </div>
          <div className="mt-1 text-xs text-destructive">{blast}% users affected</div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="panel p-4">
          <div className="flex gap-1">
            {TOOLS.map((t) => (
              <button key={t.id} onClick={() => setTool(t.id)}
                className={`flex-1 border px-2 py-2 text-xs ${tool === t.id ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary"}`}>
                {t.label}
              </button>
            ))}
          </div>
          {tool === "metrics" && (
            <div className="mt-4 text-primary">
              <div className="text-xs text-muted-foreground">{s.metric.name} ({s.metric.unit}) — prometheus mock</div>
              <Sparkline data={series(s, resolved ? 1 : 0)} max={Math.max(s.metric.spike, s.metric.base) * 1.1} />
            </div>
          )}
          <div className="mt-4 space-y-2">
            {s.actions.filter((a) => a.tool === tool).map((a) => (
              <button key={a.id} disabled={over || used.includes(a.id)} onClick={() => act(a.id)}
                className="block w-full border border-border p-3 text-left text-sm hover:border-accent hover:text-accent disabled:opacity-40">
                &gt; {a.label}
              </button>
            ))}
          </div>
        </div>

        <div className="panel flex max-h-[28rem] flex-col p-4">
          <div className="text-xs text-muted-foreground">incident.log</div>
          <div className="mt-2 flex-1 space-y-2 overflow-y-auto text-xs">
            {log.map((l, i) => (
              <div key={i} className={l.kind === "ok" ? "text-primary" : l.kind === "bad" ? "text-destructive" : "text-accent"}>
                <span className="text-muted-foreground">[02:{String(l.t).padStart(2, "0")}]</span> {l.text}
              </div>
            ))}
            {!over && <div className="text-muted-foreground">$ <span className="blink">█</span></div>}
          </div>
        </div>
      </div>

      {over && (
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <div className="panel p-5">
            <h2 className={`text-xl font-bold ${resolved ? "text-primary" : "text-destructive"}`}>
              {resolved ? "MISSION COMPLETE" : "GAME OVER — blast radius 100%"}
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <Stat label="MTTR" value={`${score.mttr}m (${score.mttrScore}%)`} />
              <Stat label="correctness" value={`${score.correctness}%`} />
              <Stat label="communication" value={`${score.communication}%`} />
              <Stat label="TOTAL" value={`${score.total}/1000`} />
            </div>
            {!saved ? (
              <form className="mt-4 flex gap-2" onSubmit={(e) => {
                e.preventDefault();
                if (!name.trim()) return;
                saveEntry({ name: name.trim().slice(0, 20), scenario: s.id, total: score.total, mttr: score.mttr, date: new Date().toISOString() });
                setSaved(true);
              }}>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="callsign"
                  className="flex-1 border border-input bg-background px-3 py-2 text-sm" />
                <button className="border border-primary bg-primary px-4 text-sm text-primary-foreground">save</button>
              </form>
            ) : (
              <Link to="/leaderboard" className="mt-4 inline-block text-sm text-accent">→ view leaderboard</Link>
            )}
            <div className="mt-3"><Link to="/" className="text-sm text-muted-foreground hover:text-primary">← next incident</Link></div>
          </div>
          <div className="panel p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">postmortem.md (auto-generated)</h2>
              <button onClick={() => navigator.clipboard.writeText(pm)} className="text-xs text-accent">[copy]</button>
            </div>
            <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">{pm}</pre>
          </div>
        </div>
      )}
    </Shell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-bold">{value}</div>
    </div>
  );
}
