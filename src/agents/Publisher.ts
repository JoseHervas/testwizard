// NodeJS utils
import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";

export class Publisher {
  public async outputTest(directory: string, filename: string, code: string): Promise<string> {
    const write = promisify(fs.writeFile);
    const fileExtension = ".spec.ts"; // TODO: Make this smarter, could be asking the LLM.
    try {
      const testPath = path.join(directory, `${filename}${fileExtension}`);
      await write(testPath, code);
      return testPath; // I assumed file extension will be dinamic when multilanguage support is added. So I return the path to the test file instead of generating in extension.ts
    } catch (e) {
      if ((e as Error).message.includes("EEXIST")) {
        // TODO: Retry with a different name
        throw e;
      } else {
        throw e;
      }
    }
  }
}
