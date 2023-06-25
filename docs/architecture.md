# <img src="../logo.png" height="50" style="vertical-align: text-bottom"> TestWizard

Generate unit tests for your code with ChatGPT!

## 🧑‍🔧⚙️ How does it work?

> TestWizard is a `VS Code` plugin that connects your code with ChatGPT to generate astonishing unit tests.

There have been several attempst to create unit test generation tools like [AthenaTest](https://arxiv.org/abs/2009.05617), [A3Test](https://arxiv.org/pdf/2302.10352.pdf) or [ChatUniTest](https://arxiv.org/pdf/2305.04764.pdf). Most of these tools have been designed to work amazingly with 1 single language (_Java_). However, with TestWizard we wanted to create something completely new:

1. We created 🧙‍♂️ TestWizard as a vs code extension to deliver the solution as close to the developers as possible. By integrating it directly on the developer's everyday maintool (their IDE) we facilitate and speed up the usage of it.
2. We created 🧙‍♂️ TestWizard as a language-agnostic tool that really leverages the full potential of ChatGPT.
3. Finally, we wanted 🧙‍♂️ TestWizard to generate the best quality tests. For that reason we followed the _"Generation-Validation-Repair"_ framework. It works this way:

- The `ContextManager` agent uses ChatGPT to identify the tech stack of the opened project. It does so by identifying and reading the contents of the project's source code. By using vs code's API we can, for example, identify if a project is using Java or Python. Even more: we can identify the test framework, the list of dependencies, and even the linting configurations of the project! 🔮

- The `TestGenerator` agent uses [🔗🦜 LangChain](https://github.com/hwchase17/langchain) to write a shiny new unit test for the code selected by the user, taking into account the project's configurations (previously identified by the `ContextManager`).

- The `🧠 Depurator` agent uses ChatGPT and the project's context to infer the correct command to run the generated test. Then, this agent will run your new test on an isolated environment to make sure it passes.

- If for any reason the test fails, the `Depurator` class will continue the 🔗🦜 LangChain session by feeding the agent with the stdout errors to fix the broken test.

- Then, 🧙‍♂️ TestWizard will enter on a controlled feedback loop, running the new test and capturing the stdout errors to re-ask the agent to fix it.

- When the test successfully passes, the loop will end and the final test will be outputed by the `Publisher` class. This will leave the end user with a ✨ shiny new test ✨ that has been checked to work.

All of this is backed by a vectore DB called [Pinecone](https://app.pinecone.io/), which allows us to share a common memory between all the agents 🧠. Even more: thanks to the potential of Pinecone, our agents will learn from their errors and they will output better tests everytime they are used.
