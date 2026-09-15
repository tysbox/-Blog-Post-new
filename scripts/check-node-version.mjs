import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const versionFile = resolve(process.cwd(), ".nvmrc");
const expectedVersion = readFileSync(versionFile, "utf8").trim().replace(/^v/, "");
const currentVersion = process.version.replace(/^v/, "");

if (currentVersion !== expectedVersion) {
  console.error(`Expected Node ${expectedVersion}, but found ${currentVersion}.`);
  console.error("Run `nvm use` or switch your Node version before installing or building.");
  process.exit(1);
}

console.log(`Node ${currentVersion} OK`);