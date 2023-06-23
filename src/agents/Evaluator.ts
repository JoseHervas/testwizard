// NodeJS defaults
import { exec } from "child_process";
import { promisify } from "util";

// LangChain
import { LLMChain } from "langchain/chains";
import { PromptTemplate } from "langchain/prompts";
import { OpenAI } from "langchain/llms/openai";

//Relative imports
import { SecretsManager, stopwords } from "../utils";
import { VectorMemory } from "../memory";

/**
 * Checks the output of TestGenerator and
 * ensures it runs without errors
 *
 * It uses another independent LLM agent to
 * check for common code smells
 */
export class Evaluator {
    private chain?: LLMChain;

    /**
     * To be called right after creating the instance.
     * Prepares the evaluation LLM chain
     */
    public async init() {
        const memory = new VectorMemory();
        await memory.init();
        const { openAIApiKey } = await SecretsManager.getInstance().getSecrets();
        const model = new OpenAI({ openAIApiKey });
        const prompt =
            PromptTemplate.fromTemplate(`You are an AI assistant designed to output test execution commands without any other information.

                Context:
                {history}

                Current task: {input}`);

        this.chain = new LLMChain({
            llm: model,
            prompt,
            memory: memory.getStore(),
        });
    }

    public depurateCommand(rawCommand: string) {
        const commandWithoutStopwords = stopwords.reduce((code, stopword) => {
            return code.split(stopword).join("");
        }, rawCommand);
        return commandWithoutStopwords.replace(/\s+/g, " ").trim();
    }

    /**
     * Asks the LLM the appropiate command to run the test.
     *
     * Spawns a subprocess to run the test and registers the output
     */
    public async executeTest(testPath: string): Promise<void> {
        if (!this.chain) {
            throw new Error(
                "Please call Evaluator.init() before Evaluator.executeTest()"
            );
        }

        const task = `Tell me the begining of the command to run the tests on this project`;

        const result = await this.chain.call({
            input: task,
        });

        const rawCommand = result.text;

        const clearCommand = this.depurateCommand(rawCommand);
        console.log('DEBUG: clearCommand', clearCommand);
        const syncExec = promisify(exec);

        try {
            const { stdout, stderr } = await syncExec(`${clearCommand} ${testPath}`);
            console.log("stdout", stdout);
            console.log("stderr", stderr);
        } catch (e) {
            // invalid command
            // tell the LLM the command failed and ask it for a new command
            // maybe in a small (controlled) loop until the command success?
            console.log(e);
        }
    }
}
