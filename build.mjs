import { mkdir, cp, copyFile, rm } from 'node:fs/promises';
await rm('dist', { recursive: true, force: true });
await mkdir('dist/vendor', { recursive: true });
for (const name of ['index.html', 'app.js', 'styles.css']) await copyFile(name, `dist/${name}`);
await cp('node_modules/@ffmpeg/ffmpeg/dist/esm', 'dist/vendor/ffmpeg', { recursive: true });
await cp('node_modules/@ffmpeg/core/dist/esm', 'dist/vendor/core', { recursive: true });
await copyFile('.nojekyll', 'dist/.nojekyll');
console.log('Static site built in dist/');
