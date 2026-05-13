import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { runSearchPipeline } from '../search/pipeline.js'

const FiltersSchema = z.object({
  trade: z.string().optional().describe('Contractor trade, e.g. Electrician, Plumber, HVAC Technician'),
  location_state: z.string().optional().describe('2-letter US state code, e.g. MO, TX'),
  location_city: z.string().optional().describe('City name'),
  min_daily_rate: z.number().optional().describe('Minimum daily rate in USD'),
  max_daily_rate: z.number().optional().describe('Maximum daily rate in USD'),
  available_on: z.string().optional().describe('ISO date string, e.g. 2025-08-01'),
  min_rating_overall: z.number().min(1).max(5).optional().describe('Minimum average overall rating (1-5)'),
  active: z.boolean().optional().describe('Filter to active contractors only (default: true)'),
  willing_to_travel: z.boolean().optional().describe('Only include contractors willing to travel'),
  has_1099: z.boolean().optional().describe('Only include contractors with 1099 on file'),
  skills: z.array(z.string()).optional().describe('Required skills (any match)'),
  industries: z.array(z.string()).optional().describe('Industries (any match)'),
  languages: z.array(z.string()).optional().describe('Languages spoken (any match)'),
  certifications: z.array(z.string()).optional().describe('Required certifications (any match)'),
})

export function registerSearchContractorsTool(server: McpServer): void {
  server.tool(
    'search_contractors',
    'Search for independent contractors using natural language. Returns ranked matches with confidence scores, reasoning, ratings, and relevant review excerpts.',
    {
      provider: z
        .enum(['openai', 'claude'])
        .default('openai')
        .describe('AI provider for ranking: openai (GPT-4o) or claude (Claude Sonnet)'),
      query: z.string().min(1).describe('Natural language search query'),
      filters: FiltersSchema.optional().describe('Optional structured filters to pre-screen candidates'),
    },
    async ({ provider, query, filters }) => {
      try {
        const result = await runSearchPipeline({ provider, query, filters })
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        }
      } catch (err) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: (err as Error).message }) }],
          isError: true,
        }
      }
    },
  )
}
