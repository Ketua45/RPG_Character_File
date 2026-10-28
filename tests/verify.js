/**
 * Automated verification script for RPG Character Sheet Studio
 * Run with: node tests/verify.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const rootDir = path.resolve(__dirname, "..");
const tplCode = fs.readFileSync(path.join(rootDir, "js", "templates.js"), "utf8");
const genCode = fs.readFileSync(path.join(rootDir, "js", "generator.js"), "utf8");

const sandbox = { structuredClone };
vm.createContext(sandbox);
const { CHARACTER_TEMPLATES, generateStandaloneHTML, parseCharacterFromFile } = vm.runInContext(
  tplCode + "\n" + genCode + "\n({ CHARACTER_TEMPLATES, generateStandaloneHTML, parseCharacterFromFile })",
  sandbox
);

// 1. Verify all built-in templates generate valid standalone HTML and inline JS
for (const [key, tpl] of Object.entries(CHARACTER_TEMPLATES)) {
  const html = generateStandaloneHTML(tpl);
  assert(html.includes("Compagnie Française de Systèmes et Algorithmes"), `Missing footer branding in template: ${key}`);

  const scriptMatches = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.strictEqual(scriptMatches.length, 1, `Expected 1 inline script in generated HTML for ${key}`);
  new vm.Script(scriptMatches[0][1]);

  // Verify round-trip re-import from generated HTML
  const reimported = parseCharacterFromFile(html);
  assert.strictEqual(reimported.name, tpl.name, `Round-trip name mismatch for ${key}`);
  assert.strictEqual(reimported.stats.length, tpl.stats.length, `Round-trip stats count mismatch for ${key}`);
  assert.strictEqual(reimported.gear.length, tpl.gear.length, `Round-trip gear count mismatch for ${key}`);
}

// 2. Verify legacy HTML import compatibility
const legacyPath = path.join(rootDir, "legacy_exemple", "Elara Lorens - Suivi de fiche.html");
if (fs.existsSync(legacyPath)) {
  const legacyHtml = fs.readFileSync(legacyPath, "utf8");
  const legacyImported = parseCharacterFromFile(legacyHtml);
  assert.strictEqual(legacyImported.name, "ELARA LORENS");
  assert.strictEqual(legacyImported.stats.length, 7);
}

console.log("✔ All templates, generated HTML sheets, inline scripts, and import pipelines verified successfully.");
