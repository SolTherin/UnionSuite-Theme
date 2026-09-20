'use strict';

// Exercise the guide and companion builds without writing their outputs. This
// catches local-only inputs before research or captures are removed from Git.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { fileURLToPath } = require('node:url');
const root = path.resolve(__dirname, '../../../../..');
const inputs = new Set();
const outputs = new Set();
const originalRead = fs.readFileSync;
const originalWrite = fs.writeFileSync;
const originalLog = console.log;

function relativeFile(file) {
  if (typeof file === 'number') throw new Error('Use a named file for guide inputs.');
  const absolute = path.resolve(file instanceof URL ? fileURLToPath(file) : String(file));
  const relative = path.relative(root, absolute).replaceAll('\\', '/');
  if (relative === '..' || relative.startsWith('../') || path.isAbsolute(relative)) {
    throw new Error('Guide dependency leaves the repository: ' + absolute);
  }
  return relative;
}

try {
  fs.readFileSync = function (file, ...args) {
    const relative = relativeFile(file);
    if (/^(?:archive|\.preview|prototypes|\.tmp-[^/]+)\//i.test(relative) ||
        relative.startsWith('THeme/UnionSuite/docs/')) {
      throw new Error('Promote this guide input into guides/usage/: ' + relative);
    }
    inputs.add(relative);
    return originalRead.call(fs, file, ...args);
  };
  fs.writeFileSync = function (file) {
    outputs.add(relativeFile(file));
  };
  console.log = () => {};
  const guide = require('./build-theme-usage.cjs');
  guide.build(false);
} finally {
  fs.readFileSync = originalRead;
  fs.writeFileSync = originalWrite;
  console.log = originalLog;
}

const ignored = spawnSync('git', ['check-ignore', '--no-index', '-z', '--stdin'], {
  cwd: root,
  input: [...inputs].join('\0') + '\0',
  encoding: 'utf8'
});
if (ignored.error) throw ignored.error;
if (ignored.status !== 0 && ignored.status !== 1) {
  throw new Error('Unable to check guide inputs against Git ignores: ' + ignored.stderr);
}
const ignoredInputs = ignored.stdout.split('\0').filter(Boolean);
if (ignoredInputs.length) {
  throw new Error('Guide inputs must remain trackable:\n' + ignoredInputs.join('\n'));
}
const circular = [...inputs].filter(file => outputs.has(file));
if (circular.length) {
  throw new Error('A generated guide output is also used as input:\n' + circular.join('\n'));
}
if (process.argv.includes('--json')) {
  console.log(JSON.stringify({inputs: [...inputs].sort(), outputs: [...outputs].sort()}, null, 2));
} else {
  console.log('Guide source check passed: ' + inputs.size + ' repository inputs; ' +
    outputs.size + ' outputs simulated; no archived, prototype or ignored dependencies.');
}
