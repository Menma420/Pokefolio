import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { compileTiledMaps } from './lib/compileTiledMaps';

async function main() {
  const root = process.cwd();
  const sourceDir = join(root, 'assets-src', 'maps');
  const outputDir = join(root, 'src', 'content', 'maps');
  const files = (await readdir(sourceDir)).filter((file) => file.endsWith('.tmj') || file.endsWith('.json')).sort();
  const sources = await Promise.all(files.map(async (file) => ({
    id: basename(file).replace(/\.(tmj|json)$/, ''),
    input: JSON.parse(await readFile(join(sourceDir, file), 'utf8')) as unknown,
  })));
  const maps = compileTiledMaps(sources);
  await mkdir(outputDir, { recursive: true });
  await Promise.all(maps.map((map) => writeFile(join(outputDir, `${map.id}.json`), `${JSON.stringify(map, null, 2)}\n`)));
  console.log(`Compiled ${maps.length} Tiled maps to src/content/maps.`);
}

void main();
