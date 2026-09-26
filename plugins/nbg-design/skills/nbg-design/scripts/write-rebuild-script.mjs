#!/usr/bin/env node
// NBG Design — write the rebuild script that is delivered next to every deck.
//
// A delivered deck carries the in-deck editing tools (the right-click menu block inlined by
// add-deck-menu.mjs: menu, toolbars, structure panel, assistant, PDF export). Those tools keep
// evolving with the skill, while the deck is a file that was handed over once. This script writes
// `<deck>.rebuild.mjs` next to the deck: a self-contained Node script that, whenever it is run,
// replaces the deck's editor block with the version the skill ships at that moment (the deck's own
// content is untouched), runs the strict verification gate and exports the PDF again.
//
// Recorded in the generated script: the deck and PDF file names (relative to the script, so the
// folder can move as a whole), the directory of the nbg-design scripts at delivery time, the plugin's
// registry key and the scripts' path inside the plugin (when the skill runs from an installed plugin),
// the editor block version and the plugin version that were embedded, the block's configuration (if
// any) and the exporter options used. The generated script looks the scripts up through --scripts,
// then NBG_DESIGN_SCRIPTS, then Claude Code's plugin registry (the CURRENT install — v1.24.0: the
// recorded directory names a versioned cache folder that stays on disk after an update, so trusting it
// reported stale decks as current), then the recorded directory, and errors otherwise. After every
// rebuild it rewrites its own record from the directory it used, so it never drifts behind again.
//
// Usage: node write-rebuild-script.mjs <deck.html> [-o <script.mjs>] [--pdf <deck.pdf>] [--no-pdf]
//                                      [--selector <css>] [--size WxH]
// Exit: 0 = written, 1 = error, 2 = usage. Zero dependencies, Node >= 18.

import { readFileSync, writeFileSync, existsSync, realpathSync } from 'node:fs';
import { resolve, dirname, basename, relative, join, sep } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { readMenuConfig, BLOCK_RE } from './add-deck-menu.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));            // the skill's scripts/ directory

const USAGE = `NBG deck — write the rebuild script delivered next to the deck
Usage: node write-rebuild-script.mjs <deck.html> [-o <script.mjs>] [--pdf <deck.pdf>] [--no-pdf]
                                     [--selector <css>] [--size WxH]

  -o, --out <file>   Where to write the script (default: <deck>.rebuild.mjs next to the deck).
  --pdf <file>       The PDF the rebuild re-exports (default: <deck>.pdf next to the deck).
  --no-pdf           The deck was delivered without a PDF: the rebuild refreshes the HTML only
                     (a PDF can still be asked for with --pdf at rebuild time).
  --selector <css>   Slide selector passed to export-pdf.mjs (default: the block's root, else .slide).
  --size WxH         Page size passed to export-pdf.mjs (only when the deck was exported with it).

The deck must already carry the editor block (run add-deck-menu.mjs first).
Exit code 0 = written, 1 = error, 2 = usage.`;

function parseArgs(argv) {
  const a = { _: [], pdf: undefined, noPdf: false };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    const val = () => { if (i + 1 >= argv.length) throw new Error(`${x} needs a value`); return argv[++i]; };
    if (x === '-o' || x === '--out') a.out = val();
    else if (x === '--pdf') a.pdf = val();
    else if (x === '--no-pdf') a.noPdf = true;
    else if (x === '--selector') a.selector = val();
    else if (x === '--size') a.size = val();
    else if (x === '-h' || x === '--help') a.help = true;
    else if (x.startsWith('-')) throw new Error(`unknown option ${x}`);
    else a._.push(x);
  }
  return a;
}

/** The plugin version, when the skill still sits inside its plugin checkout (null when it travelled alone). */
/** Claude Code's plugin registry: CLAUDE_CONFIG_DIR (else ~/.claude) / plugins/installed_plugins.json. */
export function pluginRegistryPath(env = process.env) {
  return join(env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude'), 'plugins', 'installed_plugins.json');
}

/** Which installed plugin this scripts directory belongs to: { pluginKey, pluginSubpath }, or nulls when the
 *  skill does not run from an installed plugin (a development checkout, a copied folder). */
export function findPluginInstall(scriptsDir = HERE, env = process.env) {
  const none = { pluginKey: null, pluginSubpath: null };
  const reg = pluginRegistryPath(env);
  if (!existsSync(reg)) return none;
  let data;
  try { data = JSON.parse(readFileSync(reg, 'utf8')); } catch { return none; }   // unreadable registry: record no key
  const plugins = (data && typeof data.plugins === 'object' && data.plugins) || data || {};
  let real;
  try { real = realpathSync(scriptsDir); } catch { real = scriptsDir; }
  for (const [key, entries] of Object.entries(plugins)) {
    for (const e of [].concat(entries || [])) {
      if (!e || typeof e.installPath !== 'string') continue;
      let root;
      try { root = realpathSync(e.installPath); } catch { continue; }
      if (real === root || real.startsWith(root + sep)) return { pluginKey: key, pluginSubpath: toPosix(relative(root, real)) };
    }
  }
  return none;
}

export function readPluginVersion(scriptsDir = HERE) {
  const manifest = resolve(scriptsDir, '../../../.claude-plugin/plugin.json');
  if (!existsSync(manifest)) return null;
  try { return JSON.parse(readFileSync(manifest, 'utf8')).version || null; } catch { return null; }
}

/** The version of the editor block the skill ships (lib/deck-menu.js). */
export function shippedBlockVersion(scriptsDir = HERE) {
  const lib = readFileSync(resolve(scriptsDir, 'lib/deck-menu.js'), 'utf8');
  const v = Number((lib.match(/var VERSION = (\d+);/) || [])[1]);
  if (!v) throw new Error('lib/deck-menu.js has no VERSION marker');
  return v;
}

/** What the generated script records; throws when the deck cannot be rebuilt by it. */
export function buildRecord(deckPath, opts = {}) {
  const deck = resolve(deckPath);
  if (!existsSync(deck)) throw new Error('not found: ' + deck);
  const html = readFileSync(deck, 'utf8');
  const block = html.match(BLOCK_RE);
  if (!block) throw new Error(`${basename(deck)} carries no editor block — run add-deck-menu.mjs on it first, then write the rebuild script.`);
  if (!/<script id="nbg-deck-menu-script"/.test(block[0])) {
    throw new Error(`${basename(deck)} carries the old PDF-only menu (v${block[1]}) — run add-deck-menu.mjs to upgrade it, then write the rebuild script.`);
  }
  const config = readMenuConfig(html);
  if (config && config.mode === 'page') {
    throw new Error(`${basename(deck)} carries the editor in page mode (not a deck): a page has no slide PDF export, so this rebuild script does not apply. Refresh a page's editor with the html-editor skill's add-editor.mjs.`);
  }
  const scriptOut = resolve(opts.out || join(dirname(deck), basename(deck).replace(/\.html?$/i, '') + '.rebuild.mjs'));
  const scriptDir = dirname(scriptOut);
  const pdfPath = opts.noPdf ? null : resolve(opts.pdf || join(dirname(deck), basename(deck).replace(/\.html?$/i, '') + '.pdf'));
  const exportArgs = [];
  const selector = opts.selector || (config && config.root) || null;
  if (selector && selector !== '.slide') exportArgs.push('--selector', selector);
  if (opts.size) {
    if (!/^\d+x\d+$/i.test(opts.size)) throw new Error(`bad --size "${opts.size}" (expected WxH in px)`);
    exportArgs.push('--size', opts.size);
  }
  const shipped = shippedBlockVersion();
  const embedded = Number(block[1]);
  return {
    scriptOut,
    record: {
      generated: new Date().toISOString(),
      deck: toPosix(relative(scriptDir, deck)),
      pdf: pdfPath ? toPosix(relative(scriptDir, pdfPath)) : null,
      scriptsDir: HERE,
      ...findPluginInstall(HERE),
      blockVersion: embedded,
      shippedVersion: shipped,
      pluginVersion: readPluginVersion(),
      config,
      exportArgs,
    },
  };
}

const toPosix = (p) => p.split('\\').join('/');

/** The generated script's source. */
export function renderRebuildScript(record) {
  const rec = JSON.stringify(record, null, 2).replace(/</g, '\\u003c');
  const deckName = record.deck;
  const scriptName = basename(deckName).replace(/\.html?$/i, '') + '.rebuild.mjs';
  return `#!/usr/bin/env node
// ${scriptName} — rebuild "${deckName}" with the current NBG Design editing tools.
//
// Written by the nbg-design skill (scripts/write-rebuild-script.mjs) on ${record.generated.slice(0, 10)},
// when the deck was delivered with editor block v${record.blockVersion}${record.pluginVersion ? ` (plugin ${record.pluginVersion})` : ''}.
// The deck carries the in-deck editing tools (right-click menu, text and shape toolbars, structure
// panel, AI assistant, "Export to PDF", "Save edited copy") as one inlined script block. Those tools
// evolve with the skill; the deck does not. Run this script after the nbg-design skill / plugin was
// updated: it replaces the deck's editor block with the version the skill ships now — the slides
// themselves are left exactly as they are — then verifies the deck and exports its PDF again.
//
//   node ${scriptName}                 # rebuild the deck next to this script${record.pdf ? ' and its PDF' : ''}
//   node ${scriptName} --check         # only report whether the deck's editor is current (writes nothing)
//   node ${scriptName} --no-pdf        # rebuild the HTML only
//   node ${scriptName} --pdf out.pdf   # rebuild and export the PDF to this path
//   node ${scriptName} other.html      # rebuild another copy of the deck (e.g. the "-edited" copy)
//   node ${scriptName} --no-backup     # do not keep a copy of the deck as it was before
//
// Where the nbg-design scripts are looked up (highest priority first):
//   --scripts <dir>             explicit;
//   NBG_DESIGN_SCRIPTS=<dir>    environment;
//   the plugin registry         the CURRENT install of ${record.pluginKey || '(not recorded: the deck was built outside an installed plugin)'}
//                               in Claude Code's plugins/installed_plugins.json;
//   the recorded directory      ${record.scriptsDir}
//                               (where the skill was when this script was last written).
// The directory must hold add-deck-menu.mjs, verify-deck.mjs, export-pdf.mjs and lib/ (the skill's
// scripts/ folder). Anything else is an error. After a rebuild this script rewrites its own record from
// the directory it used, so the next run starts from there.
//
// Exit: 0 = rebuilt (or --check: current), 1 = error / gate failed (or --check: not current),
//       2 = usage, 3 = HTML rebuilt but no Chrome/Chromium/Edge on this host for the PDF.

import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { resolve, dirname, basename, join } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const RECORD = ${rec};

const HERE = dirname(fileURLToPath(import.meta.url));
const USAGE = \`Rebuild "\${RECORD.deck}" with the current NBG Design editing tools
Usage: node \${basename(fileURLToPath(import.meta.url))} [<deck.html>] [--scripts <dir>] [--pdf <file> | --no-pdf]
                              [--no-backup] [--check]

  <deck.html>       Another copy of the deck to rebuild (default: \${RECORD.deck} next to this script).
  --scripts <dir>   The nbg-design skill's scripts/ directory (default: NBG_DESIGN_SCRIPTS, else the
                    current install in Claude Code's plugin registry, else the recorded
                    \${RECORD.scriptsDir}).
  --pdf <file>      Export the PDF to this path (default: \${RECORD.pdf || 'none — the deck was delivered without a PDF'}).
  --no-pdf          Skip the PDF export.
  --no-backup       Do not copy the deck to <name>.backup-<stamp>.html before rebuilding.
  --check           Report the deck's editor version against the skill's and exit 0 when current,
                    1 otherwise. Writes nothing.

Exit: 0 = rebuilt / current, 1 = error / gate failed / not current, 2 = usage, 3 = no browser for the PDF.\`;

function parseArgs(argv) {
  const a = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    const val = () => { if (i + 1 >= argv.length) throw new Error(\`\${x} needs a value\`); return argv[++i]; };
    if (x === '--scripts') a.scripts = val();
    else if (x === '--pdf') a.pdf = val();
    else if (x === '--no-pdf') a.noPdf = true;
    else if (x === '--no-backup') a.noBackup = true;
    else if (x === '--check') a.check = true;
    else if (x === '-h' || x === '--help') a.help = true;
    else if (x.startsWith('-')) throw new Error(\`unknown option \${x}\`);
    else a._.push(x);
  }
  if (a._.length > 1) throw new Error('at most one deck file');
  return a;
}

const blockVersionIn = (dir) => Number((readFileSync(join(dir, 'lib', 'deck-menu.js'), 'utf8').match(/var VERSION = (\\d+);/) || [])[1]) || 0;

/** The scripts directory of the CURRENT install of this plugin, from Claude Code's plugin registry — null when the
 *  deck was built outside an installed plugin, or the plugin is not installed on this machine. The recorded
 *  directory names a versioned cache folder that outlives updates, so the registry is asked first. */
function installedScriptsDir() {
  if (!RECORD.pluginKey || !RECORD.pluginSubpath) return null;
  const reg = join(process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude'), 'plugins', 'installed_plugins.json');
  if (!existsSync(reg)) return null;
  let data;
  try { data = JSON.parse(readFileSync(reg, 'utf8')); }
  catch (e) { throw new Error('cannot read the plugin registry ' + reg + ': ' + e.message); }
  const plugins = (data && typeof data.plugins === 'object' && data.plugins) || data || {};
  const found = [].concat(plugins[RECORD.pluginKey] || [])
    .filter((e) => e && typeof e.installPath === 'string')
    .map((e) => join(e.installPath, RECORD.pluginSubpath))
    .filter((d) => existsSync(join(d, 'lib', 'deck-menu.js')));
  if (!found.length) return null;
  // several scopes may carry the plugin (user / project): the newest editor wins
  return found.map((d) => ({ d, v: blockVersionIn(d) })).sort((a, b) => b.v - a.v)[0].d;
}

/** Resolve and validate the nbg-design scripts directory — explicit flag, environment, plugin registry,
 *  recorded path; nothing else. */
function resolveScriptsDir(explicit) {
  const installed = explicit || process.env.NBG_DESIGN_SCRIPTS ? null : installedScriptsDir();
  const source = explicit ? '--scripts' : process.env.NBG_DESIGN_SCRIPTS ? 'NBG_DESIGN_SCRIPTS' : installed ? 'the plugin registry' : 'the recorded directory';
  const dir = resolve(process.cwd(), explicit || process.env.NBG_DESIGN_SCRIPTS || installed || RECORD.scriptsDir);
  const need = ['add-deck-menu.mjs', 'verify-deck.mjs', 'export-pdf.mjs', 'lib/deck-menu.js', 'lib/print-layout.js'];
  for (const f of need) {
    if (!existsSync(resolve(dir, f))) {
      throw new Error(\`nbg-design scripts directory (\${source}) is missing \${f}: \${dir}\\n\` +
        '  Point --scripts (or NBG_DESIGN_SCRIPTS) at the nbg-design skill\\'s scripts/ directory — the one that holds add-deck-menu.mjs, verify-deck.mjs and export-pdf.mjs.');
    }
  }
  const version = Number((readFileSync(resolve(dir, 'lib/deck-menu.js'), 'utf8').match(/var VERSION = (\\d+);/) || [])[1]);
  if (!version) throw new Error(\`lib/deck-menu.js in \${dir} has no VERSION marker\`);
  return { dir, source, version };
}

/** The editor block version a deck carries (null when it has none). */
function deckBlockVersion(html) {
  const m = html.match(/<script id="nbg-(?:pdf|deck)-menu(?:-script)?" data-nbg-(?:pdf|deck)-menu="(\\d+)">/);
  return m ? Number(m[1]) : null;
}

function run(label, dir, script, args) {
  console.log(\`\\n▶ \${label}: node \${script} \${args.map((s) => (/\\s/.test(s) ? JSON.stringify(s) : s)).join(' ')}\`);
  const r = spawnSync(process.execPath, [resolve(dir, script), ...args], { stdio: 'inherit' });
  if (r.error) throw new Error(\`\${script} could not start: \${r.error.message}\`);
  return r.status === null ? 1 : r.status;
}

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return \`\${d.getFullYear()}\${p(d.getMonth() + 1)}\${p(d.getDate())}-\${p(d.getHours())}\${p(d.getMinutes())}\${p(d.getSeconds())}\`;
}

async function main() {
  let args;
  try { args = parseArgs(process.argv.slice(2)); }
  catch (e) { console.error('rebuild ERROR: ' + e.message + '\\n'); console.log(USAGE); process.exit(2); }
  if (args.help) { console.log(USAGE); process.exit(0); }
  if (args.pdf && args.noPdf) { console.error('rebuild ERROR: --pdf and --no-pdf exclude each other'); process.exit(2); }

  try {
    const deck = args._[0] ? resolve(process.cwd(), args._[0]) : resolve(HERE, RECORD.deck);
    if (!existsSync(deck)) throw new Error('deck not found: ' + deck);
    const { dir, source, version: shipped } = resolveScriptsDir(args.scripts);
    const html = readFileSync(deck, 'utf8');
    const embedded = deckBlockVersion(html);

    console.log(\`NBG deck rebuild — \${deck}\`);
    console.log(\`  editor block in the deck: \${embedded === null ? 'none' : 'v' + embedded} | the skill ships: v\${shipped} (\${source}: \${dir})\`);
    console.log(\`  delivered with: block v\${RECORD.blockVersion}\${RECORD.pluginVersion ? ', plugin ' + RECORD.pluginVersion : ''} on \${RECORD.generated.slice(0, 10)}\`);

    if (args.check) {
      const current = embedded !== null && embedded >= shipped && html.includes('id="nbg-deck-menu-script"');
      console.log(current ? \`\\nRESULT: CURRENT — the deck carries editor block v\${embedded}; nothing to rebuild.\` : \`\\nRESULT: REBUILD NEEDED — \${embedded === null ? 'the deck has no editor block' : 'the deck carries v' + embedded + ', the skill ships v' + shipped}. Run this script without --check.\`);
      process.exit(current ? 0 : 1);
    }

    // 1 — keep the deck as it was
    if (!args.noBackup) {
      const backup = resolve(dirname(deck), basename(deck).replace(/\\.html?$/i, '') + '.backup-' + stamp() + '.html');
      copyFileSync(deck, backup);
      console.log(\`\\n▶ backup: \${backup}\`);
    }

    // 2 — the editor block: the skill's current one, with the configuration the deck was delivered with
    const { addMenu } = await import(pathToFileURL(resolve(dir, 'add-deck-menu.mjs')).href);
    const r = addMenu(html, RECORD.config || undefined);
    writeFileSync(deck, r.html, 'utf8');
    console.log(\`\\n▶ editor block: v\${r.version} \${r.status}\`);

    // 2b — this script's own record: the directory just used and the versions it produced, rendered by the
    //      skill's CURRENT generator, so the next run neither starts from a stale folder nor stale logic
    const self = fileURLToPath(import.meta.url);
    if (existsSync(resolve(dir, 'write-rebuild-script.mjs'))) {
      const gen = await import(pathToFileURL(resolve(dir, 'write-rebuild-script.mjs')).href);
      if (typeof gen.renderRebuildScript === 'function') {
        const record = { ...RECORD, generated: new Date().toISOString(), scriptsDir: dir, blockVersion: Number(r.version), shippedVersion: Number(r.version) };
        if (typeof gen.findPluginInstall === 'function') Object.assign(record, gen.findPluginInstall(dir));
        if (typeof gen.readPluginVersion === 'function') record.pluginVersion = gen.readPluginVersion(dir);
        writeFileSync(self, gen.renderRebuildScript(record), 'utf8');
        console.log(\`\\n▶ rebuild script: \${basename(self)} now records \${dir}\`);
      }
    }

    // 3 — the strict gate
    if (run('verify', dir, 'verify-deck.mjs', [deck, '--strict']) !== 0) {
      console.log('\\nRESULT: FAIL — the deck does not pass verify-deck.mjs --strict after the rebuild; the PDF was not exported.');
      process.exit(1);
    }

    // 4 — the PDF
    const pdf = args.noPdf ? null : args.pdf ? resolve(process.cwd(), args.pdf) : args._[0] ? resolve(dirname(deck), basename(deck).replace(/\\.html?$/i, '') + '.pdf') : RECORD.pdf ? resolve(HERE, RECORD.pdf) : null;
    if (pdf) {
      const code = run('export PDF', dir, 'export-pdf.mjs', [deck, '-o', pdf, ...RECORD.exportArgs]);
      if (code === 3) {
        console.log(\`\\nRESULT: HTML REBUILT (editor block v\${r.version} \${r.status}) — no browser on this host, the PDF was not exported. Run this script where Chrome/Chromium/Edge exists to refresh \${pdf}.\`);
        process.exit(3);
      }
      if (code !== 0) { console.log('\\nRESULT: FAIL — the PDF export did not pass; the HTML was rebuilt.'); process.exit(1); }
      console.log(\`\\nRESULT: PASS — \${basename(deck)} carries editor block v\${r.version} (\${r.status}), verified, PDF exported to \${pdf}.\`);
    } else {
      console.log(\`\\nRESULT: PASS — \${basename(deck)} carries editor block v\${r.version} (\${r.status}), verified. No PDF export was requested.\`);
    }
    process.exit(0);
  } catch (e) {
    console.error('rebuild ERROR: ' + e.message);
    process.exit(1);
  }
}

main();
`;
}

export function main() {
  let args;
  try { args = parseArgs(process.argv.slice(2)); }
  catch (e) { console.error('write-rebuild-script ERROR: ' + e.message + '\n'); console.log(USAGE); process.exit(2); }
  if (args.help || args._.length !== 1) { console.log(USAGE); process.exit(args.help ? 0 : 2); }
  try {
    const { scriptOut, record } = buildRecord(resolve(process.cwd(), args._[0]), args);
    writeFileSync(scriptOut, renderRebuildScript(record), 'utf8');
    const older = record.blockVersion < record.shippedVersion ? ` (older than the skill's v${record.shippedVersion} — the rebuild will upgrade it)` : '';
    console.log(`rebuild script: ${scriptOut}`);
    console.log(`  deck: ${record.deck} (editor block v${record.blockVersion}${older}${record.pluginVersion ? `, plugin ${record.pluginVersion}` : ''}) | pdf: ${record.pdf || 'none'} | scripts: ${record.scriptsDir}`);
    if (record.pdf && !existsSync(resolve(dirname(scriptOut), record.pdf))) console.log(`  ! ${record.pdf} does not exist yet — export it with export-pdf.mjs before delivery (the rebuild script will write it there).`);
    console.log(`  run later: node "${basename(scriptOut)}"   (after the nbg-design skill was updated; --check only reports)`);
    process.exit(0);
  } catch (e) {
    console.error('write-rebuild-script ERROR: ' + e.message);
    process.exit(1);
  }
}

// Run as a CLI only when invoked directly (real paths: skills are often reached through a symlink).
function isMainModule() {
  if (!process.argv[1]) return false;
  const here = fileURLToPath(import.meta.url);
  const invoked = resolve(process.argv[1]);
  try { return realpathSync(invoked) === realpathSync(here); } catch { return invoked === here; }
}
if (isMainModule()) main();
