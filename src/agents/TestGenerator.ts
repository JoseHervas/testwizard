// LangChain
import { OpenAI } from "langchain/llms/openai";
import { PromptTemplate } from "langchain/prompts";
import { LLMChain } from "langchain/chains";

// Relative imports
import { SecretsManager } from "../utils";
import { VectorMemory } from "../memory";

/**
 * Component that uses ChatGPT to generate
 * a valid test for any given code snippet
 * taking into account the project's context
 */
export class TestGenerator {
  private memory?: VectorMemory;

  public async generateTest(
    selectedCode: string,
    fullCode: string,
    filePath: string,
    language: string
  ) {
    const { openAIApiKey } = await SecretsManager.getInstance().getSecrets();
    const model = new OpenAI({ openAIApiKey });
    this.memory = new VectorMemory();
    await this.memory.init();
    // Add the full file's code to the chain's memory
    await this.memory.getStore()?.saveContext(
      {
        input: `I'm working on this ${language} code: 
        \`\`\`${language}
        ${fullCode}
        \`\`\`

        which is located on this file: ${filePath}
        `,
      },
      { output: "ok" }
    );

    const prompt =
      PromptTemplate.fromTemplate(`You are an AI assistant designed to help the Human with his programming tasks.

        Context:
        {history}

        Current task: {input}`);

    const task = `Write a valid unit test for this part of the code:

    \`\`\`${language}
    ${selectedCode} 
    \`\`\`

    Assuming this test is written on a file located next to the main file.
    `;
    const chain = new LLMChain({
      llm: model,
      prompt,
      memory: this.memory.getStore(),
    });
    const result = await chain.call({
      input: task,
    });

    // ChatGPT is prune to emit the word "output:"
    const code = result.text;
    if (code.includes("output:")) {
      return code.split("output:").join("");
    }

    return code;
  }
}
