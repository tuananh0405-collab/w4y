import { ChromaClient } from "chromadb";
import { OpenAIEmbeddingFunction } from "@chroma-core/openai";
import { CHROMA_URL, OPENAI_API_KEY } from "../config/env.js";

// Since connection to chromadb should play a *non vital* role in the system, connection to it is optional, and the app will still run even if it can't or didn't connect to chromadb. Check this var before doing any operations that involves chromadb to ensure connection.
export let isChromaConnected = false;
export let chromaClient = null;
export let embeddingFunction = null;

if (CHROMA_URL && OPENAI_API_KEY) {
  chromaClient = new ChromaClient({ path: CHROMA_URL });
  embeddingFunction = new OpenAIEmbeddingFunction({
    openai_api_key: OPENAI_API_KEY,
    modelName: "text-embedding-ada-002",
  });
} else {
  console.warn(
    "ChromaDB or OpenAI environment variables not set. Vector search features will be disabled.",
  );
}

export const connectToChromaDB = async () => {
  if (!chromaClient) {
    return;
  }
  try {
    const heartbeat = await chromaClient.heartbeat();
    if (heartbeat) {
      isChromaConnected = true;
      console.log("Connected to ChromaDB.");
    } else {
      throw new Error("ChromaDB heartbeat failed.");
    }
  } catch (error) {
    isChromaConnected = false;
    console.warn(
      `Could not connect to ChromaDB: ${error.message}. Vector search features will be disabled.`,
    );
  }
};
