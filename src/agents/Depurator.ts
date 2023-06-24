// NodeJS defaults
import { spawnSync } from "child_process";
import { promisify } from "util";

// LangChain
import { LLMChain } from "langchain/chains";
import { PromptTemplate } from "langchain/prompts";
import { OpenAI } from "langchain/llms/openai";

//Relative imports
import { SecretsManager, stopwords } from "../utils";
import { VectorMemory } from "../memory";
import { Publisher } from "./Publisher";

/**
 * Checks the output of TestGenerator and
 * ensures it runs without errors
 *
 * It uses another independent LLM agent to
 * check for common code smells
 */
export class TestDepurator {
  private chain?: LLMChain;
  private runCommand?: string;

  // for the publisher
  private directory: string;
  private filename: string;
  private code: string;

  // control the number of depuration iterations
  private maxIterations = 1;
  private i = 0;

  constructor(directory: string, filename: string, code: string) {
    this.directory = directory;
    this.filename = filename;
    this.code = code;
  }

  /**
   * To be called right after creating the instance.
   * Prepares the LLM chain
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
  public async reviewTest(): Promise<void> {
    if (!this.chain) {
      throw new Error(
        "Please call Evaluator.init() before Evaluator.executeTest()"
      );
    }

    // Write the test to the user's filesystem
    const publisher = new Publisher();
    const testPath = await publisher.outputTest(
      this.directory,
      this.filename,
      this.code
    );

    /**
     * Cache the runCommand on the class
     * so we don't call the chain more times
     * than necessary
     */
    if (!this.runCommand) {
      // const task = `Tell me the appropiate command to run the test ${testPath} on my terminal`;
      const task = `I have a test located on ${testPath}. According to this projects configuration file, tell me the appropiate command to run this test only in my terminal.`
      const result = await this.chain.call({
        input: task,
      });
      const rawCommand = result.text;
      const clearCommand = this.depurateCommand(rawCommand);

      console.log("Command to run the test: ", clearCommand);
      this.runCommand = clearCommand;
    }

    try {
      // Run the test
      const npx = 'npx';
      const args = this.runCommand.split(' ');
      // Run command and capture the output
      const commandResult = spawnSync(
        npx, args, { stdio: 'pipe', cwd: this.directory }
      );
      // Convert buffers to strings
      const stdout = commandResult.output[1] ? commandResult.output[1].toString() : '';
      const stderr = commandResult.output[2] ? commandResult.output[2].toString() : '';

      console.log("stdout: ", stdout);
      console.log("stderr: ", stderr);
      // console.log(JSON.stringify(commandResult));
      if (commandResult.status !== 0) {
        // There are errors on the generated test
        console.log("Test failed");
        console.log("stderr: ", stderr);

        if (this.i < this.maxIterations) {
          console.log(`Trying to fix (iteration ${this.i})...`);
          this.i++;
          const task = `The test you generated failed with this error message: ${stderr}. Write a fixed version of the test`;
          const chainResult = await this.chain.call({
            input: task,
          });
          const rawResponse = chainResult.text;
          const clearResponse = this.depurateCommand(rawResponse);
          this.code = clearResponse;
          await this.reviewTest();
        } else {
          console.log(
            "Maxmimum number of iterations overpassed. Stopping the process..."
          );
        }
      } else {
        console.log("Test works!!!!");
        console.log("stdout", stdout);
      }
    } catch (e) {
      // invalid command
      // TODO: tell the LLM the command failed and ask it for a new command
      // maybe in a small (controlled) loop until the command success?
      // THIS CAN BE DONE ON A 2ND ITERATION
      console.log(e);
    }
  }
}
