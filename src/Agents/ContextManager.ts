// NodeJS utils
import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";

// LangChain
import { OpenAI } from "langchain/llms/openai";
import { loadQAStuffChain } from "langchain/chains";
import { Document } from "langchain/document";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";

// VS Code
import * as vscode from "vscode";

// Relative imports
import PineconeDB from "../database";
import { SecretsManager, errorMessages } from "../utils";

/**
 * Usually projects contain a file in which
 * they list the dependencies and their versions.
 *
 * We will look for these files, pass them to
 * the LLM and create a vector embedding with
 * the project's context
 */
const validDependencyMapFiles = [
  // NodeJS projects
  "package.json",
  // Python projects
  "requirements.txt",
  "Pipfile",
  "setup.py",
  "pyproject.toml",
  // Ruby projects
  "Gemfile",
];

/**
 * Similarly, every project usually contains a
 * super heavy folder that it's better to ignore
 * when scanning
 */
const foldersToSkipScanning = [
  // NodeJS projects
  "node_modules",
  // Python projects
  "venv",
  // Ruby projects
  "vendor",
  "gems",
];

/**
 * Component that identifies the tech stack of the opened project.
 *
 * This Manager reads the `dependencyMapFile` file (ie: `package.json` for NodeJS apps
 * or `requirements.txt` for Python, etc...) and creates a vector embedding of the
 * project's context
 *
 * This project context will be relevant for the TestGenerator in order to produce
 * relevant tests optimized for the project's configuration
 */
export class ContextManager {
  private workspaceFolder: vscode.WorkspaceFolder;
  private pinecone: PineconeDB;

  constructor(workspaceFolder: vscode.WorkspaceFolder) {
    this.workspaceFolder = workspaceFolder;
    this.pinecone = PineconeDB.getInstance();
  }

  /**
   * Looks for the dependencyMapFile using Depth-first search.
   *
   * Like a mice in a labyrinth...
   *
   *   __QQ
   *  (_)_">
   * _)
   */
  private async scanDirectory(directory: string): Promise<Document[]> {
    const readdir = promisify(fs.readdir);
    const stat = promisify(fs.stat);
    let docs: Document[] = [];
    try {
      const elements = await readdir(directory);
      for (const fileOrFolder of elements) {
        const fullPath = path.join(directory, fileOrFolder);
        if (foldersToSkipScanning.includes(fileOrFolder)) continue;
        const stats = await stat(fullPath);
        if (stats.isDirectory()) {
          docs = await this.scanDirectory(fullPath);
          if (docs.length > 0) {
            return docs; // stop as soon as we find it
          }
        } else if (validDependencyMapFiles.includes(path.basename(fullPath))) {
          const loader = new TextLoader(fullPath);
          docs = await loader.load();
          return docs;
        }
      }
    } catch (err) {
      console.error(`DEPS_FILE_SEARCH_ERROR:: ${err}`);
      return [];
    }
    return [];
  }

  /**
   * Gets the project context and uploads it to Pinecone
   * to be used later on the TestGenerator
   */
  public async identifyAndUploadProjectContext() {
    const depsFile = await this.scanDirectory(this.workspaceFolder.uri.fsPath);
    if (depsFile.length === 0) {
      return vscode.window.showErrorMessage(errorMessages.MISSING_DEPS_FILE);
    }
    const errors = await this.pinecone.createAndUpsertVectors(depsFile);
    if (errors) {
      vscode.window.showErrorMessage(
        errorMessages.PROJECT_CONTEXT_UPLOAD_ERROR
      );
    }
  }

  /**
   * Retrieves the project's context from Pinecone.
   *
   * Useful to generate meaningful tests that take
   * the project's context into account
   */
  public async getTestStack() {
    // Prepare the query
    const { openAIApiKey } = await SecretsManager.getInstance().getSecrets();
    const question =
      "Tell me all the dependencies related to tests that this project has";
    const queryEmbedding = await new OpenAIEmbeddings({
      openAIApiKey,
    }).embedQuery(question);
    // Send query to Pinetone
    const queryResponse = await this.pinecone.getIndex().query({
      queryRequest: {
        topK: 10,
        vector: queryEmbedding,
        includeMetadata: true,
        includeValues: true,
      },
    });
    if (queryResponse?.matches?.length) {
      // Extract and concatenate page content from matched documents
      const concatenatedPageContent = queryResponse.matches
        .map(
          (match) => (match?.metadata as { pageContent: string })?.pageContent
        )
        .join(" ");
      // Use langchain's magic 🪄
      const llm = new OpenAI({ openAIApiKey });
      const chain = loadQAStuffChain(llm);
      const result = await chain.call({
        input_documents: [
          new Document({ pageContent: concatenatedPageContent }),
        ],
        question: question,
      });
      return result.text;
    } else {
      vscode.window.showErrorMessage(
        errorMessages.PROJECT_CONTEXT_RETRIEVAL_ERROR
      );
    }
  }
}
