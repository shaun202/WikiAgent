import { z } from "zod";

export const wikiSearchParameters = z.object({
  query: z.string().trim().min(1).max(500),
  results: z.number().int().min(1).max(5).default(3),
});

const pages = [
  { id: "northstar-overview", title: "Northstar product overview", section: "Company handbook", updated: "2026-09-08", owner: "Product", text: "Northstar is the fictional team's customer workspace. It combines account context, operational history, and guided actions in one place. The product promise is simple: help a teammate make the next safe decision without searching five systems." },
  { id: "deployments", title: "Deployments and rollback", section: "Engineering handbook", updated: "2026-09-10", owner: "Platform", text: "Every production deployment needs an owner, a change ticket, and a rollback plan. Watch error rate, latency, and saturation for fifteen minutes after release. Roll back when the change is the most likely cause of customer impact and the rollback is safer than mitigation." },
  { id: "access-requests", title: "Access requests", section: "People operations", updated: "2026-09-04", owner: "Security", text: "Request access through the service catalog and name the system, role, business reason, and expiration date. A system owner approves production access. Temporary access expires after seven days unless the owner renews it. Security reviews requests involving customer or payment data." },
  { id: "on-call", title: "On-call handoff", section: "Engineering handbook", updated: "2026-08-29", owner: "Reliability", text: "The outgoing engineer posts current alerts, customer impact, suspected cause, mitigations attempted, and the next decision point. Link dashboards and incident threads. Unconfirmed hypotheses must be labeled as such." },
  { id: "data-handling", title: "Customer data handling", section: "Security handbook", updated: "2026-08-18", owner: "Security", text: "Treat customer identifiers, billing details, and support transcripts as confidential. Use approved environments for analysis, limit access to the smallest useful group, and remove exported data when the task is complete. Never paste customer data into public tools." },
  { id: "expenses", title: "Travel and expenses", section: "Finance", updated: "2026-08-21", owner: "Finance", text: "Submit expenses within thirty days with an itemized receipt, project code, and business purpose. Meals during approved travel are reimbursable up to the regional daily limit. Personal upgrades and minibar purchases are not reimbursable." },
] as const;

const words = (value: string) => value.toLowerCase().match(/[a-z0-9]+/g) ?? [];
const aliases: Record<string, string[]> = {
  contractor: ["temporary", "access"],
  employee: ["people"],
  permission: ["access"],
  permissions: ["access"],
  deploy: ["deployment"],
  release: ["deployment"],
  revert: ["rollback"],
  credentials: ["access"],
};

export function searchWiki(query: string, limit = 3) {
  const requested = new Set(words(query).flatMap((word) => [word, ...(aliases[word] ?? [])]));
  return pages
    .map((page) => ({ page, score: words(`${page.title} ${page.section} ${page.text}`).filter((word) => requested.has(word)).length }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || left.page.title.localeCompare(right.page.title))
    .slice(0, limit)
    .map(({ page, score }) => ({ id: page.id, title: page.title, section: page.section, updated: page.updated, owner: page.owner, excerpt: page.text, relevance: score }));
}

export function wikiCatalog() {
  return pages.map(({ id, title, section, updated, owner }) => ({ id, title, section, updated, owner }));
}
