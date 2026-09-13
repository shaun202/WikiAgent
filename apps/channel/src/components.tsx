import React from "react";
import {
  defineChannelComponent,
  Message,
  Header,
  Section,
  Markdown,
  Fields,
  Field,
  Context,
  Actions,
  Button,
} from "@copilotkit/channels";
import { z } from "zod";

export const WikiCard = defineChannelComponent({
  name: "wiki_card",
  description:
    "Draw a concise answer from retrieved wiki evidence, including the article IDs that support it.",
  parameters: z.object({
    answer: z.string().describe("The direct answer, in three sentences or fewer."),
    citations: z.array(z.string()).max(5).describe("Exact wiki page IDs supporting the answer."),
    caveat: z.string().optional().describe("What remains unknown or needs confirmation."),
  }),
  render({ answer, citations, caveat }) {
    return (
      <Message accent="#126782">
        <Header>WikiAgent answer</Header>
        <Section><Markdown>{answer}</Markdown></Section>
        <Fields>
          <Field label="Sources">{citations.join(", ") || "None returned"}</Field>
          {caveat && <Field label="Caveat">{caveat}</Field>}
        </Fields>
      </Message>
    );
  },
});

export const SourceList = defineChannelComponent({
  name: "source_list",
  description: "Show the retrieved wiki pages and excerpts that grounded the answer.",
  parameters: z.object({
    sources: z.array(z.object({
      id: z.string(),
      title: z.string(),
      section: z.string(),
      excerpt: z.string(),
    })).max(5),
  }),
  render({ sources }) {
    return (
      <Message>
        <Header>Wiki sources</Header>
        {sources.map((source) => (
          <Section key={source.id}>
            <Markdown>{`**[${source.id}] ${source.title}**\n${source.section}\n\n${source.excerpt}`}</Markdown>
          </Section>
        ))}
        <Context>{`${sources.length} retrieved page(s)`}</Context>
      </Message>
    );
  },
});

export function welcomeMessage(platform: string) {
  return (
    <Message accent="#126782">
      <Header>WikiAgent, your thread librarian</Header>
      <Section>
        <Markdown>{`Ask me about the team wiki in this ${platform} thread. I retrieve the relevant pages, answer from their text, and show the sources so you can inspect them.`}</Markdown>
      </Section>
      <Actions>
        <Button value="search" style="primary" onClick={async ({ thread }) => {
          await thread.runAgent({ prompt: "Read this thread, search the wiki for the question, and answer with source IDs." });
        }}>Search the wiki</Button>
      </Actions>
    </Message>
  );
}
