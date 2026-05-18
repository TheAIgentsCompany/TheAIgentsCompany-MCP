import { execSync } from "child_process";
import { readFileSync, existsSync, rmSync } from "fs";

const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));
const V = pkg.version;
const base = `theaigentscompany-${V}`;

for (const ext of [".dxt", ".mcpb"]) {
  const f = `${base}${ext}`;
  if (existsSync(f)) rmSync(f);
}
if (existsSync("server/index.cjs")) rmSync("server/index.cjs");

// Bundle to .cjs so Node treats it as CommonJS (package.json has "type": "module")
execSync(
  'npx esbuild src/bin.ts --bundle --platform=node --target=node22 --outfile=server/index.cjs --format=cjs',
  { stdio: "inherit", shell: true }
);

// Build ZIPs
execSync(`zip -j ${base}.dxt manifest.json`, { stdio: "inherit", shell: true });
execSync(`zip ${base}.dxt icon.png README.md`, { stdio: "inherit", shell: true });
execSync(`zip -r ${base}.dxt server/`, { stdio: "inherit", shell: true });
execSync(`cp ${base}.dxt ${base}.mcpb`, { stdio: "inherit", shell: true });

// Test the bundled server
try {
  execSync(`timeout 3 node server/index.cjs 2>&1`, { stdio: "pipe", shell: true, timeout: 5 });
} catch (e) {
  const out = e.stdout?.toString() || "";
  if (out.includes("Starting TheAIgentsCompany-MCP")) {
    console.log("✅ Server test: started successfully");
  } else {
    console.log("⚠️ Server output:", out.slice(0, 200));
  }
}

console.log(`\n✅ Built: ${base}.dxt and ${base}.mcpb`);
