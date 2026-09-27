// Uso: node scripts/check-links.ts [dist]
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { brokenLinks, parseHtml, pathFromFile, type ParsedPage } from '../src/lib/links.ts';

async function listFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true, recursive: true });
  return entries.filter((entry) => entry.isFile()).map((entry) => join(entry.parentPath, entry.name));
}

const dist = process.argv[2] ?? 'dist';
const files = await listFiles(dist);
const pages: ParsedPage[] = await Promise.all(
  files
    .filter((file) => file.endsWith('.html'))
    .map(async (file) => parseHtml(pathFromFile(relative(dist, file)), await readFile(file, 'utf-8'))),
);
const assets = new Set(files.filter((file) => !file.endsWith('.html')).map((file) => `/${relative(dist, file)}`));
const problems = brokenLinks(pages, assets);

if (problems.length > 0) {
  console.error(`Enlaces rotos (${String(problems.length)}):\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log(`Enlaces internos correctos en ${String(pages.length)} páginas.`);
