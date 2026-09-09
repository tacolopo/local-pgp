import { generateKeys, encryptText, decryptText } from './crypto.js';
const $ = id => document.getElementById(id);
let keys;
let busy = false;
function status(message, error = false) {
  $('status').textContent = message;
  $('status').dataset.error = String(error);
}
function panel(name) {
  for (const button of document.querySelectorAll('[data-panel]')) {
    const active = button.dataset.panel === name;
    button.setAttribute('aria-pressed', String(active));
    $(button.dataset.panel).hidden = !active;
  }
  status('');
}
for (const button of document.querySelectorAll('[data-panel]')) button.addEventListener('click', () => panel(button.dataset.panel));
async function run(message, task) {
  if (busy) return;
  busy = true;
  document.querySelectorAll('button, input, textarea').forEach(el => { el.disabled = true; });
  status(message);
  try { await task(); } catch (error) { status(error.message || 'Operation failed. Check your inputs and try again.', true); }
  finally {
    busy = false;
    document.querySelectorAll('button, input, textarea').forEach(el => { el.disabled = false; });
  }
}
$('generate-form').addEventListener('submit', event => {
  event.preventDefault();
  if ($('new-passphrase').value !== $('confirm-passphrase').value) return status('The passphrases do not match.', true);
  if (keys && !window.confirm('Replace this session’s key pair? Download the current keys first.')) return;
  run('Generating your keys…', async () => {
    keys = await generateKeys($('name').value, $('new-passphrase').value);
    $('fingerprint').textContent = keys.fingerprint.match(/.{1,4}/g).join(' ');
    $('public-key').value = keys.publicKey;
    $('private-key').value = keys.privateKey;
    $('new-passphrase').value = $('confirm-passphrase').value = $('passphrase').value = '';
    $('encrypted').value = $('decrypted').value = '';
    $('key-results').hidden = false;
    status('Key pair ready. Save your keys; they are also loaded into Encrypt and Decrypt.');
  });
});
$('encrypt-form').addEventListener('submit', event => {
  event.preventDefault();
  $('encrypted').value = '';
  run('Encrypting…', async () => {
    $('encrypted').value = await encryptText($('plaintext').value, $('public-key').value);
    status('Encrypted. Only a matching private key can decrypt this message.');
  });
});
$('decrypt-form').addEventListener('submit', event => {
  event.preventDefault();
  $('decrypted').value = '';
  run('Decrypting…', async () => {
    try {
      $('decrypted').value = await decryptText($('ciphertext').value, $('private-key').value, $('passphrase').value);
      status('Decrypted. This utility does not verify the sender’s identity.');
    } finally { $('passphrase').value = ''; }
  });
});
for (const type of ['public', 'private']) {
  $(`${type}-file`).addEventListener('change', event => {
    const file = event.target.files[0];
    if (!file) return;
    run('Loading key…', async () => {
      try {
        if (file.size > 1024 * 1024) throw new Error('Key file is too large (maximum 1 MB).');
        const value = await file.text();
        if (!value.includes(`-----BEGIN PGP ${type.toUpperCase()} KEY BLOCK-----`)) throw new Error(`Choose an armored ${type} key file (.asc).`);
        $(`${type}-key`).value = value;
        $(type === 'public' ? 'encrypted' : 'decrypted').value = '';
        status('Key loaded for this session.');
      } finally { event.target.value = ''; }
    });
  });
}
function download(text, filename) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/pgp-keys' }));
  const link = document.createElement('a');
  link.href = url; link.download = filename;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
for (const [kind, property] of [['public', 'publicKey'], ['private', 'privateKey'], ['revocation', 'revocationCertificate']]) {
  $(`save-${kind}`).addEventListener('click', () => {
    if (keys) download(keys[property], `local-pgp-${keys.fingerprint.slice(-16)}-${kind}.asc`);
  });
}
for (const button of document.querySelectorAll('[data-copy]')) {
  button.addEventListener('click', async () => {
    const text = $(button.dataset.copy).value;
    if (!text) return status('There is no result to copy yet.', true);
    try { await navigator.clipboard.writeText(text); status('Copied to clipboard. Clipboard contents remain after clearing this session.'); }
    catch { status('Clipboard access is unavailable. Select the result and copy it manually.', true); }
  });
}
function clear() {
  keys = undefined;
  document.querySelectorAll('input, textarea').forEach(el => { el.value = ''; });
  $('key-results').hidden = true;
  $('fingerprint').textContent = '';
  panel('generate');
}
$('clear').addEventListener('click', () => { clear(); status('Session cleared. Downloaded files and clipboard contents are unchanged.'); });
window.addEventListener('pagehide', clear);
