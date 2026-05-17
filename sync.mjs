#!/usr/bin/env node

/**
 * Sync local project & skill files to Supabase.
 *
 * Usage:
 *   node sync.mjs                          # sync all data to Supabase
 *   SUPABASE_KEY=svc_xxx node sync.mjs     # with service_role key for write access
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, readdirSync } from "fs";
import { resolve } from "path";
import { homedir } from "os";
import matter from "gray-matter";
import ws from "ws";

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? "https://gvkljtwhsulzdpsapaau.supabase.co";
const SUPABASE_KEY =
  process.env.SUPABASE_KEY ?? process.env.SUPABASE_ANON;
const PROJECTS_DIR =
  process.env.PROJECTS_DIR ??
  resolve(homedir(), "Github", "TheAIgentsCompany", "agents", "projects");
const SKILLS_DIR =
  process.env.SKILLS_DIR ?? resolve(homedir(), ".hermes", "skills");

if (!SUPABASE_KEY) {
  console.error("❌ Missing SUPABASE_KEY or SUPABASE_ANON env var");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  realtime: { transport: ws },
});

let ok = 0;
let err = 0;

// ── Sync projects ──────────────────────────────────────────────

if (existsSync(PROJECTS_DIR)) {
  const files = readdirSync(PROJECTS_DIR).filter((f) => f.endsWith(".md"));
  console.log(`\n📁 Syncing ${files.length} projects...`);

  for (const file of files) {
    const content = readFileSync(resolve(PROJECTS_DIR, file), "utf-8");
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
    if (error) {
      console.error(`  ✗ ${project.id}: ${error.message}`);
      err++;
    } else {
      console.log(`  ✓ ${project.id}`);
      ok++;
    }
  }
} else {
  console.log(`\n⚠ Projects dir not found: ${PROJECTS_DIR}`);
}

// ── Sync skills ────────────────────────────────────────────────

if (existsSync(SKILLS_DIR)) {
  const dirs = readdirSync(SKILLS_DIR);
  console.log(`\n📁 Syncing ${dirs.length} skills...`);

  for (const dir of dirs) {
    const sf = resolve(SKILLS_DIR, dir, "SKILL.md");
    if (!existsSync(sf)) continue;

    const content = readFileSync(sf, "utf-8");
    const { data } = matter(content);

    const skill = {
      name: String(data.name ?? dir),
      description: String(data.description ?? ""),
    };

    const { error } = await supabase.from("skills").upsert(skill, {
      onConflict: "name",
    });
    if (error) {
      console.error(`  ✗ ${skill.name}: ${error.message}`);
      err++;
    } else {
      console.log(`  ✓ ${skill.name}`);
      ok++;
    }
  }
} else {
  console.log(`\n⚠ Skills dir not found: ${SKILLS_DIR}`);
}

// ── Summary ────────────────────────────────────────────────────

console.log(`\n${err > 0 ? "⚠" : "✅"} Done: ${ok} synced, ${err} errors`);
process.exit(err > 0 ? 1 : 0);
