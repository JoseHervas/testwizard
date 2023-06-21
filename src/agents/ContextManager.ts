// NodeJS utils
import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";

// LangChain
import { Document } from "langchain/document";
import { TextLoader } from "langchain/document_loaders/fs/text";

// VS Code
import * as vscode from "vscode";

// Relative imports
import { errorMessages } from "../utils";
import { VectorMemory } from "../memory";

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
  private memory?: VectorMemory;
  private workspaceFolder: vscode.WorkspaceFolder;

  constructor(workspaceFolder: vscode.WorkspaceFolder) {
    this.workspaceFolder = workspaceFolder;
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
   * Uploads to Pinecone the proyect's context,
   * so TestGenerator can take it into account
   */
  public async identifyProjectContext() {
    const depsFile = await this.scanDirectory(this.workspaceFolder.uri.fsPath);
    if (depsFile.length === 0) {
      return vscode.window.showErrorMessage(errorMessages.MISSING_DEPS_FILE);
    }
    this.memory = new VectorMemory();
    await this.memory.init();
    await this.memory.getStore()?.saveContext(
      {
        input: `This is the configuration file of my project: ${depsFile[0].pageContent}`,
      },
      { output: "okay" }
    );
  }
}
