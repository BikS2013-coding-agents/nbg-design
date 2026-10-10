// NBG Design — Google Drive / Google Slides calls for export-gslides.mjs and compare-pptx.mjs.
//
// Every call goes through the Google Workspace CLI (`gws`, https://github.com/googleworkspace/cli), which
// owns the OAuth sign-in and the token cache: nothing here reads or stores credentials. The account
// needs the Drive and Slides scopes (`gws auth login` asks for them). No other dependency.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { dirname, basename } from 'node:path';

export const SLIDES_MIME = 'application/vnd.google-apps.presentation';
const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

/** The gws binary: explicit path, else `gws` on PATH. Returns null when there is none. */
export function findGws(explicit) {
  if (explicit) return existsSync(explicit) ? explicit : null;
  const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['gws'], { encoding: 'utf8' });
  return r.status === 0 && r.stdout.trim() ? r.stdout.trim().split(/\r?\n/)[0].trim() : null;
}

function call(gws, args, timeout, cwd) {
  const r = spawnSync(gws, args, { encoding: 'utf8', timeout, cwd, maxBuffer: 64 * 1024 * 1024 });
  const out = (r.stdout || '').trim();
  const json = out.slice(out.indexOf('{'));
  let data = null;
  try { data = json ? JSON.parse(json) : null; } catch { /* not JSON */ }
  if (r.status !== 0 || (data && data.error)) {
    const msg = data && data.error ? (data.error.message || JSON.stringify(data.error)) : (r.stderr || out || `exit ${r.status}`).trim().slice(-500);
    throw new Error(`gws ${args.slice(0, 3).join(' ')}: ${msg}`);
  }
  return data;
}

/** Fails with the reason when gws is not signed in with the Drive and Slides scopes. */
export function checkAuth(gws, timeout = 60000) {
  const st = call(gws, ['auth', 'status'], timeout);
  const scopes = (st && st.scopes) || [];
  const need = ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/presentations'];
  const missing = need.filter((s) => !scopes.includes(s));
  if (missing.length) throw new Error(`gws is not signed in with ${missing.join(', ')} — run: gws auth login`);
  return st.user || null;
}

/** Uploads a .pptx and has Drive convert it to a Google Slides presentation. Returns { id, name }. */
export function uploadPptxAsSlides(gws, pptx, { name, folder, timeout = 600000 }) {
  const meta = { name, mimeType: SLIDES_MIME };
  if (folder) meta.parents = [folder];
  const r = call(gws, ['drive', 'files', 'create', '--json', JSON.stringify(meta), '--params', JSON.stringify({ fields: 'id,name', supportsAllDrives: true }),
    '--upload', basename(pptx), '--upload-content-type', PPTX_MIME], timeout, dirname(pptx));
  if (!r || !r.id) throw new Error('Drive returned no file id for the upload');
  return r;
}

export function getPresentation(gws, id, timeout = 120000) {
  return call(gws, ['slides', 'presentations', 'get', '--params', JSON.stringify({ presentationId: id })], timeout);
}

/** Slides API batchUpdate, in chunks (the API takes a bounded request list). */
export function batchUpdate(gws, id, requests, timeout = 300000) {
  const replies = [];
  for (let i = 0; i < requests.length; i += 400) {
    const r = call(gws, ['slides', 'presentations', 'batchUpdate', '--params', JSON.stringify({ presentationId: id }), '--json', JSON.stringify({ requests: requests.slice(i, i + 400) })], timeout);
    replies.push(...((r && r.replies) || []));
  }
  return replies;
}

/** Drive export of a Google file (application/pdf, …) to a local path. */
export function exportFile(gws, id, mimeType, out, timeout = 600000) {
  // gws writes only below its working directory
  call(gws, ['drive', 'files', 'export', '--params', JSON.stringify({ fileId: id, mimeType }), '-o', basename(out)], timeout, dirname(out));
  if (!existsSync(out)) throw new Error('Drive export wrote no file');
  return out;
}

export function deleteFile(gws, id, timeout = 120000) {
  // an empty response is saved by gws as download.html in its working directory: run it in a throw-away one
  const box = mkdtempSync(join(tmpdir(), 'nbg-gws-'));
  try { call(gws, ['drive', 'files', 'delete', '--params', JSON.stringify({ fileId: id, supportsAllDrives: true })], timeout, box); }
  finally { rmSync(box, { recursive: true, force: true }); }
}

/** A presentation id from an id or any docs.google.com/presentation/d/<id>/… URL; null otherwise. */
export function presentationId(s) {
  const m = String(s || '').match(/docs\.google\.com\/presentation\/d\/([A-Za-z0-9_-]{20,})/);
  if (m) return m[1];
  return /^[A-Za-z0-9_-]{25,}$/.test(String(s || '')) && !/\.pptx$/i.test(s) ? s : null;
}

export const slidesUrl = (id) => `https://docs.google.com/presentation/d/${id}/edit`;
