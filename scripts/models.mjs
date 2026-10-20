// Builds the shipped room models: assets/models/kenney/*.glb (Kenney Furniture Kit 2.0, CC0,
// as downloaded) -> public/models/kenney/*.glb, compressed with EXT_meshopt_compression
// (meshopt also quantizes and reorders). No Draco, no textures. Run with `npm run models`
// whenever a source model changes; the shipped files are committed.
import { copyFile, mkdir, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { Logger, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, meshopt, prune, weld } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';

const root = join(import.meta.dirname, '..');
const src = join(root, 'assets', 'models', 'kenney');
const out = join(root, 'public', 'models', 'kenney');

await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });

await mkdir(out, { recursive: true });
let before = 0;
let after = 0;
for (const file of (await readdir(src)).filter((f) => f.endsWith('.glb')).sort()) {
  const doc = await io.read(join(src, file));
  doc.setLogger(new Logger(Logger.Verbosity.WARN));
  await doc.transform(dedup(), weld(), prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  await io.write(join(out, file), doc);
  const a = (await stat(join(src, file))).size;
  const b = (await stat(join(out, file))).size;
  before += a;
  after += b;
  console.log(`${file.padEnd(22)} ${String(a).padStart(7)} -> ${String(b).padStart(6)} bytes`);
}
await copyFile(join(src, 'License.txt'), join(out, 'License.txt'));
console.log(`${'total'.padEnd(22)} ${String(before).padStart(7)} -> ${String(after).padStart(6)} bytes`);
