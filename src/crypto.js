import * as pgp from 'openpgp';

export async function generateKeys(name, passphrase) {
  if (!name.trim()) throw new Error('Enter a name or alias.');
  if (passphrase.length < 12) throw new Error('Use a passphrase of at least 12 characters.');
  const keys = await pgp.generateKey({ type: 'ecc', curve: 'curve25519Legacy', userIDs: [{ name: name.trim() }], passphrase, format: 'armored' });
  const key = await pgp.readKey({ armoredKey: keys.publicKey });
  return { ...keys, fingerprint: key.getFingerprint().toUpperCase() };
}

export async function encryptText(text, publicKey) {
  if (!text.length) throw new Error('Enter text to encrypt.');
  const key = await pgp.readKey({ armoredKey: publicKey });
  if (key.isPrivate()) throw new Error('Use a public key for encryption.');
  return pgp.encrypt({ message: await pgp.createMessage({ text }), encryptionKeys: key });
}

export async function importEncryptedMessage(bytes) {
  const text = new TextDecoder().decode(bytes).trim();
  const armored = text.startsWith('-----BEGIN PGP MESSAGE-----');
  try {
    await pgp.readMessage(armored
      ? { armoredMessage: text }
      : { binaryMessage: bytes });
    return armored ? text : pgp.armor(pgp.enums.armor.message, bytes);
  } catch {
    throw new Error('Choose a valid PGP message file: binary (.gpg/.pgp) or armored text (.asc/.txt).');
  }
}

export async function decryptText(text, privateKey, passphrase) {
  let key = await pgp.readPrivateKey({ armoredKey: privateKey });
  if (!key.isDecrypted()) key = await pgp.decryptKey({ privateKey: key, passphrase });
  const { data } = await pgp.decrypt({ message: await pgp.readMessage({ armoredMessage: text }), decryptionKeys: key, format: 'utf8' });
  return data;
}
