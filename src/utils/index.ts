import { sep } from "path";

export * from "./SecretsManager";

export const errorMessages = {
  NO_EDITOR: "Select a code snippet to to start using the TestWizard 🧙",
  NO_PROJECT: "Open a project to start using the TestWizard 🧙",
  NO_SUPPORTED_LANGUAGE:
    "Sorry, the language you're using is not yet supported. Stay tuned, we're supporting new languages each day.",
  MISSING_CREDENTIALS: "API keys are required to run the TestWizard 🧙",
  SECRETS_MANAGER_ERROR:
    "We couldn't contact the secrets manager to store your API keys. Try to reinstall the extension and/or contact us.",
  MISSING_DEPS_FILE:
    "We couldn't find any dependency management file on your project",
  PROJECT_CONTEXT_UPLOAD_ERROR:
    "We had a problem when trying to upload your project's context to Pinecone. The generated tests may not be as precise as they should.",
  PROJECT_CONTEXT_RETRIEVAL_ERROR:
    "We had a problem when trying to retrieve your project's context from Pinecone. The generated tests may not be as precise as they should.",
  PINECONE_INIT_ERROR:
    "Sorry, the TestWizard 🧙 extension could not be correctly activated",
};

export const acceptedLanguages = ["typescript", "javascript", "python", "ruby"];

export const stopwords = ["output:", "text:", "Answer:"];

export function getPathComponents(fullPath: string) {
  const filePathComponents = fullPath.split(sep);
  const fileName = filePathComponents[filePathComponents.length - 1];
  const filePath = filePathComponents
    .slice(0, filePathComponents.length - 1)
    .join(sep);
  const fileBaseName = fileName.split(".")[0];
  return { filePath, fileBaseName };
}

