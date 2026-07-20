import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const distDir = path.join(projectRoot, 'dist');
const assetsDir = path.join(distDir, 'assets');

// 生成されたJS/CSS/PNGアセットを検出して事前キャッシュ対象にする
const assets = [];
if (fs.existsSync(assetsDir)) {
  const files = fs.readdirSync(assetsDir);
  files.forEach(file => {
    if (file.endsWith('.js') || file.endsWith('.css') || file.endsWith('.png')) {
      assets.push(`/assets/${file}`);
    }
  });
}

const swPath = path.join(distDir, 'sw.js');
if (fs.existsSync(swPath)) {
  let swContent = fs.readFileSync(swPath, 'utf8');
  
  // ASSETS_TO_CACHEの配列定義の直後にアセットファイルを挿入して上書き
  const replacement = `const ASSETS_TO_CACHE = [\n  ${assets.map(a => `'${a}'`).join(',\n  ')},\n  '/',\n  '/index.html',\n  '/icon.png',\n  '/manifest.json'\n];`;
  
  swContent = swContent.replace(/const ASSETS_TO_CACHE = \[\s*[\s\S]*?\];/g, replacement);
  
  fs.writeFileSync(swPath, swContent, 'utf8');
  console.log('PWA Assets successfully injected to dist/sw.js:', assets);
} else {
  console.error('dist/sw.js not found!');
}
