import { kv } from '@vercel/kv';
import fs from 'fs';
import path from 'path';

async function initFilePool() {
  const fileListPath = process.argv[2] || path.join(process.cwd(), 'file-list.txt');

  if (!fs.existsSync(fileListPath)) {
    console.error(`File list not found: ${fileListPath}`);
    console.log('Create a file-list.txt with one filename per line (e.g., zip1.zip, zip2.zip, ...)');
    process.exit(1);
  }

  const files = fs.readFileSync(fileListPath, 'utf-8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));

  console.log(`Initializing pool with ${files.length} files...`);

  const existing = await kv.scard('file_pool');
  if (existing > 0) {
    console.log(`Pool already has ${existing} files. Use --force to reset.`);
    if (!process.argv.includes('--force')) process.exit(0);
    await kv.del('file_pool');
  }

  await kv.sadd('file_pool', ...files);
  const count = await kv.scard('file_pool');
  console.log(`Done. Pool now contains ${count} files.`);
}

initFilePool().catch(console.error);