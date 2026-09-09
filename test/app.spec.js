import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('offline browser workflow, exports, imports, errors, and clearing', async ({ page, context }) => {
  const external = [];
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await context.route('**/*', route => {
    if (new URL(route.request().url()).hostname !== '127.0.0.1') {
      external.push(route.request().url());
      return route.abort();
    }
    return route.continue();
  });
  await page.goto('/');
  await context.setOffline(true);
  await page.getByLabel('Name or alias').fill('Browser test');
  await page.getByLabel('Private-key passphrase', { exact: true }).first().fill('correct horse battery staple');
  await page.getByLabel('Confirm passphrase').fill('correct horse battery staple');
  await page.getByRole('button', { name: 'Generate key pair', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Key pair ready');
  const saved = {};
  for (const kind of ['public', 'private', 'revocation']) {
    const downloadPromise = page.waitForEvent('download');
    await page.locator(`#save-${kind}`).click();
    const download = await downloadPromise;
    saved[kind] = await readFile(await download.path());
    expect(saved[kind].toString()).toContain('-----BEGIN PGP');
  }
  await page.getByRole('button', { name: 'Clear session' }).click();
  await page.getByRole('button', { name: '2 · Encrypt', exact: true }).click();
  await page.locator('#public-file').setInputFiles({ name: 'public.asc', mimeType: 'text/plain', buffer: saved.public });
  await expect(page.getByRole('status')).toContainText('Key loaded');
  await page.getByLabel('Text to encrypt', { exact: true }).fill('A private message 🌱\nSecond line.');
  await page.getByRole('button', { name: 'Encrypt text', exact: true }).click();
  await expect(page.locator('#encrypted')).toHaveValue(/BEGIN PGP MESSAGE/);
  const encrypted = await page.locator('#encrypted').inputValue();
  await page.getByRole('button', { name: '3 · Decrypt', exact: true }).click();
  await page.locator('#private-file').setInputFiles({ name: 'private.asc', mimeType: 'text/plain', buffer: saved.private });
  await expect(page.getByRole('status')).toContainText('Key loaded');
  await page.locator('#ciphertext').fill(encrypted);
  await page.locator('#passphrase').fill('wrong password');
  await page.getByRole('button', { name: 'Decrypt text', exact: true }).click();
  await expect(page.locator('#status')).toHaveAttribute('data-error', 'true');
  await expect(page.locator('#decrypted')).toHaveValue('');
  await page.locator('#passphrase').fill('correct horse battery staple');
  await page.getByRole('button', { name: 'Decrypt text', exact: true }).click();
  await expect(page.locator('#decrypted')).toHaveValue('A private message 🌱\nSecond line.');
  await expect(page.locator('#passphrase')).toHaveValue('');
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
  await page.getByRole('button', { name: 'Clear session' }).click();
  expect(await page.locator('input, textarea').evaluateAll(elements => elements.every(el => el.value === ''))).toBe(true);
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});

test('server serves only app assets and refuses foreign hosts and writes', async ({ request, page }) => {
  for (const path of ['/package.json', '/src/crypto.js', '/.git/config']) {
    expect((await request.get(path)).status()).toBe(404);
  }
  expect((await request.get('/', { headers: { Host: 'example.com' } })).status()).toBe(404);
  expect((await request.post('/')).status()).toBe(404);
  const response = await request.get('/');
  expect(response.headers()['content-security-policy']).toContain("connect-src 'none'");
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
