/**
 * TheAIgentsCompany-MCP — Release script
 *
 * Automates: build → bundle → version bump → commit → publish → GitHub release
 *
 * Usage:
 *   node release.mjs            # patch bump (default)
 *   node release.mjs minor      # minor bump
 *   node release.mjs major      # major bump
 *   node release.mjs --dry      # dry run (no actual publish/release)
 */

import { execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync, rmSync } from "fs";
import { resolve } from "path";

const DRY = process.argv.includes("--dry");
const BUMP = process.argv.find(a => ["patch", "minor", "major"].includes(a)) || "patch";

function run(cmd, opts = {}) {
  console.log(`  $ ${cmd}`);
  if (DRY && !opts.force) return "";
  try {
    return execSync(cmd, { stdio: opts.silent ? "pipe" : "inherit", shell: true, ...opts });
  } catch (e) {
    if (opts.ignoreError) return "";
    console.error(e.stderr?.toString() || e.message);
    process.exit(1);
  }
}

function getVersion() {
  return JSON.parse(readFileSync("./package.json", "utf-8")).version;
}

async function main() {
  const oldVersion = getVersion();

  console.log(`\n╔══════════════════════════════════════════════════╗`);
  console.log(`║   TheAIgentsCompany-MCP Release v${oldVersion.padEnd(8)}║`);
  console.log(`╚══════════════════════════════════════════════════╝`);
  console.log(`  Bump: ${BUMP}  |  Mode: ${DRY ? "DRY RUN" : "LIVE"}\n`);

  // 1. Verify working tree is clean
  const status = execSync("git status --porcelain", { encoding: "utf-8" }).trim();
  if (status) {
    console.log("  ⚠ Uncommitted changes. Auto-staging...");
    run(`git add -A`);
    run(`git commit -m "chore: pre-release cleanup"`, { ignoreError: true });
  }

  // 2. Build npm package
  console.log("\n  📦 Building npm package...");
  run("npm run build");

  // 3. Bump version
  console.log(`\n  🔖 Bumping version (${BUMP})...`);
  run(`npm version ${BUMP} --no-git-tag-version`);
  const version = getVersion();

  // 4. Update manifest.json version to match
  if (existsSync("./manifest.json")) {
    const manifest = JSON.parse(readFileSync("./manifest.json", "utf-8"));
    manifest.version = version;
    writeFileSync("./manifest.json", JSON.stringify(manifest, null, 2) + "\n");
    console.log(`  📝 manifest.json version → ${version}`);
  }

  // 5. Build .dxt and .mcpb bundles
  console.log("\n  🗜️  Building bundles...");
  for (const f of []) {
    const file = `${f}-${version}`;
    for (const ext of [".dxt", ".mcpb"]) {
      if (existsSync(`${file}${ext}`)) rmSync(`${file}${ext}`);
    }
  }
  run("node build-dxt.mjs", { silent: true });

  // 6. Commit
  console.log("\n  💾 Committing...");
  run("git add -A");
  run(`git commit -m "chore: release v${version}"`);
  run("git push origin main");

  // 7. npm publish
  console.log("\n  📡 Publishing to npm...");
  run("npm publish");

  // Verify
  const publishedDesc = execSync(`npm view @theaigentscompany/mcp description`, { encoding: "utf-8" }).trim();
  const publishedVer = execSync(`npm view @theaigentscompany/mcp version`, { encoding: "utf-8" }).trim();
  console.log(`  ✅ npm published: ${publishedVer} — "${publishedDesc}"`);

  // 8. Create GitHub release
  console.log("\n  🏷️  Creating GitHub release...");
  const token = execSync(
    "bash -c 'source ../TheAIgentsCompany/.env 2>/dev/null || source .env 2>/dev/null; echo $GITHUB_TOKEN'",
    { encoding: "utf-8" }
  ).trim();

  if (!token) {
    console.log("  ⚠ GITHUB_TOKEN not found. Skipping GitHub release.");
    console.log(`  Manual: https://github.com/TheAIgentsCompany/TheAIgentsCompany-MCP/releases/new?tag=v${version}`);
    process.exit(0);
  }

  const tag = `v${version}`;
  const body = `## TheAIgentsCompany-MCP ${tag}\n\nDownload the **.dxt** or **.mcpb** file below and open it in Claude Desktop for one-click setup.`;

  const releaseResult = JSON.parse(
    execSync(
      `curl -s -X POST -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" "https://api.github.com/repos/TheAIgentsCompany/TheAIgentsCompany-MCP/releases" -d '${JSON.stringify({ tag_name: tag, name: tag, body })}'`,
      { encoding: "utf-8" }
    )
  );

  const releaseId = releaseResult.id;
  const releaseUrl = releaseResult.html_url;
  console.log(`  ✅ Release: ${releaseUrl}`);

  // 9. Upload assets
  console.log("\n  📎 Uploading assets...");
  const assets = [`theaigentscompany-${version}.dxt`, `theaigentscompany-${version}.mcpb`];
  for (const fname of assets) {
    const path = resolve(fname);
    if (!existsSync(path)) {
      console.log(`  ⚠ ${fname} not found, skipping`);
      continue;
    }
    const data = readFileSync(path);
    const uploadUrl = `https://uploads.github.com/repos/TheAIgentsCompany/TheAIgentsCompany-MCP/releases/${releaseId}/assets?name=${fname}`;
    execSync(
      `curl -s -X POST -H "Authorization: Bearer ${token}" -H "Content-Type: application/octet-stream" "${uploadUrl}" --data-binary @${fname}`,
      { stdio: "pipe", encoding: "utf-8" }
    );
    console.log(`  ✅ ${fname}`);
  }

  console.log(`\n  🎉 Release ${tag} complete!\n`);
}

main().catch(e => {
  console.error("Fatal:", e.message);
  process.exit(1);
});
