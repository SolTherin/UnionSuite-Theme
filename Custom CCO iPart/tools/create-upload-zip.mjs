// Small ZIP writer for three fixed build artifacts. Uses Node only; no shell or execution-policy dependency.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync } from 'node:zlib';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const names = ['display.html', 'configure.html', 'README.txt'];
const local = [], central = [];
let offset = 0;
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
for (const name of names) {
  const file = fs.readFileSync(path.join(root, 'upload/UnionSuite-CCO', name));
  if (file.some(byte => byte > 127)) throw new Error(`Non-ASCII byte in upload artifact: ${name}`);
  const filename = Buffer.from(`UnionSuite-CCO/${name}`);
  const compressed = deflateRawSync(file), crc = crc32(file);
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0); header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0x800, 6); header.writeUInt16LE(8, 8);
  header.writeUInt16LE(((2026 - 1980) << 9) | (1 << 5) | 1, 12);
  header.writeUInt32LE(crc, 14); header.writeUInt32LE(compressed.length, 18);
  header.writeUInt32LE(file.length, 22); header.writeUInt16LE(filename.length, 26);
  local.push(header, filename, compressed);
  const entry = Buffer.alloc(46);
  entry.writeUInt32LE(0x02014b50, 0); entry.writeUInt16LE(20, 4); entry.writeUInt16LE(20, 6);
  header.copy(entry, 8, 6, 28); // flags through filename length
  entry.writeUInt32LE(offset, 42);
  central.push(entry, filename);
  offset += header.length + filename.length + compressed.length;
}
const directory = Buffer.concat(central), end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(names.length, 8); end.writeUInt16LE(names.length, 10);
end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
const destination = path.join(root, 'upload/UnionSuite-CCO.zip');
fs.writeFileSync(destination, Buffer.concat([...local, directory, end]));
console.log(`Created upload ZIP with the confirmed UnionSuite-CCO/ inner folder: ${destination}`);
