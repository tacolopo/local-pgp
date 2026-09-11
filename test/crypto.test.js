import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unarmor } from 'openpgp';
import { generateKeys, encryptText, decryptText, importEncryptedMessage } from '../src/crypto.js';
const passphrase = 'a long test passphrase';
const keys = await generateKeys('Test only', passphrase);
test('protected keys round-trip Unicode and multiline text', async () => {
  const text = 'Hello 🌍\n秘密\n  keep spaces  ';
  const encrypted = await encryptText(text, keys.publicKey);
  assert.match(encrypted, /BEGIN PGP MESSAGE/);
  assert.equal(await decryptText(encrypted, keys.privateKey, passphrase), text);
  assert.match(keys.revocationCertificate, /BEGIN PGP PUBLIC KEY BLOCK/);
});
test('rejects wrong passphrase and unrelated key', async () => {
  const encrypted = await encryptText('secret', keys.publicKey);
  await assert.rejects(decryptText(encrypted, keys.privateKey, 'wrong password'));
  const other = await generateKeys('Someone else', passphrase);
  await assert.rejects(decryptText(encrypted, other.privateKey, passphrase));
});
test('rejects malformed keys, messages and weak generation inputs', async () => {
  await assert.rejects(generateKeys(' ', passphrase));
  await assert.rejects(generateKeys('Test', 'short'));
  await assert.rejects(encryptText('hello', 'not a key'));
  await assert.rejects(encryptText('hello', keys.privateKey));
  await assert.rejects(decryptText('not a message', keys.privateKey, passphrase));
});
test('rejects modified ciphertext', async () => {
  const encrypted = await encryptText('secret', keys.publicKey);
  const lines = encrypted.split('\n');
  const index = lines.findIndex(line => /^[A-Za-z0-9+/]{40,}/.test(line));
  const line = lines[index + 1];
  lines[index + 1] = line.slice(0, 15) + (line[15] === 'A' ? 'B' : 'A') + line.slice(16);
  await assert.rejects(decryptText(lines.join('\n'), keys.privateKey, passphrase));
});
test('imports binary and armored files without changing the decrypted text', async () => {
  const text = 'Imported message 🔐\n秘密\n  keep spaces  ';
  const armored = await encryptText(text, keys.publicKey);
  const { data: binary } = await unarmor(armored);
  for (const bytes of [binary, new TextEncoder().encode('\uFEFF\n' + armored.replace(/\n/g, '\r\n') + '\n')]) {
    const imported = await importEncryptedMessage(bytes);
    assert.match(imported, /^-----BEGIN PGP MESSAGE-----/);
    assert.equal(await decryptText(imported, keys.privateKey, passphrase), text);
  }
});
test('rejects empty, malformed and key files as encrypted messages', async () => {
  for (const value of ['', 'not encrypted', '-----BEGIN PGP MESSAGE-----\ninvalid', keys.publicKey, keys.privateKey]) {
    await assert.rejects(importEncryptedMessage(new TextEncoder().encode(value)), /Choose a valid PGP message file/);
  }
  await assert.rejects(importEncryptedMessage(new Uint8Array([0xff, 0x00, 0x80])), /Choose a valid PGP message file/);
});
