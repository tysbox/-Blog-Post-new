import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');
const tinaPort = process.env.TINA_PUBLIC_PORT || '7777';
const tinaCommandName = process.platform === 'win32' ? 'tinacms.cmd' : 'tinacms';
const tinaBinCandidates = [
  path.join(repoRoot, 'node_modules 2', '.bin', tinaCommandName),
  path.join(repoRoot, 'node_modules', '.bin', tinaCommandName),
];
const tinaBin = tinaBinCandidates.find(candidate => fs.existsSync(candidate)) ?? tinaCommandName;

const watchRoots = [
  path.join(repoRoot, 'src/content/pages'),
  path.join(repoRoot, 'src/content/blog'),
];

const binDirs = [
  path.join(repoRoot, 'node_modules', '.bin'),
  path.join(repoRoot, 'node_modules 2', '.bin'),
];

const childEnv = {
  ...process.env,
  NODE_OPTIONS: process.env.NODE_OPTIONS || '--dns-result-order=ipv4first',
  TINA_DEV_PORT: process.env.TINA_DEV_PORT || '7788',
  TINA_GRAPHQL_PORT: process.env.TINA_GRAPHQL_PORT || '9001',
  PATH: [...binDirs, process.env.PATH || ''].join(path.delimiter),
};

let child;
let restarting = false;
let restartTimer;

function startChild() {
  child = spawn(tinaBin, ['dev', '--port', tinaPort, '-c', 'astro dev'], {
    cwd: repoRoot,
    env: childEnv,
    stdio: 'inherit',
  });

  child.on('error', (error) => {
    console.error('Failed to start Tina dev process:', error);
    process.exit(1);
  });

  child.on('exit', (code, signal) => {
    if (restarting) {
      restarting = false;
      startChild();
      return;
    }

    process.exit(code ?? (signal ? 1 : 0));
  });
}

function requestRestart(reason) {
  if (!child || restarting) {
    return;
  }

  clearTimeout(restartTimer);
  restartTimer = setTimeout(() => {
    console.log(`Detected content structure change (${reason}). Restarting dev server to pick up new routes...`);
    restarting = true;
    child.kill('SIGTERM');
  }, 150);
}

for (const watchRoot of watchRoots) {
  fs.watch(watchRoot, { recursive: true }, (_eventType, filename) => {
    const relativePath = String(filename || '');
    if (!relativePath) {
      return;
    }

    if (!relativePath.endsWith('.json') && !relativePath.endsWith('.mdx') && !relativePath.endsWith('.md')) {
      return;
    }

    requestRestart(relativePath);
  });
}

process.on('SIGINT', () => {
  if (child) child.kill('SIGINT');
  process.exit(130);
});

process.on('SIGTERM', () => {
  if (child) child.kill('SIGTERM');
  process.exit(143);
});

startChild();