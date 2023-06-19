import * as vscode from "vscode";
import * as keytar from "keytar"; // eslint-disable-line @typescript-eslint/no-unused-vars
import { ContextManager } from "./Agents/ContextManager";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

export async function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "testwizard" is now active!');
  
  try {
    let openAIKey: string | undefined | null = await keytar.getPassword('testwizard', 'openAIKey');
    let pineconeKey: string | undefined | null = await keytar.getPassword('testwizard', 'pineconeKey');

    if(!openAIKey) {
      openAIKey = await vscode.window.showInputBox({
        prompt: 'Please enter your OpenAI API Key',
        password: true,
        ignoreFocusOut: true,
      });
      await keytar.setPassword('testwizard', 'openAIKey', openAIKey as string);
    }

    if(!pineconeKey) {
      pineconeKey = await vscode.window.showInputBox({
        prompt: 'Please enter your Pinecone API Key',
        password: true,
        ignoreFocusOut: true,
      });
      await keytar.setPassword('testwizard', 'pineconeKey', pineconeKey as string);
    }

		if (!openAIKey || !pineconeKey) {
			vscode.window.showErrorMessage('API keys are required to run the TestWizard 🧙');
			return;
		}
	} catch (err) {
		console.error(err);
	}

  const generateContext = vscode.commands.registerCommand(
    "testwizard.generateContext",
    () => {
      vscode.window.showInformationMessage("Generating test context ...");
      if (vscode.workspace.workspaceFolders) {
        vscode.workspace.workspaceFolders.forEach(async (folder) => {
          const manager = new ContextManager(folder);
          await manager.scanWorkspace();
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
