// Pinecone
import { PineconeClient } from "@pinecone-database/pinecone";

// LangChain
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { Document } from "langchain/document";

// Local imports
import { SecretsManager } from "../utils";

/**
 * Main client to talk to Pinecone
 *
 * It's a singleton to optimize the number of calls
 * to pinecone.init()
 */
export default class PineconeDB {
  private static instance: PineconeDB;
  private pinecone: PineconeClient;
  private index: any;

  constructor() {
    this.pinecone = new PineconeClient();
    this.initDB();
  }

  public async initDB() {
    const { pineconeAPIKey } = await SecretsManager.getInstance().getSecrets();
    await this.pinecone.init({
      environment: "us-west1-gcp-free",
      apiKey: pineconeAPIKey,
    });
    await this.createIndex();
  }

  /**
   * Make this class a singleton, so we don't
   * have to init the PineconeClient each time
   * the ContextManager refreshes the project's context
   */
  public static getInstance(): PineconeDB {
    if (!PineconeDB.instance) {
      PineconeDB.instance = new PineconeDB();
    }
    return PineconeDB.instance;
  }

  public async createIndex(
    name = "test-wizard",
    dimension = 1536 // default vector dimension for the OpenAI embedding
  ) {
    const existingIndexes = await this.pinecone.listIndexes();
    if (!existingIndexes.includes("test-wizard")) {
      await this.pinecone.createIndex({
        createRequest: {
          name,
          dimension,
        },
      });
    }
  }

  public getIndex() {
    return this.pinecone.Index("test-wizard");
  }

  /**
   * Receives an array of LangChain documents,
   * creates embeddings for them using `OpenAIEmbeddings`
   * and upserts them to Pinecone.
   *
   * Returns the number of errors encountered during the
   * operation. If this number is not 0, you may want to
   * alert the extension user.
   */
  public async createAndUpsertVectors(docs: Document[]) {
    const { openAIApiKey } = await SecretsManager.getInstance().getSecrets();
    let errorCount = 0;
    for (const doc of docs) {
      const txtPath = doc.metadata.source;
      const text = doc.pageContent;
      // Split the doc in chunks
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
      });
      const chunks = await textSplitter.createDocuments([text]);
      // Create OpenAI embeddings for chunks
      const embeddingsArrays = await new OpenAIEmbeddings({
        openAIApiKey,
      }).embedDocuments(
        chunks.map((chunk) => chunk.pageContent.replace(/\n/g, " "))
      );
      // Group the embeddings in batches of 100
      const batchSize = 100; // optimal number of batches to upload
      let batch = [];
      for (let idx = 0; idx < chunks.length; idx++) {
        const chunk = chunks[idx];
        const vector = {
          id: `${txtPath}_${idx}`,
          values: embeddingsArrays[idx], // numerical representation of each chunk of text
          metadata: {
            ...chunk.metadata,
            loc: JSON.stringify(chunk.metadata.loc),
            pageContent: chunk.pageContent,
            txtPath: txtPath,
          },
        };
        batch.push(vector);
        // When batch is full or it's the last item, upsert the vectors
        if (batch.length === batchSize || idx === chunks.length - 1) {
          try {
            await this.index.upsert({
              upsertRequest: {
                vectors: batch,
              },
            });
          } catch (err) {
            console.error(
              `BATCH_UPLOAD_ERROR:: Batch number: ${idx} - Details: ${err}`
            );
            errorCount++;
          }

          // Empty the batch to start a new iteration
          batch = [];
        }
      }
    }
    return errorCount;
  }
}
