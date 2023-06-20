// VS Code utils
import * as vscode from "vscode";

// Local imports
import { ContextManager } from "./agents/ContextManager";
import { SecretsManager, errorMessages } from "./utils";

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
    }
    console.error(err);
    return vscode.window.showErrorMessage(errorMessages.SECRETS_MANAGER_ERROR);
  }

  const generateContext = vscode.commands.registerCommand(
    "testwizard.generateContext",
    () => {
      vscode.window.showInformationMessage("Generating test context ...");
      if (vscode.workspace.workspaceFolders) {
        vscode.workspace.workspaceFolders.forEach(async (folder) => {
          const manager = new ContextManager(folder);
          await manager.identifyAndUploadProjectContext();
          const techStack = await manager.getTestStack();
          console.log(techStack);
        });
      } else {
        vscode.window.showInformationMessage(
          "Open a project to start using the TestWizard 🧙"
        );
      }
    }
  );
  context.subscriptions.push(generateContext);
}

// This method is called when your extension is deactivated
// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivate() {}
