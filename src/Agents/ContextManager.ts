import { OpenAI } from "langchain/llms/openai";
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";
import { TextLoader } from "langchain/document_loaders/fs/text";
import PineconeDB from "../Database";
import { Document } from "langchain/document";

export class ContextManager {
  private workspaceFolder: vscode.WorkspaceFolder;
  private packageJsonCount: number;
  private pinecone: PineconeDB;

  constructor(workspaceFolder: vscode.WorkspaceFolder) {
    console.log("ContextManager initialized", workspaceFolder);
    this.workspaceFolder = workspaceFolder;
    this.packageJsonCount = 0;
    this.pinecone = new PineconeDB();
  }

  public async scanWorkspace() {
    const docs = await this.scanDirectory(this.workspaceFolder.uri.fsPath);
    // update pinecone
    await this.pinecone.initDB();
    await this.pinecone.createIndex();
    await this.pinecone.upsertVectors(docs);
    await this.pinecone.getTestStack();
    console.log("DEBUG 2 -> ", docs);

    if (this.packageJsonCount === 0) {
      console.log("Project dependencies file not found");
    }
  }

  private async scanDirectory(directory: string): Promise<Document[]> {
    const readdir = promisify(fs.readdir);
    const stat = promisify(fs.stat);
    let docs: Document[] = [];
    try {
      const files = await readdir(directory);
      for (const file of files) {
        const fullPath = path.join(directory, file);
        if (fullPath.includes("node_modules")) continue;
        const stats = await stat(fullPath);
        if (stats.isDirectory()) {
          await this.scanDirectory(fullPath);
        } else if (path.basename(fullPath) === "package.json") {
          console.log("Package.json file found in project ->", fullPath);
          this.packageJsonCount++;
          const loader = new TextLoader(fullPath);
          docs = await loader.load();
          console.log("DEBUG 1 -> ", docs);
        }
      }
    } catch (err) {
      console.error(err);
    }
    return docs;
  }
}
