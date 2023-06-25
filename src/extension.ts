// VS Code utils
import * as vscode from "vscode";

// Local imports
import { ContextManager } from "./agents/ContextManager";
import {
  SecretsManager,
  acceptedLanguages,
  errorMessages,
  getPathComponents,
} from "./utils";
import { TestGenerator } from "./agents/TestGenerator";
import PineconeDB from "./database";
import { TestDepurator } from "./agents/Depurator";
/**
 * Pinecone index creation can take up to
 * 1 minute. We need to run this process
 * as soon as the extension gets installed
 * so we don't waste time when creating unit tests
 */
async function loadPinecone() {
  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Initializing TestWizard 🧙...",
      cancellable: false,
    },
    () => {
      // eslint-disable-next-line no-async-promise-executor
      return new Promise<void>(async (resolve, reject) => {
        try {
          await PineconeDB.getInstance();
          resolve();
        } catch (e) {
          console.error(e);
          vscode.window.showErrorMessage(errorMessages.PINECONE_INIT_ERROR);
          reject();
        }
      });
    }
  );
}

export async function activate(context: vscode.ExtensionContext) {
  try {
    await SecretsManager.getInstance().getSecrets();
  } catch (err) {
    if (
      err instanceof Error &&
      (err.message === "Missing pineconeAPIKey" ||
        err.message === "Missing openAIApiKey")
    ) {
      const openAIApiKey = await vscode.window.showInputBox({
        prompt: "Please enter your OpenAI API Key",
        password: true,
        ignoreFocusOut: true,
      });
      const pineconeAPIKey = await vscode.window.showInputBox({
        prompt: "Please enter your Pinecone API Key",
        password: true,
        ignoreFocusOut: true,
      });
      if (!openAIApiKey || !pineconeAPIKey) {
        return vscode.window.showErrorMessage(
          errorMessages.MISSING_CREDENTIALS
        );
      }
      await SecretsManager.getInstance().setSecrets(
        openAIApiKey,
        pineconeAPIKey
      );
    } else {
      console.error(err);
      return vscode.window.showErrorMessage(
        errorMessages.SECRETS_MANAGER_ERROR
      );
    }
  }

  await loadPinecone();

  const generateTest = vscode.commands.registerCommand(
    "testwizard.generateTest",
    async () => {
      if (vscode.workspace.workspaceFolders?.length) {
        const folder = vscode.workspace.workspaceFolders[0];
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          const languageId = editor.document.languageId;
          if (acceptedLanguages.includes(languageId)) {
            vscode.window.withProgress(
              {
                location: vscode.ProgressLocation.Notification,
                title: "Generating new test. This may take some minutes...",
                cancellable: false,
              },
              () => {
                // eslint-disable-next-line no-async-promise-executor
                return new Promise<void>(async (resolve) => {
                  // Identify the project's context
                  const manager = new ContextManager(folder);
                  await manager.identifyProjectContext();
                  // Generate a new unit test
                  const selectedText = editor.document.getText(
                    editor.selection
                  );
                  const fullText = editor.document.getText();
                  const generator = new TestGenerator();
                  const generatedTest = await generator.generateTest(
                    selectedText,
                    fullText,
                    editor.document.fileName,
                    languageId
                  );
                  // Depurate the new test
                  const { filePath, fileBaseName } = getPathComponents(
                    editor.document.fileName
                  );
                  const depurator = new TestDepurator(
                    filePath,
                    fileBaseName,
                    generatedTest
                  );
                  await depurator.init();
                  let result = await depurator.reviewTest();
                  while (!result.success) {
                    const newTest = await generator.generateTest(
                      selectedText,
                      fullText,
                      editor.document.fileName,
                      languageId,
                      result.output,
                    );
                    result = await depurator.reviewTest(newTest);
                    if (result.output === 'maxIterationPassed') {
                      vscode.window.showInformationMessage(
                        "🧙 TestWizard could not solve the test in 5 iterations. Win the AI trying to solve it yourself human!"
                      );
                      resolve();
                      break;
                    }
                  }
                  vscode.window.showInformationMessage(
                    "Your new test is ready 🧙!"
                  );
                  resolve();

                });
              }
            );
          } else {
            vscode.window.showErrorMessage(errorMessages.NO_SUPPORTED_LANGUAGE);
          }
        } else {
          vscode.window.showErrorMessage(errorMessages.NO_EDITOR);
        }
      } else {
        vscode.window.showErrorMessage(errorMessages.NO_PROJECT);
      }
    }
  );
  context.subscriptions.push(generateTest);
}

// This method is called when your extension is deactivated
// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivate() { }
