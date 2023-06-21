// LangChain
import { VectorStoreRetrieverMemory } from "langchain/memory";
import { PineconeStore } from "langchain/vectorstores/pinecone";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";

// Relative imports
import PineconeDB from "../database";
import { SecretsManager } from "../utils";

/**
 * All our agents will share this memory.
 * This way, they all share the same context
 * when building/evaluating/reparing the tests.
 *
 * Steps to initialize:
 * ```
 * memory = new VectorMemory();
 * await memory.init();
 * store = memory.getStore();
 * ```
 *
 * How to use:
 * ```
 * store.saveContext({input: "any relevant info"}, {output: "ok"})
 * ```
 *
 * Then, pass this store as the `memory` param
 * to any LLM Chain.
 */
export class VectorMemory {
  private store?: VectorStoreRetrieverMemory;

  async init() {
    const pinecone = await PineconeDB.getInstance();
    const { openAIApiKey } = await SecretsManager.getInstance().getSecrets();
    const vectorStore = await PineconeStore.fromExistingIndex(
      new OpenAIEmbeddings({ openAIApiKey }),
      { pineconeIndex: pinecone.getIndex() }
    );
    this.store = new VectorStoreRetrieverMemory({
      vectorStoreRetriever: vectorStore.asRetriever(5),
      memoryKey: "history",
    });
  }

  getStore() {
    return this.store;
  }
}
