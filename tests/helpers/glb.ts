import { readFileSync } from 'node:fs';

/**
 * A tiny GLB reader for tests: parses the JSON and BIN chunks and returns world-space
 * triangles per material, so tests can check model geometry (bounds, shelf heights, the
 * screen face) without three.js or a browser. Supports the subset Kenney's kit uses: one
 * scene, node translation/scale (no rotation), float positions, u16/u32 indices.
 */
export type Vec3 = [number, number, number];
export interface Triangle {
  a: Vec3;
  b: Vec3;
  c: Vec3;
  material: string;
}

interface Json {
  scenes: { nodes: number[] }[];
  nodes: { mesh?: number; children?: number[]; translation?: number[]; scale?: number[]; rotation?: number[] }[];
  meshes: { primitives: { attributes: { POSITION: number }; indices?: number; material?: number }[] }[];
  accessors: { bufferView: number; byteOffset?: number; componentType: number; count: number; type: string }[];
  bufferViews: { byteOffset?: number; byteLength: number; byteStride?: number }[];
  materials?: { name?: string }[];
}

export function readGlb(path: string): { json: Json; bin: Buffer } {
  const b = readFileSync(path);
  if (b.readUInt32LE(0) !== 0x46546c67) throw new Error(`${path}: not a GLB`);
  const jsonLength = b.readUInt32LE(12);
  const json = JSON.parse(b.subarray(20, 20 + jsonLength).toString('utf8')) as Json;
  const binStart = 20 + jsonLength;
  const binLength = b.readUInt32LE(binStart);
  return { json, bin: b.subarray(binStart + 8, binStart + 8 + binLength) };
}

function accessorValues({ json, bin }: ReturnType<typeof readGlb>, index: number): number[][] {
  const acc = json.accessors[index]!;
  const view = json.bufferViews[acc.bufferView]!;
  const size = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[acc.type as 'SCALAR'] ?? 1;
  const bytes = { 5126: 4, 5125: 4, 5123: 2, 5121: 1 }[acc.componentType as 5126]!;
  const stride = view.byteStride ?? size * bytes;
  const base = (view.byteOffset ?? 0) + (acc.byteOffset ?? 0);
  const read = (o: number) =>
    acc.componentType === 5126 ? bin.readFloatLE(o) : acc.componentType === 5125 ? bin.readUInt32LE(o) : acc.componentType === 5123 ? bin.readUInt16LE(o) : bin.readUInt8(o);
  const out: number[][] = [];
  for (let i = 0; i < acc.count; i++) {
    const row: number[] = [];
    for (let k = 0; k < size; k++) row.push(read(base + i * stride + k * bytes));
    out.push(row);
  }
  return out;
}

export function triangles(path: string): Triangle[] {
  const glb = readGlb(path);
  const { json } = glb;
  const out: Triangle[] = [];
  const visit = (index: number, t: Vec3, s: Vec3) => {
    const node = json.nodes[index]!;
    if (node.rotation && node.rotation.some((r, i) => Math.abs(r - (i === 3 ? 1 : 0)) > 1e-6)) {
      throw new Error('node rotation is not supported');
    }
    const ns = (node.scale ?? [1, 1, 1]) as Vec3;
    const nt = (node.translation ?? [0, 0, 0]) as Vec3;
    const ws: Vec3 = [s[0] * ns[0], s[1] * ns[1], s[2] * ns[2]];
    const wt: Vec3 = [t[0] + s[0] * nt[0], t[1] + s[1] * nt[1], t[2] + s[2] * nt[2]];
    if (node.mesh !== undefined) {
      for (const prim of json.meshes[node.mesh]!.primitives) {
        const pos = accessorValues(glb, prim.attributes.POSITION).map((p): Vec3 => [wt[0] + ws[0] * p[0]!, wt[1] + ws[1] * p[1]!, wt[2] + ws[2] * p[2]!]);
        const idx = prim.indices !== undefined ? accessorValues(glb, prim.indices).map((r) => r[0]!) : pos.map((_, i) => i);
        const material = json.materials?.[prim.material ?? -1]?.name ?? '';
        for (let i = 0; i + 2 < idx.length; i += 3) out.push({ a: pos[idx[i]!]!, b: pos[idx[i + 1]!]!, c: pos[idx[i + 2]!]!, material });
      }
    }
    for (const child of node.children ?? []) visit(child, wt, ws);
  };
  for (const root of json.scenes[0]!.nodes) visit(root, [0, 0, 0], [1, 1, 1]);
  return out;
}

export interface Bounds {
  min: Vec3;
  max: Vec3;
}

export function bounds(tris: Triangle[]): Bounds {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const t of tris)
    for (const p of [t.a, t.b, t.c])
      for (let k = 0; k < 3; k++) {
        min[k] = Math.min(min[k]!, p[k]!);
        max[k] = Math.max(max[k]!, p[k]!);
      }
  return { min, max };
}

/** Heights of horizontal, upward-facing surfaces (e.g. shelves), with their total area. */
export function upwardSurfaces(tris: Triangle[]): { y: number; area: number }[] {
  const byY = new Map<number, number>();
  for (const { a, b, c } of tris) {
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = [u[1]! * v[2]! - u[2]! * v[1]!, u[2]! * v[0]! - u[0]! * v[2]!, u[0]! * v[1]! - u[1]! * v[0]!];
    const len = Math.hypot(n[0]!, n[1]!, n[2]!);
    if (len === 0 || n[1]! / len < 0.99) continue;
    const y = Math.round(a[1] * 1000) / 1000;
    byY.set(y, (byY.get(y) ?? 0) + len / 2);
  }
  return [...byY.entries()].map(([y, area]) => ({ y, area })).sort((p, q) => p.y - q.y);
}
