require('dotenv').config({ path: './Candidate-Application-Form-main/.env' });
const raw = process.env.GOOGLE_PRIVATE_KEY;
function parsePrivateKey(raw) {
  if (!raw) throw new Error('GOOGLE_PRIVATE_KEY is not set');
  let key = raw.trim();
  if (key.startsWith('"') && key.endsWith('"')) {
    try { key = JSON.parse(key); } catch(e) { key = key.slice(1, -1); }
  }
  key = key.replace(/\\\\n/g, '\n').replace(/\\n/g, '\n');
  const header = '-----BEGIN PRIVATE KEY-----';
  const footer = '-----END PRIVATE KEY-----';
  const body = key.replace(header, '').replace(footer, '').replace(/\s+/g, '');
  const chunks = body.match(/.{1,64}/g) || [];
  return `${header}\n${chunks.join('\n')}\n${footer}\n`;
}

try {
  const parsed = parsePrivateKey(raw);
  const crypto = require('crypto');
  const sign = crypto.createSign('RSA-SHA256');
  sign.update('test');
  sign.sign(parsed, 'base64');
  console.log("SUCCESS");
} catch(e) {
  console.log("ERROR:", e.message);
}
