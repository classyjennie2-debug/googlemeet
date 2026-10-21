import { kv } from '@vercel/kv';
import { list } from '@vercel/blob';
import fs from 'fs';
import path from 'path';

const FILE_QUEUE_KEY = 'download_queue';

async function initFromBlob() {
  console.log('Fetching all blobs from Vercel Blob...');
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const { blobs } = await list({ limit: 1000 }, { token });

  if (blobs.length === 0) {
    console.log('No blobs found. Upload files first via Vercel Dashboard or `vercel blob put`.');
    process.exit(1);
  }

  const pathnames = blobs.map(b => b.pathname).filter(p => p.endsWith('.zip'));

  console.log(`Found ${pathnames.length} .zip files in Blob.`);

  const existing = await kv.llen(FILE_QUEUE_KEY);
  if (existing > 0) {
    console.log(`Queue already has ${existing} files. Use --force to reset.`);
    if (!process.argv.includes('--force')) process.exit(0);
    await kv.del(FILE_QUEUE_KEY);
  }

  await kv.rpush(FILE_QUEUE_KEY, ...pathnames);
  const count = await kv.llen(FILE_QUEUE_KEY);
  console.log(`Done. Queue now contains ${count} files.`);
}

async function initFromFileList() {
  const fileListPath = process.argv[2] || path.join(process.cwd(), 'blob-pathnames.txt');

  if (!fs.existsSync(fileListPath)) {
    console.error(`File not found: ${fileListPath}`);
    console.log('Create blob-pathnames.txt with one blob pathname per line');
    process.exit(1);
  }

  const pathnames = fs.readFileSync(fileListPath, 'utf-8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));

  console.log(`Loading ${pathnames.length} pathnames...`);

  const existing = await kv.llen(FILE_QUEUE_KEY);
  if (existing > 0) {
    console.log(`Queue already has ${existing} files. Use --force to reset.`);
    if (!process.argv.includes('--force')) process.exit(0);
    await kv.del(FILE_QUEUE_KEY);
  }

  await kv.rpush(FILE_QUEUE_KEY, ...pathnames);
  const count = await kv.llen(FILE_QUEUE_KEY);
  console.log(`Done. Queue now contains ${count} files.`);
}

if (process.argv.includes('--from-blob')) {
  initFromBlob().catch(console.error);
} else {
  initFromFileList().catch(console.error);
}