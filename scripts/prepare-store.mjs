import { cpSync, lstatSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const output = join(root, "dist", "store", "agent-inbox");
const files = [
  "src",
  "cli",
  "test",
  "assets",
  "metadata",
  "media",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "eslint.config.js",
  ".gitignore",
  ".editorconfig",
  ".gitattributes",
  ".prettierrc",
  ".nvmrc",
  "LICENSE",
  "README.md",
  "README.zh-CN.md",
  "CHANGELOG.md",
  "CHANGELOG.zh-CN.md",
  "CONTRIBUTING.md",
  "CONTRIBUTING.zh-CN.md",
  "SECURITY.md",
  "SECURITY.zh-CN.md",
  "TESTING.md",
  "TESTING.zh-CN.md",
  ...["setup", "usage", "cli", "architecture", "integrations", "brand-brief"].flatMap((name) => [
    `docs/${name}.md`,
    `docs/${name}.zh-CN.md`,
  ]),
];

// A fixed allowlist keeps local tooling, investigation notes and build output out of the submission.
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
for (const file of files) {
  const destination = join(output, file);
  mkdirSync(dirname(destination), { recursive: true });
  cpSync(join(root, file), destination, {
    recursive: true,
    filter: (path) => {
      if (lstatSync(path).isSymbolicLink()) throw new Error(`Unexpected symlink in submission: ${path}`);
      return !path.endsWith(".DS_Store");
    },
  });
}

const upstream = "https://github.com/raycast/extensions";
const extension = `${upstream}/tree/main/extensions/agent-inbox`;
const manifestPath = join(output, "package.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
manifest.repository = { type: "git", url: `${upstream}.git`, directory: "extensions/agent-inbox" };
manifest.homepage = `${extension}#readme`;
manifest.bugs = { url: `${upstream}/issues` };
delete manifest.scripts["prepare:store"];
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

let count = 0;
function finalize(directory) {
  for (const item of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, item.name);
    if (item.isDirectory()) {
      finalize(path);
      continue;
    }
    count++;
    if (!item.name.endsWith(".md")) continue;
    const text = readFileSync(path, "utf8")
      .replaceAll("https://github.com/0xFANGO/agent-inbox/issues", `${upstream}/issues`)
      .replaceAll("https://github.com/0xFANGO/agent-inbox/security", `${upstream}/security`);
    if (text.includes("https://github.com/0xFANGO/agent-inbox")) throw new Error(`Private repository link remains in ${path}`);
    writeFileSync(path, text);
  }
}
finalize(output);
console.log(`Prepared ${count} files in ${output}`);
console.log("Local submission only; no repository was pushed or published.");
