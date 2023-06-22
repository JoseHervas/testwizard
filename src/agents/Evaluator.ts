// NodeJS defaults
import { exec, spawn } from "child_process";
import { promisify } from "util";
import path = require("path");

// LangChain
import { LLMChain } from "langchain/chains";
import { PromptTemplate } from "langchain/prompts";
import { OpenAI } from "langchain/llms/openai";

//Relative imports
import { SecretsManager, stopwords } from "../utils";
import { VectorMemory } from "../memory";
import { Publisher } from "./Publisher";
import { WorkspaceFolder } from "vscode";

async function buildDockerImage(testPackageName: string, testFilePath: string): Promise<void> {
    const directory = path.dirname(testFilePath);
    // const dockerFilePath = path.join(directory, 'Dockerfile');
    console.log('DEBUG TEST FILE PATH: ', directory);
    return new Promise((resolve, reject) => {
        const dockerBuild = spawn('docker', [
            'build',
            '--build-arg',
            `PACKAGE_NAME=${testPackageName}`,
            '--build-arg',
            `TEST_FILE_PATH=${testFilePath}`,
            '-t',
            'test-evaluator',
            directory,
        ]);

        dockerBuild.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
        });

        dockerBuild.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
        });

        dockerBuild.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`docker build exited with code ${code}`));
            } else {
                resolve();
            }
        });
    });
}
/**
 * Checks the output of TestGenerator and
 * ensures it runs without errors
 *
 * It uses another independent LLM agent to
 * check for common code smells
 */
export class Evaluator {
    private chain?: LLMChain;
    private publisher: Publisher = new Publisher();
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
    public async executeTest(testPath: string, userWorkspace: WorkspaceFolder): Promise<void> {
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
        console.log('DEBUG: clearCommand', clearCommand); // TODO: delete
        // const syncExec = promisify(exec);
        const dockerfileContent = `
# Use an official Node runtime as the base image
FROM node:18

# Set the working directory in the container to /app
WORKDIR /app

# Copy the current directory contents into the container at /app
COPY . /app

# Define build arguments
ARG PACKAGE_NAME
ARG TEST_FILE_PATH

# Install package
RUN npm install --global ${clearCommand}

# Make port 3000 available to the world outside this container
EXPOSE 3000

# Run command when the container launches
CMD ["/bin/bash", "-c", "${clearCommand} ${testPath}"]
`;
        try {
            this.publisher = new Publisher();
            await this.publisher.outputDockerfile(userWorkspace, dockerfileContent);
            await buildDockerImage(clearCommand, testPath);
            console.log('Docker image built successfully');
        } catch (error) {
            console.error('Failed to build Docker image:', error);
        }

        /* try {
            const { stdout, stderr } = await syncExec(`npm install ${clearCommand} && ${clearCommand} ${testPath}`);
            console.log("stdout", stdout);
            console.log("stderr", stderr);
        } catch (e) {
            // invalid command
            // tell the LLM the command failed and ask it for a new command
            // maybe in a small (controlled) loop until the command success?
            console.log(e);
        } */
    }
}
