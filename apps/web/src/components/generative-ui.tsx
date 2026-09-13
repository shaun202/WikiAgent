"use client";

/**
 * Generative UI, controlled tier.
 *
 * `useComponent` gives the agent a catalog of *your* React components and lets
 * it choose one and fill in the props. The interface stays on-brand and
 * pixel-perfect because you wrote it — the agent only decides what to show.
 *
 * These are deliberately the same two components the Slack surface registers
 * with `defineChannelComponent`. Same agent, same intent, native rendering on
 * each surface — which is the whole claim this kit is making.
 *
 * Renderers receive streamed partial arguments before schema defaults apply.
 */
import { useComponent, useHumanInTheLoop } from "@copilotkit/react-core/v2";
import { z } from "zod";

import { SourceList } from "./streamed-cards";

export function GenerativeUI() {
  useComponent({
    name: "source_list",
    description:
      "Show the wiki pages and excerpts that grounded the answer. Call this after search_wiki and include exact page IDs.",
    parameters: z.object({
      sources: z.array(z.object({ id: z.string(), title: z.string(), section: z.string(), excerpt: z.string() })).max(5),
    }),
    render: SourceList,
  });

  /**
   * The approval gate, web idiom.
   *
   * Same contract as `confirm_action` in the Slack surface: the agent must ask
   * before anything irreversible, and cannot proceed past a refusal.
   *
   * `respond` is a function ONLY while the tool call is executing — narrowing on
   * its presence is safer than importing the ToolCallStatus enum from
   * @copilotkit/core, which is only a transitive dependency here.
   */
  useHumanInTheLoop({
    name: "propose_action",
    description:
      "Ask for approval before anything that touches production. Call this FIRST and only continue if it returns approval.",
    parameters: z.object({
      action: z.string().describe("What you are about to do, in one plain sentence."),
      blastRadius: z.string().describe("What this affects if it goes wrong."),
    }),
    render: ({ args, respond, result }) => {
      if (!respond) {
        return (
          <article className="ck-card ck-card--gate">
            <p className="ck-gate-done">{result ? String(result) : "Waiting…"}</p>
          </article>
        );
      }
      return (
        <article className="ck-card ck-card--gate">
          <h3>{args.action ?? "Confirm this action"}</h3>
          <p>{args.blastRadius}</p>
          <div className="ck-actions">
            <button
              type="button"
              className="ck-btn ck-btn--primary"
              onClick={() =>
                respond("Approved by the user. Proceed, then report exactly what you did.")
              }
            >
              Approve
            </button>
            <button
              type="button"
              className="ck-btn"
              onClick={() =>
                respond(
                  "The user declined. Do not take the action, do not offer a workaround, and say plainly that nothing was changed.",
                )
              }
            >
              Cancel
            </button>
          </div>
        </article>
      );
    },
  });

  // Hooks register into the chat stream, so this component renders nothing.
  return null;
}
