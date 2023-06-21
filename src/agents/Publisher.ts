// NodeJS utils
import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";

export class Publisher {
  public async outputTest(directory: string, filename: string, code: string) {
    const write = promisify(fs.writeFile);
    const fileExtension = ".spec.ts";
    try {
      write(path.join(directory, `${filename}${fileExtension}`), code);
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
