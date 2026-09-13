# WikiAgent in Slack

**OpenAI + CopilotKit Channels + Exa**

WikiAgent is a librarian inside a Slack thread. It reads the conversation, retrieves relevant pages from the fictional Northstar team's wiki, answers with page IDs, and renders inspectable source cards. When the wiki is not enough, it can use Exa for public research.

[![Slack thread agent demo](../../assets/demos/slack.gif)](../../assets/demos/slack.mp4)

_Scroll through a completed Slack thread: incident context, Exa source cards, and the final answer. The preview is sped up; click it for the full MP4._

## Get started

Use Node.js 22+, then clone and install the kit:

```bash
git clone https://github.com/CopilotKit/agents-everywhere-starter-kit.git
cd agents-everywhere-starter-kit
npm ci
cp .env.example .env
```

Run the commands below from the repository root. Configure root `.env` with [OpenRouter](../../using-sponsor-tools.md#openrouter) or [OpenAI](../../using-sponsor-tools.md#openai), [CopilotKit Intelligence](../../using-sponsor-tools.md#copilotkit), and optionally [Exa](../../using-sponsor-tools.md#exa):

```dotenv
MODEL_PROVIDER=openrouter
OPENROUTER_API_KEY=your-key
MODEL=openai/gpt-5.6-sol
CHANNEL_CODE=your-channel-code
INTELLIGENCE_API_KEY=your-project-key
EXA_API_KEY=your-key
EXA_SEARCH_TYPE=fast
```

Choose an OpenAI model available to your account. Start the official onboarding handoff:

```bash
npm run channel:setup -- --no-clipboard
```

This installs the maintained `channels-setup` skill and prints a prompt. Give that prompt to your coding agent in this checkout and specify **Slack**, using the existing `apps/channel` app. Have the agent follow the skill through sign-in, project/Channel configuration, Slack installation, and a real reply. The command alone does not create the Channel. Keep existing `.env` values; the listener reads `CHANNEL_CODE` and `INTELLIGENCE_API_KEY`. The [setup guide](../../dev-docs/setup.md) and [screenshot walkthrough](../../dev-docs/channels-sdk-walkthrough/README.md) provide manual reference.

```bash
npm run dev:slack
```

Invite the bot to a Slack channel and mention it in a populated thread. CopilotKit Intelligence manages the Slack connection; this listener needs no public tunnel or Slack app token on the managed path.

## Try the flow

1. Add two or three facts to a Slack thread before mentioning WikiAgent, such as: “We are onboarding a contractor to Northstar production.”
2. Ask: “How long can this contractor keep production permission?” Verify `search_wiki` retrieves `[access-requests]` and posts a native **Wiki sources** card.
3. Ask: “What articles are available?” Verify `browse_wiki` returns the Northstar catalog.
4. Ask a follow-up that depends on an earlier thread fact. Verify `read_thread` changes the answer.
5. Ask about a topic absent from the local wiki. WikiAgent should say no page matched instead of guessing.
6. Ask for public background when useful. `search_web` posts native **Search sources** cards with inspectable Exa links.

Use [demo prompts](../../dev-docs/demo-prompts.md#slack-context-sources-card-follow-up) for exact incident inputs. If you add an external write, enforce approval in code before that write. The included proposal card records a decision without executing a production action.

## Customize these files

| Piece | File |
|---|---|
| Agent and model | [Channel agent](src/agent.ts) and [shared model factory](../../packages/agent-core/src/agent.ts) |
| Channel lifecycle | [src/channel.tsx](src/channel.tsx): mention, subscribe, respond to subscribed messages |
| Channel-only run adapter | [src/agent.ts](src/agent.ts): keeps outer transcript/state while using fresh inner agent runs |
| Thread context and retrieval | [src/tools.tsx](src/tools.tsx) and [src/wiki.ts](src/wiki.ts): `read_thread`, `search_wiki`, and `browse_wiki` |
| Native cards | [src/components.tsx](src/components.tsx): `wiki_card` and `source_list` via Channels JSX |
| Prompt | [Shared prompt](../../packages/agent-core/src/prompt.ts) |

OpenRouter can be used as the model gateway through the shared provider settings in [using-sponsor-tools.md](../../using-sponsor-tools.md#openrouter). Teams or another messaging platform can reuse the Channels pattern, but this starter app is wired for managed Slack.

## Give this to your coding agent

```text
Read the root hackathon overview, rules, sponsor guide, and AGENTS.md.
Read .agents/skills/build-channels-agent/SKILL.md before changing Slack code.
If Slack is not connected, run npm run channel:setup -- --no-clipboard
from the repository root and follow its prompt using the channels-setup
skill. Select Slack and connect the existing apps/channel app.
Adapt apps/channel to a wiki librarian workflow. Preserve read_thread, use
search_wiki for local retrieval, use Exa when public research helps, and render
answers and sources with Channels JSX. Demonstrate that earlier messages
change the answer and that source IDs and links are inspectable.
Run npm run verify and document the live Slack checks separately.
```

## Verify and limits

Run `npm run verify` for root/channel typechecks and offline tests. Live Slack delivery, Intelligence connection, Exa search, and model responses require your own accounts. For the live check, run `npm run dev:slack`, mention WikiAgent in a populated Slack thread, verify the wiki source card, then verify an Exa source card separately.

Keep the pinned Channels/runtime pair and the `@ag-ui/client` override. The [Channels skill](../../.agents/skills/build-channels-agent/SKILL.md) supplies the verified API vocabulary. [Channels guide](https://copilotkit.ai/channels-guide.md) · [OpenTag reference app](https://github.com/CopilotKit/OpenTag)
