import { execSync } from "child_process";
import { readFileSync, existsSync, rmSync } from "fs";

const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));
const V = pkg.version;
const base = `theaigentscompany-${V}`;

// Clean old files
for (const ext of [".dxt", ".mcpb"]) {
  const f = `${base}${ext}`;
  if (existsSync(f)) rmSync(f);
}
if (existsSync("server/index.js")) rmSync("server/index.js");

// Bundle the server
execSync(
  'npx esbuild src/bin.ts --bundle --platform=node --target=node22 --outfile=server/index.js --format=cjs',
  { stdio: "inherit", shell: true }
);

// Create the ZIP
execSync(`zip -j ${base}.dxt manifest.json`, { stdio: "inherit", shell: true });
execSync(`zip ${base}.dxt icon.png README.md`, { stdio: "inherit", shell: true });
execSync(`zip -r ${base}.dxt server/`, { stdio: "inherit", shell: true });

// Copy to .mcpb
execSync(`cp ${base}.dxt ${base}.mcpb`, { stdio: "inherit", shell: true });

console.log(`\n✅ Built: ${base}.dxt and ${base}.mcpb`);
