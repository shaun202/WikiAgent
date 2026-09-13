# WikiChat / Agents Everywhere Starter Kit
A RAG for explaining a wikipage, basically like a librarian in a library.

This repository contains three CopilotKit agent surfaces:

- **Web:** a browser chat with page context and an approval flow for creating workplace follow-ups.
- **Slack:** a thread agent delivered through CopilotKit Channels, with optional Exa web search.
- **Mobile:** an Expo finance assistant that uses the web runtime and renders native tool cards.

Start with the web app first. Slack and mobile are optional integrations and have separate credentials or device setup.

## Prerequisites

- Node.js 22 or newer (`node --version`)
- npm
- An API key for either OpenAI or OpenRouter
- Docker Desktop only if you are working on an additional database-backed app

## Install

From the repository root:

```bash
npm ci
```

Create the local environment file:

```bash
# macOS/Linux/Git Bash
cp .env.example .env

# Windows PowerShell
Copy-Item .env.example .env
```

Edit `.env` and choose one model provider. OpenRouter is the default in the supplied example:

```dotenv
MODEL_PROVIDER=openrouter
OPENROUTER_API_KEY=your-openrouter-key
MODEL=openai/gpt-5.6-sol
```

Or use OpenAI:

```dotenv
MODEL_PROVIDER=openai
OPENAI_API_KEY=your-openai-key
MODEL=gpt-5.6-sol
```

Choose a model available to your account. Keep API keys in `.env`; do not commit them.

## Run the web app

Start the default app from the repository root:

```bash
npm run dev:web
```

Open [http://127.0.0.1:3100](http://127.0.0.1:3100). The shorter `npm run dev` command is an alias for the same web app.

The web template includes sample incidents, page context, generated UI, and an approval flow for workplace follow-ups. To save follow-ups to Ambiguous AI, also set `AMBIGUOUS_API_KEY` in `.env`. Without it, the app can still be developed and tested, but provider-backed writes will not work.

Try asking:

```text
What's happening here?
Create a follow-up for this incident.
```

Review the proposed fields, approve them, and refresh the page to verify the saved record can be read back.

## Verify the repository

The root checks are offline and do not require live provider credentials:

```bash
npm run verify
```

Useful focused commands:

```bash
npm run typecheck
npm test
npm run build --workspace web
npm test --workspace channel
```


## Project layout

| Path | Purpose |
| --- | --- |
| `apps/web` | Next.js web app and mobile runtime endpoint |
| `apps/channel` | CopilotKit Channels listener for Slack |
| `apps/mobile` | Expo React Native client |
| `packages/agent-core` | Shared agent, model, and prompt code |
| `dev-docs` | Setup, sponsor, demo, troubleshooting, and deployment notes |

## Troubleshooting

- **Missing model configuration:** check `MODEL_PROVIDER`, the matching API key, and `MODEL` in the root `.env`, then restart the dev server.
- **Web opens but provider actions fail:** configure `AMBIGUOUS_API_KEY` for workplace writes or the relevant optional integration key.
- **Slack does not receive messages:** verify `CHANNEL_CODE` matches the managed Channel exactly and that `INTELLIGENCE_API_KEY` is project-scoped.
- **A phone cannot reach the runtime:** do not use `localhost` from a physical device; configure a reachable, trusted runtime URL.

More detail is available in [dev-docs/README.md](dev-docs/README.md), [dev-docs/troubleshooting.md](dev-docs/troubleshooting.md), and the individual app READMEs.