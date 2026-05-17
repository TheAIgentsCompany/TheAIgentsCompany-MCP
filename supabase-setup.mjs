import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, readdirSync } from "fs";
import { resolve } from "path";
import { homedir } from "os";
import matter from "gray-matter";
import ws from "ws";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_KEY in env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  realtime: { transport: ws },
});

// ── Insert projects ──────────────────────────────────────────────

const projectsDir = resolve(
  homedir(),
  "Github",
  "TheAIgentsCompany",
  "agents",
  "projects"
);

if (!existsSync(projectsDir)) {
  console.error(`Projects directory not found: ${projectsDir}`);
  process.exit(1);
}

const files = readdirSync(projectsDir).filter((f) => f.endsWith(".md"));

for (const file of files) {
  const content = readFileSync(resolve(projectsDir, file), "utf-8");
  const { data } = matter(content);

  const project = {
    id: String(data.id ?? file.replace(".md", "")),
    name: String(data.name ?? file.replace(".md", "").replace(/-/g, " ")),
    status: String(data.status ?? "unknown"),
    goal: String(data.goal ?? ""),
    repo: String(data.repo ?? ""),
    url: String(data.url ?? ""),
  };

  const { error } = await supabase.from("projects").upsert(project, {
    onConflict: "id",
  });
  if (error) console.error(`Error inserting ${project.id}:`, error.message);
  else console.log(`  ✓ ${project.id}: ${project.name}`);
}

// ── Insert skills ────────────────────────────────────────────────

const skillsDir = resolve(homedir(), ".hermes", "skills");

const skillDirs = readdirSync(skillsDir);
for (const dir of skillDirs) {
  const skillFile = resolve(skillsDir, dir, "SKILL.md");
  if (!existsSync(skillFile)) continue;

  const content = readFileSync(skillFile, "utf-8");
  const { data } = matter(content);

  const skill = {
    name: String(data.name ?? dir),
    description: String(data.description ?? ""),
  };

  const { error } = await supabase.from("skills").upsert(skill, {
    onConflict: "name",
  });
  if (error) console.error(`Error inserting ${skill.name}:`, error.message);
  else console.log(`  ✓ ${skill.name}`);
}

console.log("\n✅ Sync complete!");
