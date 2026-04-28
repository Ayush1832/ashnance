/**
 * TC-AUTH-016: Wallet login (Phantom) — fully automated via programmatic keypair
 * TC-AUTH-018: Link wallet to existing account — fully automated
 */
const nacl = require('./backend/node_modules/tweetnacl');
const bs58 = require('./backend/node_modules/bs58');

const TOKENS_FILE = 'C:\\Users\\LENOVO\\Desktop\\ashnance\\.tokens.json';
const BASE = 'https://api.ashnance.com';

const fs = require('fs');
const https = require('https');

function loadTokens() {
  return JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8'));
}
function saveTokens(d) {
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(d, null, 2));
}

function api(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const url = new URL(BASE + path);
    const opts = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: { ...headers, ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}) }
    };
    const req = https.request(opts, res => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => { try { resolve(JSON.parse(buf)); } catch { resolve(buf); } });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function refreshUser(ak, rk) {
  const d = loadTokens();
  const r = await api('POST', '/api/auth/refresh', { refreshToken: d[rk] });
  if (r?.data?.accessToken) {
    d[ak] = r.data.accessToken;
    d[rk] = r.data.refreshToken;
    saveTokens(d);
  }
  return loadTokens()[ak];
}

async function main() {
  // Generate a fresh Ed25519 keypair (simulates Phantom's keypair)
  const kp = nacl.sign.keyPair();
  const publicKeyBytes = kp.publicKey;
  const secretKey = kp.secretKey;

  // Encode public key as base58 (Solana address format)
  const publicKey = bs58.default ? bs58.default.encode(publicKeyBytes) : bs58.encode(publicKeyBytes);
  console.log(`Generated keypair: ${publicKey}`);

  // Build the sign-in message with current timestamp
  const message = `Sign in to Ashnance\ntimestamp:${Date.now()}`;
  const msgBytes = new TextEncoder().encode(message);

  // Sign with nacl Ed25519 detached
  const sigBytes = nacl.sign.detached(msgBytes, secretKey);
  const signature = Array.from(sigBytes);

  // ---- TC-AUTH-016: Wallet login (new account created automatically) ----
  console.log('\n=== TC-AUTH-016: Wallet login ===');
  const loginRes = await api('POST', '/api/auth/wallet', { publicKey, signature, message });
  console.log('Response:', JSON.stringify(loginRes, null, 2));

  if (loginRes?.data?.accessToken) {
    console.log('[PASS] TC-AUTH-016: wallet login succeeded — JWT issued, user auto-created');
    console.log(`  username: ${loginRes.data.user?.username || loginRes.data.username}`);
  } else {
    console.log(`[FAIL] TC-AUTH-016: ${loginRes?.error || JSON.stringify(loginRes)}`);
  }

  // ---- TC-AUTH-018: Link wallet to existing account (testbuyer_a) ----
  console.log('\n=== TC-AUTH-018: Link wallet to existing account ===');

  const ta = await refreshUser('TA', 'RA');

  // Generate a DIFFERENT keypair for the link (must not already be used)
  const kp2 = nacl.sign.keyPair();
  const pubKey2 = bs58.default ? bs58.default.encode(kp2.publicKey) : bs58.encode(kp2.publicKey);
  const msg2 = `Sign in to Ashnance\ntimestamp:${Date.now()}`;
  const sig2 = Array.from(nacl.sign.detached(new TextEncoder().encode(msg2), kp2.secretKey));

  console.log(`Linking wallet: ${pubKey2}`);
  const linkRes = await api('POST', '/api/auth/link-wallet', { publicKey: pubKey2, signature: sig2, message: msg2 }, ta);
  console.log('Response:', JSON.stringify(linkRes, null, 2));

  if (linkRes?.success) {
    console.log('[PASS] TC-AUTH-018: wallet linked to testbuyer_a account');
  } else {
    console.log(`[FAIL] TC-AUTH-018: ${linkRes?.error}`);
  }
}

main().catch(console.error);
