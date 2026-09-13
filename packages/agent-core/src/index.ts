/**
 * Server surface. Client code should import from agent-core/shared instead.
 */
export { makeAgent } from "./agent";
export { MOBILE_FINANCE_PROMPT } from "./mobile-finance-prompt";
export { resolveModel } from "./model";
export { fetchWikipediaPage, type WikipediaPage } from "./capabilities/wikipedia";
export { WIKI_AGENT_PROMPT } from "./wiki-prompt";
export { searchWeb, searchWikipedia, isSearchConfigured } from "./capabilities/search";
export { workplaceMcpServers, isWorkplaceConfigured, WORKPLACE_CONTEXT } from "./capabilities/workplace";
export * from "./shared";