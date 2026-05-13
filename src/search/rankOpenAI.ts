import OpenAI from 'openai'
import type { ContractorWithRatings } from './ratings.js'

export interface RankingResult {
  contractor_id: string
  rank: number
  confidence: number
  reasoning: string
}

export interface RankingResponse {
  summary: string
  results: RankingResult[]
}

function buildContext(candidates: ContractorWithRatings[]): string {
  return candidates.map((c) => {
    const reviews = c.reviews ?? []
    const notes = reviews
      .filter((r) => r.notes?.trim())
      .slice(0, 3)
      .map((r) => r.notes)
      .join(' | ')

    return [
      `ID: ${c.id}`,
      `Name: ${c.name}`,
      `Trade: ${c.trade}`,
      `Location: ${c.location_city}, ${c.location_state}`,
      `Daily Rate: $${c.daily_rate}/day`,
      `Rating: ${c.avg_overall != null ? `${c.avg_overall}/5 (${c.review_count} reviews)` : 'No reviews'}`,
      `Skills: ${(c.skills ?? []).join(', ') || 'None'}`,
      `Certifications: ${(c.certifications ?? []).join(', ') || 'None'}`,
      `Languages: ${(c.languages ?? []).join(', ') || 'None'}`,
      `Willing to Travel: ${c.willing_to_travel ? 'Yes' : 'No'}`,
      `Has 1099: ${c.has_1099 ? 'Yes' : 'No'}`,
      `Review Notes: ${notes || 'None'}`,
    ].join('\n')
  }).join('\n---\n')
}

function buildPrompt(query: string, candidates: ContractorWithRatings[], instructions: string | null): string {
  const instructionBlock = instructions
    ? `\nCompany search instructions (apply these to every search):\n${instructions}\n`
    : ''

  return `You are a contractor search assistant.
${instructionBlock}
Return ONLY valid JSON in this exact format:
{
  "summary": "2-3 sentences explaining what you prioritized, why these contractors stood out, and any trade-offs.",
  "results": [{"contractor_id": "uuid", "rank": 1, "confidence": 92, "reasoning": "one sentence"}]
}

confidence: 80-100 = strong match, 50-79 = partial match, 0-49 = eliminated.
Include ALL contractors. Rank 1 is best. Eliminated contractors must explain why they don't fit.

Query: ${query}

Contractors:
${buildContext(candidates)}`
}

export async function rankWithOpenAI(
  query: string,
  candidates: ContractorWithRatings[],
  instructions: string | null,
): Promise<RankingResponse> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured')

  const openai = new OpenAI({ apiKey })
  const prompt = buildPrompt(query, candidates, instructions)

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'You are a JSON API. Respond with valid JSON only.' },
      { role: 'user', content: prompt },
    ],
  })

  const text = response.choices[0]?.message?.content ?? ''
  let parsed: RankingResponse
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('OpenAI returned malformed JSON')
  }

  if (!parsed?.results) throw new Error('OpenAI response missing results field')
  return parsed
}
