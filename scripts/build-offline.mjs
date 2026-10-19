import { build } from 'vite';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const bundle = await build({
  root,
  configFile: false,
  logLevel: 'warn',
  build: {
    write: false,
    lib: { entry: path.join(root, 'src/main.js'), name: 'FreeCamper', formats: ['iife'] },
  },
});
const outputs = Array.isArray(bundle) ? bundle : [bundle];
const chunk = outputs.flatMap(result => result.output).find(item => item.type === 'chunk' && item.isEntry);
if (!chunk) throw new Error('Offline game bundle was not generated.');
let html = await readFile(path.join(root, 'index.html'), 'utf8');
const css = await readFile(path.join(root, 'src/style.css'), 'utf8');
html = html.replace('</head>', `<style>${css}</style></head>`);
// This edition embeds all assets and does not need a local HTTP server.
html = html.replace("if (location.protocol === 'file:') window.showStartupFailure(new Error('Local server required: npm ci, then npm start'));", '');
html = html.replace('처음 실행한다면 프로젝트 폴더에서 <code>npm ci</code> 후 <code>npm start</code>를 실행하세요. 브라우저가 열리면 <strong>게임 시작</strong>을 누르세요.', '이 파일은 인터넷 연결과 설치 없이 실행됩니다. 3D 그래픽을 지원하는 Chrome 또는 Edge로 열어 주세요.');
const safeCode = chunk.code.replace(/<\/script/gi, '<\\/script');
html = html.replace(/<script type="module"[^>]*><\/script>/, () => `<script>try {\n${safeCode}\ndocument.getElementById('startup').hidden = true;\n} catch(error) { window.showStartupFailure(error); }<\/script>`);
await mkdir(path.join(root, 'dist-offline'), { recursive: true });
await writeFile(path.join(root, 'dist-offline/Free-Camper.html'), html);
console.log('Offline game: dist-offline/Free-Camper.html (open directly in Chrome or Edge)');
