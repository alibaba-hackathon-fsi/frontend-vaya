import OpenAI from "openai";

const DASHSCOPE_BASE_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";

function getEmbeddingClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.DASHSCOPE_API_KEY || "unset-configure-DASHSCOPE_API_KEY-in-.env",
    baseURL: process.env.DASHSCOPE_BASE_URL || DASHSCOPE_BASE_URL,
  });
}

const EMBEDDING_MODEL = process.env.DASHSCOPE_EMBEDDING_MODEL ?? "text-embedding-v3";

/**
 * Embed a single text string using DashScope text-embedding-v3.
 * Returns the embedding vector as a number array.
 */
export async function embedText(text: string): Promise<number[]> {
  const response = await getEmbeddingClient().embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });
  return response.data[0].embedding;
}
