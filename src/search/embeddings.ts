import OpenAI from 'openai'

let client: OpenAI | null = null

function getClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('OPENAI_API_KEY not configured')
    client = new OpenAI({ apiKey })
  }
  return client
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const openai = getClient()
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    dimensions: 768,
  })
  const embedding = response.data[0]?.embedding
  if (!embedding) throw new Error('OpenAI did not return an embedding')
  return embedding
}
