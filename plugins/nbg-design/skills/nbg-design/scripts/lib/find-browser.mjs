// NBG Design — shared Chrome/Chromium/Edge locator for the browser-backed scripts
// (screenshot-deck.mjs, export-pdf.mjs). Zero dependencies.
//
// Returns the executable path, `null` when no browser exists on the host, or
// `{ error }` when an explicit path was given but is not executable (an explicit
// --browser flag is authoritative: honor it or fail clearly, never fall back).

import { accessSync, constants } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

export function findBrowser(explicit) {
  if (explicit) {
    try { accessSync(explicit, constants.X_OK); return explicit; }
    catch { return { error: `--browser path is not an executable: ${explicit}` }; }
  }
  // environment first, then the install locations of THIS platform only
  const envs = [process.env.NBG_BROWSER, process.env.CHROME_BIN, process.env.CHROME_PATH, process.env.BROWSER];
  const candidates = [...envs, ...platformCandidates()].filter(Boolean);
  for (const c of candidates) {
    try { accessSync(c, constants.X_OK); return c; } catch { /* keep looking */ }
  }
  // PATH lookup as a last resort
  const win = process.platform === 'win32';
  const names = win
    ? ['chrome.exe', 'msedge.exe', 'brave.exe', 'chromium.exe']
    : ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'chrome', 'microsoft-edge'];
  for (const name of names) {
    const r = spawnSync(win ? 'where' : 'which', [name], { encoding: 'utf8' });
    // `where` answers with CRLF line ends: split on either, or the path keeps a trailing \r and is not found
    if (r.status === 0 && r.stdout.trim()) return r.stdout.trim().split(/\r?\n/)[0].trim();
  }
  return null;
}

function platformCandidates() {
  if (process.platform === 'darwin') return [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  ];
  if (process.platform === 'win32') return windowsCandidates();
  return [   // Linux and the other Unixes
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/chrome',
    '/snap/bin/chromium', '/usr/bin/microsoft-edge', '/usr/bin/microsoft-edge-stable',
  ];
}

/** Windows install locations, built from the environment (never a guessed drive letter): the per-machine and
 *  per-user folders of Chrome, Edge (on every Windows 10/11), Brave and Chromium. */
function windowsCandidates() {
  const roots = [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA].filter(Boolean);
  const rel = [
    ['Google', 'Chrome', 'Application', 'chrome.exe'],
    ['Microsoft', 'Edge', 'Application', 'msedge.exe'],
    ['BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'],
    ['Chromium', 'Application', 'chrome.exe'],
  ];
  // browser order outranks folder order: Chrome wherever it is, before Edge (Chrome is what the exporter is tested with)
  return rel.flatMap((parts) => roots.map((root) => join(root, ...parts)));
}

export const NO_BROWSER_EXIT_CODE = 3;
