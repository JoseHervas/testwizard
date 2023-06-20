import * as keytar from "keytar";

/**
 * Stores and retrieves the OpenAI and Pinecone API keys
 *
 * For increased security, it uses the system's keychain.
 * On macOS the passwords are managed by the Keychain,
 * on Linux they are managed by the Secret Service API/libsecret,
 * and on Windows they are managed by Credential Vault.
 */
export class SecretsManager {
  private static instance: SecretsManager;
  private pineconeAPIKey?: string | null;
  private openAIApiKey?: string | null;

  /**
   * Make this class a singleton to avoid
   * having to contact the system's keychain
   * too frequently
   */
  public static getInstance(): SecretsManager {
    if (!SecretsManager.instance) {
      SecretsManager.instance = new SecretsManager();
    }
    return SecretsManager.instance;
  }

  async getSecrets() {
    if (!this.openAIApiKey || !this.pineconeAPIKey) {
      this.openAIApiKey = await keytar.getPassword(
        "testwizard",
        "openAIApiKey"
      );
      this.pineconeAPIKey = await keytar.getPassword(
        "testwizard",
        "pineconeAPIKey"
      );
    }
    if (!this.pineconeAPIKey) {
      throw new Error("Missing pineconeAPIKey");
    }
    if (!this.openAIApiKey) {
      throw new Error("Missing openAIApiKey");
    }
    return {
      openAIApiKey: this.openAIApiKey,
      pineconeAPIKey: this.pineconeAPIKey,
    };
  }

  async setSecrets(openAIApiKey: string, pineconeAPIKey: string) {
    keytar.setPassword("testwizard", "openAIApiKey", openAIApiKey);
    keytar.setPassword("testwizard", "pineconeAPIKey", pineconeAPIKey);
    this.pineconeAPIKey = pineconeAPIKey;
    this.openAIApiKey = openAIApiKey;
  }
}
