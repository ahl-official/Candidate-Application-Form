const fs = require('fs');
const path = require('path');

/**
 * vercel dev sometimes skips .env.local for serverless handlers when a
 * multiline GOOGLE_PRIVATE_KEY is present. Load the Apps Script URL ourselves.
 */
function ensureAppsScriptEnv_() {
  if (process.env.GOOGLE_APPS_SCRIPT_URL) {
    return;
  }

  const candidates = ['.env.local', '.env'];
  for (const file of candidates) {
    try {
      const full = path.join(process.cwd(), file);
      if (!fs.existsSync(full)) continue;
      const text = fs.readFileSync(full, 'utf8');
      for (const rawLine of text.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;
        const eq = line.indexOf('=');
        if (eq === -1) continue;
        const key = line.slice(0, eq).trim();
        if (key !== 'GOOGLE_APPS_SCRIPT_URL' && key !== 'HIREOS_APPS_SCRIPT_URL') {
          continue;
        }
        let value = line.slice(eq + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (value) {
          process.env[key] = value;
          return;
        }
      }
    } catch {
      // ignore and try next file
    }
  }
}

/**
 * Shared Apps Script caller for HireOS psychometric actions.
 * Uses GOOGLE_APPS_SCRIPT_URL (same deployment as hireos-web VITE_GOOGLE_APP_SCRIPT_URL).
 */
async function callAppsScript(payload) {
  ensureAppsScriptEnv_();

  const url = (
    process.env.GOOGLE_APPS_SCRIPT_URL ||
    process.env.HIREOS_APPS_SCRIPT_URL ||
    ''
  ).trim();

  if (!url) {
    const err = new Error(
      'Assessment service is temporarily unavailable. Please try again later.'
    );
    err.code = 'APPS_SCRIPT_URL_MISSING';
    throw err;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
    redirect: 'follow',
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    const err = new Error('Invalid response from HireOS Apps Script.');
    err.code = 'APPS_SCRIPT_INVALID_JSON';
    err.details = text.slice(0, 300);
    throw err;
  }

  return data;
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = { callAppsScript, setCors };
