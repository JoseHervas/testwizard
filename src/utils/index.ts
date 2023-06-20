export * from "./SecretsManager";

export const errorMessages = {
  MISSING_CREDENTIALS: "API keys are required to run the TestWizard 🧙",
  SECRETS_MANAGER_ERROR:
    "We couldn't contact the secrets manager to store your API keys. Try to reinstall the extension and/or contact us.",
  MISSING_DEPS_FILE:
    "We couldn't find any dependency management file on your project",
  PROJECT_CONTEXT_UPLOAD_ERROR:
    "We had a problem when trying to upload your project's context to Pinecone. The generated tests may not be as precise as they should.",
  PROJECT_CONTEXT_RETRIEVAL_ERROR:
    "We had a problem when trying to retrieve your project's context from Pinecone. The generated tests may not be as precise as they should.",
};
