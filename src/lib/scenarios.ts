export type Tool = "logs" | "metrics" | "runbook" | "comms";

export interface Action {
  id: string;
  tool: Tool;
  label: string;
  output: string;
}

export interface Scenario {
  id: string;
  title: string;
  severity: "SEV1" | "SEV2" | "SEV3";
  service: string;
  alerts: string[];
  brief: string;
  metric: { name: string; unit: string; base: number; spike: number };
  parMinutes: number;
  actions: Action[];
  /** ids of the correct technical actions, in order */
  solution: string[];
  rootCause: string;
  fix: string;
}

const comms = (svc: string): Action[] => [
  {
    id: "comms",
    tool: "comms",
    label: "Post status update to #incident",
    output: `[#incident] 📣 Investigating degraded ${svc}. Next update in 15m.`,
  },
];

export const SCENARIOS: Scenario[] = [
  {
    id: "cpu-runaway",
    title: "The 2 AM CPU Spike",
    severity: "SEV2",
    service: "checkout-api",
    alerts: ["CPU high: checkout-api p95 > 95%", "Latency p99 > 2s"],
    brief: "PagerDuty wakes you. checkout-api pods are pegged and customers report slow checkout.",
    metric: { name: "container_cpu_usage", unit: "%", base: 35, spike: 98 },
    parMinutes: 12,
    actions: [
      { id: "m-cpu", tool: "metrics", label: "Query CPU by pod", output: "rate(container_cpu_usage[5m]) → all 6 pods ~97%. Started 01:52, right after deploy v2.14.0." },
      { id: "l-deploy", tool: "logs", label: "Tail deploy logs", output: "01:51:44 argo: synced checkout-api v2.14.0 (feat: regex price validator)" },
      { id: "l-app", tool: "logs", label: "Grep app error logs", output: "No errors. Requests just... slow. Thread dumps show regex backtracking in PriceValidator." },
      { id: "r-rollback", tool: "runbook", label: "Runbook: rollback deployment", output: "kubectl rollout undo deploy/checkout-api → v2.13.2. CPU dropping to 34%. ✅" },
      { id: "r-scale", tool: "runbook", label: "Runbook: scale out pods x3", output: "Scaled to 18 pods. CPU still 97% on all. Burned $$$ and the DB connection pool is now saturated. ❌" },
      { id: "m-mem", tool: "metrics", label: "Query memory usage", output: "Memory flat at 41%. Not the problem." },
      ...comms("checkout"),
    ],
    solution: ["m-cpu", "l-deploy", "r-rollback"],
    rootCause: "Deploy v2.14.0 introduced a catastrophic-backtracking regex in the price validator.",
    fix: "Rolled back to v2.13.2; added regex fuzz test to CI.",
  },
  {
    id: "db-slow",
    title: "DB Slow, Everything Slow",
    severity: "SEV1",
    service: "orders-postgres",
    alerts: ["DB slow: query p95 > 3s", "Connection pool exhausted: orders-svc"],
    brief: "Every service touching orders is timing out. The primary Postgres looks unhappy.",
    metric: { name: "pg_stat_activity_count", unit: "conns", base: 40, spike: 500 },
    parMinutes: 15,
    actions: [
      { id: "m-conn", tool: "metrics", label: "Query pg active connections", output: "pg_stat_activity: 497/500 connections, mostly 'active' on one query." },
      { id: "l-slow", tool: "logs", label: "Read slow query log", output: "duration: 8812ms SELECT * FROM orders WHERE customer_email = $1 — Seq Scan on orders (48M rows)" },
      { id: "l-migr", tool: "logs", label: "Check recent migrations", output: "00:30 migration 0142_drop_unused_indexes: DROP INDEX idx_orders_customer_email" },
      { id: "r-index", tool: "runbook", label: "Runbook: CREATE INDEX CONCURRENTLY", output: "Index rebuilt in 6m. Seq scans gone. p95 → 22ms. ✅" },
      { id: "r-restart", tool: "runbook", label: "Runbook: restart Postgres primary", output: "Failover triggered. 90s of total write outage, then same slow query returns. ❌" },
      { id: "m-disk", tool: "metrics", label: "Query disk IOPS", output: "IOPS high (read-heavy). Symptom, not cause." },
      ...comms("orders"),
    ],
    solution: ["m-conn", "l-slow", "l-migr", "r-index"],
    rootCause: "Migration 0142 dropped an index still used by the customer-email lookup, causing full table scans.",
    fix: "Recreated index concurrently; migration linter now checks pg_stat_user_indexes usage.",
  },
  {
    id: "dns-cert",
    title: "The Certificate Cliff",
    severity: "SEV1",
    service: "edge-gateway",
    alerts: ["HTTP 5xx rate > 40%", "Synthetic check failed: TLS handshake"],
    brief: "Mobile app is fully down. Web shows browser security warnings.",
    metric: { name: "http_requests_5xx_ratio", unit: "%", base: 0.2, spike: 62 },
    parMinutes: 10,
    actions: [
      { id: "m-5xx", tool: "metrics", label: "Query 5xx by route", output: "All routes equally failing from 02:00:00 UTC sharp. Suspiciously round." },
      { id: "l-edge", tool: "logs", label: "Tail gateway logs", output: "x509: certificate has expired or is not yet valid: current time 02:00:13 is after 02:00:00" },
      { id: "r-cert", tool: "runbook", label: "Runbook: force cert-manager renew", output: "cmctl renew api-tls → new cert issued, gateways reloaded. 5xx → 0.1%. ✅" },
      { id: "r-rollback", tool: "runbook", label: "Runbook: rollback last deploy", output: "Rolled back gateway. Same cert, same error. ❌" },
      { id: "l-app", tool: "logs", label: "Grep backend service logs", output: "Backends idle — traffic never reaches them." },
      ...comms("API & mobile app"),
    ],
    solution: ["m-5xx", "l-edge", "r-cert"],
    rootCause: "cert-manager renewal silently failed for 30 days due to a revoked DNS01 API token.",
    fix: "Renewed certificate; added cert expiry < 14d alert.",
  },
  {
    id: "memleak",
    title: "OOMKilled Loop",
    severity: "SEV3",
    service: "notifications-worker",
    alerts: ["Pod restarts > 10/h: notifications-worker", "Queue depth growing"],
    brief: "Push notifications are hours behind. Workers keep dying.",
    metric: { name: "container_memory_working_set", unit: "MiB", base: 300, spike: 1024 },
    parMinutes: 14,
    actions: [
      { id: "m-mem", tool: "metrics", label: "Query memory per pod", output: "Sawtooth: climbs linearly to 1024Mi limit, OOMKilled, repeat every ~6m." },
      { id: "l-app", tool: "logs", label: "Grep worker logs", output: "WARN template cache size=812341 entries (one per user locale+id combo)" },
      { id: "r-limit", tool: "runbook", label: "Runbook: raise memory limit to 4Gi", output: "Buys 20 minutes. Then OOM again, now evicting neighbours on the node. ❌" },
      { id: "r-flag", tool: "runbook", label: "Runbook: disable feature flag per-user-templates", output: "Flag off. Memory flat at 310Mi. Queue draining. ✅" },
      { id: "m-cpu", tool: "metrics", label: "Query CPU", output: "CPU normal-ish, spikes on GC." },
      ...comms("notifications"),
    ],
    solution: ["m-mem", "l-app", "r-flag"],
    rootCause: "New per-user template feature cached templates in an unbounded map.",
    fix: "Disabled flag; replaced map with LRU(10k).",
  },
  {
    id: "region",
    title: "Half the Planet Is Gone",
    severity: "SEV1",
    service: "global-lb",
    alerts: ["Region us-east-1 health checks failing", "Error budget burn 30x"],
    brief: "Cloud provider status page says 'all good'. Your dashboards disagree.",
    metric: { name: "probe_success", unit: "%", base: 100, spike: 48 },
    parMinutes: 18,
    actions: [
      { id: "m-region", tool: "metrics", label: "Query probe success by region", output: "us-east-1: 0%. eu-west-1: 100%. ap-south-1: 100%." },
      { id: "l-cloud", tool: "logs", label: "Check cloud provider events", output: "us-east-1 AZ-a,b: elevated EC2 API errors (posted 20m late)" },
      { id: "r-failover", tool: "runbook", label: "Runbook: shift traffic away from us-east-1", output: "Route53 weights → 0 for us-east-1. eu-west-1 autoscaled. Error rate 0.3%. ✅" },
      { id: "r-redeploy", tool: "runbook", label: "Runbook: redeploy services in us-east-1", output: "EC2 API failing — deploy hangs, partial pods, worse. ❌" },
      { id: "r-scale-eu", tool: "runbook", label: "Runbook: pre-scale eu-west-1 x2", output: "eu-west-1 capacity doubled. Ready to absorb traffic. ✅" },
      { id: "l-app", tool: "logs", label: "Grep application logs", output: "Timeouts connecting to anything in us-east-1. Expected." },
      ...comms("all customers in the Americas"),
    ],
    solution: ["m-region", "l-cloud", "r-scale-eu", "r-failover"],
    rootCause: "Provider zonal outage in us-east-1; traffic was not automatically drained.",
    fix: "Manual failover to eu-west-1; automated health-based weighting planned.",
  },
];

export const getScenario = (id: string) => SCENARIOS.find((s) => s.id === id);
