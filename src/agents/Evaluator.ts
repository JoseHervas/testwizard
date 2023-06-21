// LangChain
import { LLMChain, PromptTemplate } from "langchain";
import { OpenAI } from "langchain/llms/openai";

//Relative imports
import { SecretsManager, stopwords } from "../utils";
import { VectorMemory } from "../memory";

// External imports
import { exec } from "child_process";
import { promisify } from "util";
import * as vscode from "vscode";

export class Evaluator {

    private memory?: VectorMemory;
    private syncExec = promisify(exec);

    private runCommandInTerminal(command: string) {
        let terminal = vscode.window.terminals.find(terminal => terminal.name === "TestWizard");

        if (!terminal) {
            terminal = vscode.window.createTerminal("TestWizard");
        }
        terminal.show();
        terminal.sendText(command);
    }

    public async executeTest(testPath: string): Promise<void> {
        this.memory = new VectorMemory();
        await this.memory.init();
        console.log('Executing test!')
        const { openAIApiKey } = await SecretsManager.getInstance().getSecrets();
        const model = new OpenAI({ openAIApiKey });
        const prompt =
            PromptTemplate.fromTemplate(`You are an AI assistant designed to output test execution commands without any other information.

                Context:
                {history}

                Current task: {input}`);

        const chain = new LLMChain({
            llm: model,
            prompt,
            memory: this.memory.getStore(),
        });
        const task = `Tell me the begining of the command to run the tests on this project`;

        const result = await chain.call({
            input: task,
        });

        console.log('DEBUG CHAIN RESPONSE -> ', result.text);
        const command = result.text;
        const commandWithoutStopwords = stopwords.reduce((code, stopword) => {
            return code.split(stopword).join("");
        }, command);
        console.log('COMMAND TO RUN', `${commandWithoutStopwords} ${testPath}`)
        const cleanCommand = commandWithoutStopwords.replace(/\s+/g, ' ').trim();
        this.runCommandInTerminal(`./node_modules/.bin/${cleanCommand} ${testPath}`);

        /* const { stdout, stderr } = await this.syncExec(`npm install ${commandWithoutStopwords} && ${commandWithoutStopwords} ${testPath}`); */

        /* await this.memory.getStore()?.saveContext(
            {
              input: `I'm using ${commandWithoutStopwords} to run the tests on this project`,
            },
            { output: "ok" }
        ); */

        /* console.log('testOutPut -> ', stdout);
        if (stderr) {
            console.log('testError -> ', stderr);
        } */
    }

}