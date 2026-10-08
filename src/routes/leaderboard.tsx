import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { loadBoard, type LeaderEntry } from "@/lib/game";
import { getScenario } from "@/lib/scenarios";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — On-Call RPG" },
      { name: "description", content: "Top incident responders ranked by total score, MTTR and correctness." },
      { property: "og:title", content: "Leaderboard — On-Call RPG" },
      { property: "og:description", content: "Who resolves incidents fastest? See the top on-call responders." },
    ],
  }),
  component: Board,
});

function Board() {
  const [rows, setRows] = useState<LeaderEntry[]>([]);
  useEffect(() => setRows(loadBoard()), []);
  return (
    <Shell>
      <h1 className="text-2xl font-bold text-primary">$ cat leaderboard.txt</h1>
      <div className="panel mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr className="border-b border-border">
              <th className="p-3">#</th><th className="p-3">player</th><th className="p-3">incident</th><th className="p-3">mttr</th><th className="p-3 text-right">score</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No runs yet. Go take the pager.</td></tr>}
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-border/50">
                <td className="p-3 text-accent">{i + 1}</td>
                <td className="p-3">{r.name}</td>
                <td className="p-3 text-muted-foreground">{getScenario(r.scenario)?.title ?? r.scenario}</td>
                <td className="p-3">{r.mttr}m</td>
                <td className="p-3 text-right font-bold text-primary">{r.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
