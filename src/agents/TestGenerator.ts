// LangChain
import { OpenAI } from "langchain/llms/openai";
import { PromptTemplate } from "langchain/prompts";
import { LLMChain } from "langchain/chains";

// Relative imports
import { SecretsManager, stopwords } from "../utils";
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
    language: string,
    testError?: string,
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

    // TODO: Delete the intentional error in the first generation where there is no testError (line#73)
    const task = testError ? `
    Previous test failed with the following error: ${testError}

    Help the human fix it and again write only one valid unit test for this part of the code:

    \`\`\`${language}
    ${selectedCode} 
    \`\`\`

    Write only one assertion.

    Assuming your test is going to be written to a file in the same directory that the file we're testing, include all the necessary imports using relative paths to local files. Avoid importing 'expect' or any other testing library.
    `
      : `Write only one valid unit test for this part of the code:

    \`\`\`${language}
    ${selectedCode} 
    \`\`\`

    Write only one assertion.

    Add one error line to the test that will require the Human to fix the code.

    Assuming your test is going to be written to a file in the same directory that the file we're testing, include all the necessary imports using relative paths to local files. Avoid importing 'expect' or any other testing library.
    `;
    const chain = new LLMChain({
      llm: model,
      prompt,
      memory: this.memory.getStore(),
    });
    const result = await chain.call({
      input: task,
    });

    const code = result.text;
    // We need to cleanup unwanted preffixes on the response
    let codeWithoutStopwords = stopwords.reduce((code, stopword) => {
      return code.split(stopword).join("");
    }, code);
    // remove blank lines at the start of the string
    codeWithoutStopwords = codeWithoutStopwords.replace(/^\s*\n/gm, '');

    // ensure there is only one newline at the end
    codeWithoutStopwords = codeWithoutStopwords.trimEnd() + "\n";

    return codeWithoutStopwords;
  }
}
