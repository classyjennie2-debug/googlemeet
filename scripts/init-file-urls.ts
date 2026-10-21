import { kv } from '@vercel/kv';
import fs from 'fs';
import path from 'path';

const FILE_URLS_KEY = 'file_urls';

async function initFileUrls() {
  const fileListPath = process.argv[2] || path.join(process.cwd(), 'file-urls.txt');

  if (!fs.existsSync(fileListPath)) {
    console.error(`File not found: ${fileListPath}`);
    console.log('Create file-urls.txt with one DIRECT DOWNLOAD URL per line');
    process.exit(1);
  }

  const urls = fs.readFileSync(fileListPath, 'utf-8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));

  console.log(`Loading ${urls.length} file URLs...`);

  const existing = await kv.llen(FILE_URLS_KEY);
  if (existing > 0) {
    console.log(`List already has ${existing} URLs. Use --force to reset.`);
    if (!process.argv.includes('--force')) process.exit(0);
    await kv.del(FILE_URLS_KEY);
  }

  await kv.rpush(FILE_URLS_KEY, ...urls);
  const count = await kv.llen(FILE_URLS_KEY);
  console.log(`Done. Pool now contains ${count} URLs.`);
}

initFileUrls().catch(console.error);