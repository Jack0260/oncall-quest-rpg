# On-Call Quest

Build "On-Call RPG" - Next.js + Prometheus mock + Go backend.

KEY FEATURE: It's a game. You are on-call at 2 AM. Alerts start firing: "CPU high", "DB slow". You have 3 tools: Logs, Metrics, Runbook. You must choose correct sequence to fix. If you choose wrong, blast radius increases. It scores you: MTTR, Correctness, Communication. Uses real incident data from your RecoveryOS.

Senior Requirements: 5 playable incident scenarios, leaderboard, postmortem auto-writer, Terraform for whole stack.

UI: Game-like, dark/light, terminal aesthetic.

Resume Line: Built an SRE training simulator as an RPG that teaches incident response using real failure scenarios.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://oncall-quest-rpg.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b223e42d-9c97-4804-ad32-ca5ff9331841).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
