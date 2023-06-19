# How to contribute to this project

## Contribution workflow

- Start always by creating a new branch from the `main` branch
- When you're ready, open a PR to the `main` branch and wait for an approval to merge your branch
- Eventually, one of the administrators of the repo will deploy the new version to the VS Code Marketplace

## Run this extension locally

- Press `F5` to open a new window with your extension loaded.
- Run your command from the command palette by pressing (`Ctrl+Shift+P` or `Cmd+Shift+P` on Mac) and typing `Hello World`.
- Set breakpoints in your code inside `src/extension.ts` to debug your extension.
- Find output from your extension in the debug console.

## Make changes

- You can relaunch the extension from the debug toolbar after changing code in `src/extension.ts`.
- You can also reload (`Ctrl+R` or `Cmd+R` on Mac) the VS Code window with your extension to load your changes.

## Run tests

- Open the debug viewlet (`Ctrl+Shift+D` or `Cmd+Shift+D` on Mac) and from the launch configuration dropdown pick `Extension Tests`.
- Press `F5` to run the tests in a new window with your extension loaded.
- See the output of the test result in the debug console.
- Make changes to `src/test/suite/extension.test.ts` or create new test files inside the `test/suite` folder.
  - The provided test runner will only consider files matching the name pattern `**.test.ts`.
  - You can create folders inside the `test` folder to structure your tests any way you want.

## Publish a new version in VS Code Marketplace

> ⚠️ For obvious reasons, you need to be administrator to do the following action ⚠️

- Run `npm version patch/minor/major` to increase the extension's version
- Push changes and the new tag (`git push origin main && git push --tags`)

There's a [Github Action workflow](../.github/workflows/deploy.yml) that automatically builds and deploys the new version to the VS Code Marketplace.
