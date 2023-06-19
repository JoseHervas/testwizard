import { PineconeClient } from "@pinecone-database/pinecone";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { OpenAI } from "langchain/llms/openai";
import { loadQAStuffChain } from "langchain/chains";
import { Document } from "langchain/document";
import * as keytar from "keytar";
export default class PineconeDB {
    private pinecone: PineconeClient;
    private index: any;
    // TODO -> Find a way to handle environment, maybe using docker?
    private openAIApiKey = "your-openai-api-key-here";
    private pineconeAPIKey = "your-pinecone-api-key-here";

    constructor() {
        this.pinecone = new PineconeClient();
        // this.initDB();
    }

    public async initDB() {
        // const pineconeKey = await PineconeDB.getPineconeKey();
        console.log('Initializing Pinecone DB...');
        await this.pinecone.init({
            environment: "us-west1-gcp-free",
            apiKey: this.pineconeAPIKey,
        });
    }

    public getIndex() {
        return this.pinecone.Index("test-wizard");
    }

    /* private static async getOpenAIKey() {
        return await keytar.getPassword('testwizard', 'openAIKey');
    }

    private static async getPineconeKey() {
        return await keytar.getPassword('testwizard', 'pineconeKey');
    } */

    public async createIndex(
        name: string = "test-wizard",
        dimension: number = 1536
    ) {
        // 1536 is the default vector dimension for the OpenAI embedding
        console.log("Creating index...");
        const existingIndexes = await this.pinecone.listIndexes();
        console.log("Existing indexes ->", existingIndexes);
        // TODO -> DEBUG INDEX CREATION ERROR IF NOT EXISTS
        // This weird error happens when you have 1 index already created in pinecone - free starter plan only allows 1 index!!! 
        /**
         * rejected promise not handled within 1 second: TypeError: stream.getReader is not a function
extensionHostProcess.js:105
stack trace: TypeError: stream.getReader is not a function
    at /Users/diegotellezbarrero/Desktop/testwizard/node_modules/@pinecone-database/pinecone/src/index.ts:20:25
    at step (/Users/diegotellezbarrero/Desktop/testwizard/node_modules/@pinecone-database/pinecone/dist/index.js:48:23)
    at Object.next (/Users/diegotellezbarrero/Desktop/testwizard/node_modules/@pinecone-database/pinecone/dist/index.js:29:53)
    at /Users/diegotellezbarrero/Desktop/testwizard/node_modules/@pinecone-database/pinecone/dist/index.js:23:71
    at new Promise (<anonymous>)
    at __awaiter (/Users/diegotellezbarrero/Desktop/testwizard/node_modules/@pinecone-database/pinecone/dist/index.js:19:12)
    at streamToArrayBuffer (/Users/diegotellezbarrero/Desktop/testwizard/node_modules/@pinecone-database/pinecone/dist/index.js:70:12)
    at /Users/diegotellezbarrero/Desktop/testwizard/node_modules/@pinecone-database/pinecone/src/index.ts:42:36
    at step (/Users/diegotellezbarrero/Desktop/testwizard/node_modules/@pinecone-database/pinecone/dist/index.js:48:23)
    at Object.throw (/Users/diegotellezbarrero/Desktop/testwizard/node_modules/@pinecone-database/pinecone/dist/index.js:29:53)
    at rejected (/Users/diegotellezbarrero/Desktop/testwizard/node_modules/@pinecone-database/pinecone/dist/index.js:21:65)
    at processTicksAndRejections (node:internal/process/task_queues:96:5)
         */
        if (!existingIndexes.includes("test-wizard")) {
            await this.pinecone.createIndex({
                createRequest: {
                    name,
                    dimension,
                    metric: "cosine", // not sure this is needed
                },
            });
            console.log("Index created ->", name);
            // 7. Wait 60 seconds for index initialization
            await new Promise((resolve) => setTimeout(resolve, 60000));
            this.index = this.getIndex();
            return;
        }
        this.index = this.getIndex();
    }

    public async upsertVectors(docs: any) {
        // 1. Process each document in the docs array
        
        if(!this.openAIApiKey) return;
        for (const doc of docs) {
            console.log('DEBUGGGGGG ---- > ', doc);
            console.log(`Processing document: ${doc.metadata.source}`);
            const txtPath = doc.metadata.source;
            const text = doc.pageContent;
            // 2. Create RecursiveCharacterTextSplitter instance
            const textSplitter = new RecursiveCharacterTextSplitter({
                chunkSize: 1000,
            });
            console.log("Splitting text into chunks...");
            // 3. Split text into chunks (documents)
            const chunks = await textSplitter.createDocuments([text]);
            console.log(`Text split into ${chunks.length} chunks`);
            console.log(
                `Calling OpenAI's Embedding endpoint documents with ${chunks.length} text chunks ...`
            );
            // 4. Create OpenAI embeddings for documents
            const embeddingsArrays =
                await new OpenAIEmbeddings({ openAIApiKey: this.openAIApiKey }).embedDocuments(
                    chunks.map((chunk) => chunk.pageContent.replace(/\n/g, " "))
                );

            console.log("Finished embedding documents");
            console.log(
                `Creating ${chunks.length} vectors array with id, values, and metadata...`
            );
            // 5. Create and upsert vectors in batches of 100
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
                    console.log("DEBUGING MISSING INDEX! ---> ", this.index);
                    try {
                        await this.index.upsert({
                            upsertRequest: {
                                vectors: batch,
                            },
                        });
                    } catch (err) {
                        console.log("ERROR QUERYING PINECONE ---> ", err);
                    }
                    
                    // Empty the batch
                    batch = [];
                }
            }
            // 6. Log the number of vectors updated
            console.log(`Pinecone index updated with ${chunks.length} vectors`);
        }
    }

    public async getTestStack() {
        // 3. Start query process
        console.log("Querying Pinecone vector store...");
        // 5. Create query embedding
        const question = "Tell me all the dependencies related to tests that this project has";
        const queryEmbedding = await new OpenAIEmbeddings({ openAIApiKey: this.openAIApiKey }).embedQuery(
            question
        );
        // 6. Query Pinecone index and return top 10 matches
        let queryResponse = await this.index.query({
            queryRequest: {
                topK: 10,
                vector: queryEmbedding,
                includeMetadata: true,
                includeValues: true,
            },
        });
        // 7. Log the number of matches
        console.log(`Found ${queryResponse.matches.length} matches...`);
        // 8. Log the question being asked
        console.log(`Asking question: ${question}...`);
        if (queryResponse.matches.length) {
            // 9. Create an OpenAI instance and load the QAStuffChain
            const llm = new OpenAI({ openAIApiKey: this.openAIApiKey });
            const chain = loadQAStuffChain(llm);
            // 10. Extract and concatenate page content from matched documents
            const concatenatedPageContent = queryResponse.matches
                .map((match: any) => match.metadata.pageContent)
                .join(" ");
            // 11. Execute the chain with input documents and question
            const result = await chain.call({
                input_documents: [ // eslint-disable-line
                    new Document({ pageContent: concatenatedPageContent }),
                ],
                question: question,
            });
            // 12. Log the answer
            console.log(`Answer: ${result.text}`);
        } else {
            // 13. Log that there are no matches, so GPT will not be queried
            console.log("Since there are no matches, GPT will not be queried.");
        }
    }
}
