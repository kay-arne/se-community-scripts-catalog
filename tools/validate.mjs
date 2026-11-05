#!/usr/bin/env node
// Checks every scripts/<slug>/ folder: the pull-request check, and what you
// can run locally with `npm ci && npm run validate`.
//
// Messages are written for people who don't live in JSON: they name the
// folder, the field and what to do about it. On GitHub Actions the result is
// also written as a table on the check's summary page.

import { readdir, readFile, stat, appendFile } from "node:fs/promises";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import { fileURLToPath } from "node:url";
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SCRIPTS = join(ROOT, "scripts");
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MEDIA_FILE = /^[a-z0-9][a-z0-9._-]*\.(png|jpe?g|webp|gif|svg)$/i;
const MAX_MEDIA_BYTES = 3 * 1024 * 1024;

const schema = JSON.parse(await readFile(join(ROOT, "schema", "script.schema.json"), "utf8"));
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validateSchema = ajv.compile(schema);

/** "/install/0/command" -> "install → #1 → command" */
function fieldName(pointer) {
  if (!pointer) return "the file";
  return pointer
    .split("/")
    .slice(1)
    .map((p) => (/^\d+$/.test(p) ? `#${Number(p) + 1}` : p))
    .join(" → ");
}

function explain(err) {
  const where = fieldName(err.instancePath);
  switch (err.keyword) {
    case "required":
      return `${where === "the file" ? "" : where + ": "}missing required field "${err.params.missingProperty}"`;
    case "additionalProperties":
      return `${where === "the file" ? "" : where + ": "}unknown field "${err.params.additionalProperty}" — check the spelling (field names are case-sensitive)`;
    case "enum":
      return `${where}: must be one of ${err.params.allowedValues.map((v) => `"${v}"`).join(", ")}`;
    case "pattern":
      if (err.params.pattern === "\\S") return `${where}: must not be empty`;
      if (err.params.pattern.startsWith("^https")) return `${where}: must be a full https:// link`;
      if (where.includes("screenshots") && where.endsWith("file"))
        return `${where}: must be a file name like 01-overview.png (lowercase, no spaces, png/jpg/webp/gif/svg)`;
      if (where === "updated") return `${where}: must be a date like 2026-11-05`;
      return `${where}: has the wrong format`;
    case "maxLength":
      return `${where}: is too long (max ${err.params.limit} characters)`;
    case "minItems":
      return `${where}: needs at least ${err.params.limit} item${err.params.limit === 1 ? "" : "s"}`;
    case "type":
      return `${where}: must be ${err.params.type === "array" ? "a list [ … ]" : err.params.type === "object" ? "an object { … }" : `a ${err.params.type}`}`;
    case "format":
      return `${where}: is not a valid ${err.params.format}`;
    default:
      return `${where}: ${err.message}`;
  }
}

/** Errors (block the merge) and warnings (don't) per folder. */
async function checkFolder(slug) {
  const dir = join(SCRIPTS, slug);
  const errors = [];
  const warnings = [];
  if (!SLUG.test(slug)) {
    errors.push(`folder name "${slug}" must be lowercase letters, digits and dashes (e.g. "fortiexample-lab")`);
  }

  const entries = await readdir(dir, { withFileTypes: true });
  const images = new Set();
  for (const e of entries) {
    if (e.name === "script.json" || e.name === ".DS_Store") continue;
    if (!e.isFile()) {
      errors.push(`"${e.name}": no sub-folders or links — put screenshots directly next to script.json`);
    } else if (!MEDIA_FILE.test(e.name)) {
      errors.push(`"${e.name}": only script.json and images (png, jpg, webp, gif, svg; lowercase name, no spaces) belong here`);
    } else {
      images.add(e.name);
      const { size } = await stat(join(dir, e.name));
      if (size > MAX_MEDIA_BYTES) errors.push(`"${e.name}" is ${(size / 1048576).toFixed(1)} MB — keep screenshots under 3 MB`);
    }
  }

  let raw;
  try {
    raw = await readFile(join(dir, "script.json"), "utf8");
  } catch {
    errors.push("script.json is missing");
    return { errors, warnings };
  }
  let json;
  try {
    json = JSON.parse(raw);
  } catch (err) {
    errors.push(`script.json is not valid JSON: ${err.message} — a missing comma or quote is the usual cause`);
    return { errors, warnings };
  }

  if (!validateSchema(json)) {
    const seen = new Set();
    const patternAt = new Set(validateSchema.errors.filter((e) => e.keyword === "pattern").map((e) => e.instancePath));
    for (const err of validateSchema.errors) {
      if (err.keyword === "format" && patternAt.has(err.instancePath)) continue;
      const msg = explain(err);
      if (!seen.has(msg)) errors.push(msg);
      seen.add(msg);
    }
  }

  const referenced = new Set();
  for (const shot of Array.isArray(json.screenshots) ? json.screenshots : []) {
    if (typeof shot?.file !== "string") continue;
    referenced.add(shot.file);
    if (!images.has(shot.file)) {
      errors.push(`screenshot "${shot.file}" is listed in script.json but the file is not in scripts/${slug}/ (names must match exactly)`);
    }
  }
  for (const img of images) {
    if (!referenced.has(img)) warnings.push(`"${img}" is not listed under screenshots, so it won't be shown`);
  }
  return { errors, warnings };
}

const folders = (await readdir(SCRIPTS, { withFileTypes: true })).filter((e) => e.name !== ".DS_Store");
const results = [];
for (const f of folders) {
  if (!f.isDirectory()) {
    results.push({ slug: f.name, errors: [`"scripts/${f.name}" must be a folder: scripts/<name>/script.json`], warnings: [] });
    continue;
  }
  results.push({ slug: f.name, ...(await checkFolder(f.name)) });
}

const onGitHub = !!process.env.GITHUB_ACTIONS;
const esc = (s) => s.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
let failed = 0;
for (const { slug, errors, warnings } of results) {
  const file = `scripts/${slug}/script.json`;
  if (errors.length) failed++;
  console.log(`${errors.length ? "✗" : "✓"} ${slug}`);
  for (const e of errors) {
    console.log(`    error: ${e}`);
    if (onGitHub) console.log(`::error file=${file},title=${esc(slug)}::${esc(e)}`);
  }
  for (const w of warnings) {
    console.log(`    warning: ${w}`);
    if (onGitHub) console.log(`::warning file=${file},title=${esc(slug)}::${esc(w)}`);
  }
}

if (process.env.GITHUB_STEP_SUMMARY) {
  const rows = results.map(({ slug, errors, warnings }) => {
    const notes = [...errors.map((e) => `❌ ${e}`), ...warnings.map((w) => `⚠️ ${w}`)].join("<br>") || "All good";
    return `| ${errors.length ? "❌" : "✅"} | \`${slug}\` | ${notes.replace(/\|/g, "\\|")} |`;
  });
  const head = failed
    ? `## ❌ ${failed} script${failed === 1 ? "" : "s"} need${failed === 1 ? "s" : ""} a fix\n\nFix the items below in \`script.json\` (or re-do it in the script builder and paste it again), commit to the same branch, and this check runs again by itself.\n`
    : "## ✅ All scripts are valid\n";
  await appendFile(process.env.GITHUB_STEP_SUMMARY, `${head}\n| | Script | Result |\n|---|---|---|\n${rows.join("\n")}\n`);
}

console.log(failed ? `\n${failed} of ${results.length} script(s) need a fix.` : `\nAll ${results.length} script(s) are valid.`);
process.exit(failed ? 1 : 0);
