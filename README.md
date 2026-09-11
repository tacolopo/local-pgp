# Local PGP

A small local browser app for generating PGP keys and encrypting or decrypting text. Uses OpenPGP.js, bundled locally with no CDN, analytics, accounts, or external runtime requests.

## Run

Install [Node.js](https://nodejs.org/) 22 or newer, then:

```sh
git clone https://github.com/tacolopo/local-pgp.git
cd local-pgp
npm ci
npm start
```

Open **http://127.0.0.1:8787**. Stop the server with Ctrl+C. Setup requires internet access; subsequent starts and all cryptographic operations work offline. Use `PORT=8888 npm start` to select a different port. Open the localhost URL rather than opening the HTML file directly.

## Use

1. **Generate keys:** enter a name or alias and a passphrase of at least 12 characters. Save your public key, protected private key, and revocation certificate. The generated keys are also loaded into the other two screens.
2. **Encrypt:** paste or import the recipient’s armored public key, enter text, and click **Encrypt text**. Copy the result to share. Use your own public key to encrypt for yourself.
3. **Decrypt:** paste or import your armored private key and enter its passphrase. Paste the encrypted message or import a binary `.gpg`/`.pgp` file or an armored `.asc`/`.txt` file (up to 10 MB), then click **Decrypt text**. Imported messages appear in the text box and stay on your device.

The revocation certificate is for use in other PGP software if a key is lost or compromised. Keep it private. This app does not publish or apply revocations.

## Data handling and limits

- Cryptographic operations run in the browser. The server binds to `127.0.0.1`, serves a fixed set of app assets, and has no upload or storage API.
- Keys and messages are held in page memory, without localStorage, sessionStorage, cookies, or a service worker. Download keys explicitly before closing the page.
- **Clear session** clears the app’s fields and key references. It does not delete downloads, clear the system clipboard, or guarantee secure erasure of browser memory. Browser extensions and a compromised computer can still access sensitive data.
- Generated private keys require a passphrase. Decryption clears the passphrase field after each attempt. There is no recovery if you lose your private key or its passphrase.
- Key generation uses OpenPGP.js’s Curve25519 legacy-format ECC option for compatibility with existing OpenPGP software. Imports accept ASCII-armored keys; binary keyrings and hardware keys are not supported.
- This utility encrypts and decrypts text. It does not sign messages or verify sender identity. Confirm a recipient’s key fingerprint through a trusted channel before using it.
- This app has automated tests but has not received an independent security audit.

## Development

```sh
npm run build
npm test
npx playwright install chromium
npm run test:browser
```

Browser tests cover an offline round trip, key export/import, wrong passphrases, clearing, storage, network requests, and the local server’s access restrictions. Unit tests cover Unicode text, unrelated keys, malformed inputs, and modified ciphertext.

`src/crypto.js` wraps OpenPGP.js; `src/app.js` handles the interface. `build.js` bundles assets into the ignored `dist/` directory; `server.js` serves them. Dependency versions and the lockfile are committed. OpenPGP.js is licensed under LGPL-3.0; its bundled legal notices are retained in the build output. See [OpenPGP.js](https://github.com/openpgpjs/openpgpjs).
