import OpenAI from 'openai'

const EMBEDDING_MODEL = 'text-embedding-3-small'

function getClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY ist nicht konfiguriert.')
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

export async function embedText(text: string): Promise<number[]> {
  const [embedding] = await embedBatch([text])
  return embedding
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const client = getClient()
  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  })
  return response.data.map((item) => item.embedding)
}
