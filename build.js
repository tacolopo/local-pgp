import { build } from 'esbuild';
import { mkdir, copyFile } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
await build({ entryPoints: ['src/app.js'], bundle: true, minify: true, format: 'esm', outdir: 'dist', legalComments: 'linked' });
await Promise.all(['index.html', 'style.css'].map(name => copyFile(`src/${name}`, `dist/${name}`)));
