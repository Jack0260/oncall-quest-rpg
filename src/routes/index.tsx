import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { SCENARIOS } from "@/lib/scenarios";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "On-Call RPG — SRE incident response simulator" },
      { name: "description", content: "It's 2 AM. Alerts are firing. Pick the right tools in the right order before the blast radius grows." },
      { property: "og:title", content: "On-Call RPG — SRE incident response simulator" },
      { property: "og:description", content: "Train incident response with 5 real-world failure scenarios. Scored on MTTR, correctness and communication." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <Shell>
      <pre className="text-xs leading-tight text-primary sm:text-sm">{`  ___  _ __        ___      _ _   ___ ___  ___
 / _ \\| '_ \\ ___  / __|__ _| | | | _ \\ _ \\/ __|
| (_) | | | |___|| (__/ _\` | | | |   /  _/ (_ |
 \\___/|_| |_|     \\___\\__,_|_|_| |_|_\\_|  \\___|`}</pre>
      <p className="mt-6 max-w-2xl text-muted-foreground">
        <span className="text-accent">02:00 UTC.</span> Your phone buzzes. You have three tools —{" "}
        <span className="text-foreground">logs, metrics, runbook</span> — and a team waiting for updates.
        Pick wrong and the blast radius grows. Choose your incident.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {SCENARIOS.map((s, i) => (
          <Link key={s.id} to="/play/$id" params={{ id: s.id }} className="panel group p-5 transition hover:border-primary">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">LVL {i + 1} · {s.service}</span>
              <span className={s.severity === "SEV1" ? "text-destructive" : "text-accent"}>{s.severity}</span>
            </div>
            <h2 className="mt-2 text-lg font-bold group-hover:text-primary">{s.title}</h2>
            <ul className="mt-3 space-y-1 text-xs text-destructive">
              {s.alerts.map((a) => <li key={a}>▲ FIRING {a}</li>)}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">par {s.parMinutes} min → <span className="text-primary">press start</span></p>
          </Link>
        ))}
      </div>
    </Shell>
  );
}
