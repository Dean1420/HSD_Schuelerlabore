/**
 * Copies the canonical fixtures from tools/fixtures/ into app/workshops/_fixtures/ so that
 * the dev server can serve them, for example for preview.html?id=_fixtures/example-complete.
 * The target folder is git-ignored; folders starting with "_" are never listed by the index.
 */
import { cpSync, rmSync, mkdirSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = fileURLToPath(new URL("./fixtures/", import.meta.url));
const target = fileURLToPath(new URL("../app/workshops/_fixtures/", import.meta.url));

rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
cpSync(source, target, { recursive: true });

const copied = readdirSync(target, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
console.log(`Fixtures copied to app/workshops/_fixtures/: ${copied.join(", ")}`);
