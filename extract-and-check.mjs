// Extract every inline <script> block from an HTML file and run `node --check` on each.
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const htmlPath = process.argv[2];
if (!htmlPath) { console.error('usage: node extract-and-check.mjs <file.html>'); process.exit(2); }
const html = readFileSync(htmlPath, 'utf8');
const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
if (!scripts.length) { console.error('NO INLINE SCRIPTS FOUND'); process.exit(1); }
const dir = mkdtempSync(join(tmpdir(), 'rp-check-'));
let fail = 0;
scripts.forEach((s, i) => {
  const f = join(dir, `inline-${i}.js`);
  writeFileSync(f, s);
  try {
    execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' });
    console.log(`inline script ${i}: syntax OK (${s.length} chars)`);
  } catch (e) {
    fail++;
    console.error(`inline script ${i}: SYNTAX ERROR\n${e.stderr}`);
  }
});
process.exit(fail ? 1 : 0);
