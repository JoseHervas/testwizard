# <img src="logo.png" height="50" style="vertical-align: text-bottom"> TestWizard

Generate unit tests for your code with ChatGPT!

![tests](https://github.com/JoseHervas/testwizard/actions/workflows/ci.yml/badge.svg) [![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=testwizard_test-wizard&metric=sqale_rating)](https://sonarcloud.io/summary/new_code?id=testwizard_test-wizard) [![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=testwizard_test-wizard&metric=code_smells)](https://sonarcloud.io/summary/new_code?id=testwizard_test-wizard) [![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=testwizard_test-wizard&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=testwizard_test-wizard) [![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=testwizard_test-wizard&metric=vulnerabilities)](https://sonarcloud.io/summary/new_code?id=testwizard_test-wizard) [![Technical Debt](https://sonarcloud.io/api/project_badges/measure?project=testwizard_test-wizard&metric=sqale_index)](https://sonarcloud.io/summary/new_code?id=testwizard_test-wizard)

## How to use?

1. Go to [OpenAI](https://platform.openai.com/account/api-keys) and get your API key
2. Go to [Pinecone](https://www.pinecone.io/) and click on Login. Then go to API keys and get your API key
3. [Install the extension](https://marketplace.visualstudio.com/items?itemName=thesolutioners.testwizard) and input your API keys when prompted
4. Open **ONE** single project in vs code
5. Open any file, select a code snippet and right click on it
6. Click on 🧙‍♂️ TestWizard

## Examples

There is a list of examples [on this repository](https://github.com/JoseHervas/testwizard-examples).

## 💎 TestWizard Plus

Soon we'll release a Plus version of this plugin which will feature:

- Support for multi-language projects
- Autofeedback to teach the ChatGPT agent your favourite coding patterns
- Test suggestions for uncovered code
- Support for using custom LLMs (like `LLaMA` or `Falcon40b`)
- And much more!

[Join the waitlist to get access premium to 🧙‍♂️ TestWizard Plus](https://forms.gle/XuUrVRs5oiasdZWm9)

## 👨‍💻 Technical docs

[We have documented how TestWizard internally works here.](https://josehervas.github.io/testwizard/)

## 🙌 Acknowledgements

This project has been crafted during Pinecone's AI hackaton by the great [Diego Tellez](https://github.com/dtellz/) and [Jose Hervás](https://github.com/josehervas), aka "The Solutioners"
