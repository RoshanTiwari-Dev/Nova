import { tool } from "ai";
import { z } from "zod";
import { tavily } from "@tavily/core";
import { env } from "@/lib/env";

export const webSearchTool = tool({
  description:
    "Search the web for up-to-date programming documentation, API changes, library versions, algorithms, and real-time developer resources.",
  parameters: z.object({
    query: z.string().describe("The specific technical search query"),
  }),
  execute: async ({ query }) => {
    if (!env.TAVILY_API_KEY) {
      return {
        query,
        results: [
          {
            title: "Tavily Search API Unconfigured",
            url: "https://docs.tavily.com",
            content:
              "Web search is in demo mode because TAVILY_API_KEY is not set. In production, provide a Tavily API key in environment variables to retrieve live search results.",
          },
        ],
      };
    }

    try {
      const tvly = tavily({ apiKey: env.TAVILY_API_KEY });
      const response = await tvly.search(query, {
        searchDepth: "basic",
        maxResults: 4,
      });

      return {
        query,
        results: response.results.map((r: any) => ({
          title: r.title,
          url: r.url,
          content: r.content,
        })),
      };
    } catch (err: any) {
      console.error("Tavily search execution failed:", err);
      return {
        query,
        error: `Search query failed: ${err?.message || "Unknown error"}`,
        results: [],
      };
    }
  },
});
