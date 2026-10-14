// Verifies that every static translation key used in src/ exists in messages/en.json and
// messages/hi.json, and that both files have exactly the same keys.
// Usage: node scripts/check-i18n.mjs
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const en = JSON.parse(readFileSync(join(root, "messages/en.json"), "utf8"));
const hi = JSON.parse(readFileSync(join(root, "messages/hi.json"), "utf8"));

const flatten = (obj, prefix = "") =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" && !Array.isArray(v) ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
const enKeys = new Set(flatten(en));
const hiKeys = new Set(flatten(hi));
const has = (key) => enKeys.has(key) || [...enKeys].some((k) => k.startsWith(`${key}.`));

const files = [];
const walk = (dir) => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx?|mts)$/.test(f) && !f.endsWith(".test.ts")) files.push(p);
  }
};
walk(join(root, "src"));

const problems = [];
for (const file of files) {
  const src = readFileSync(file, "utf8");
  // each call resolves to the nearest preceding declaration of that variable (components are sequential)
  const decls = [...src.matchAll(/const (\w+) = (?:await )?(?:useTranslations|getTranslations)\("([^"]+)"\)/g)].map((m) => ({
    v: m[1],
    ns: m[2],
    at: m.index,
  }));
  for (const v of new Set(decls.map((d) => d.v))) {
    for (const m of src.matchAll(new RegExp(`\\b${v}(?:\\.raw)?\\("([^"]+)"`, "g"))) {
      const decl = decls.filter((d) => d.v === v && d.at < m.index).at(-1);
      if (!decl) continue;
      const key = `${decl.ns}.${m[1]}`;
      if (!has(key)) problems.push(`${file.replace(root, "")}: missing ${key}`);
    }
  }
}
for (const k of enKeys) if (!hiKeys.has(k)) problems.push(`hi.json missing ${k}`);
for (const k of hiKeys) if (!enKeys.has(k)) problems.push(`en.json missing ${k} (only in hi.json)`);

if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(`i18n OK: ${enKeys.size} keys, ${files.length} files checked`);
