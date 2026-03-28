import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PACKAGE_NAME = '@redker56/agentforge';
const TARBALL_PATTERN = /^redker56-agentforge-.*\.tgz$/;

function getNpmExecPath() {
  const npmExecPath = process.env.npm_execpath;

  if (!npmExecPath) {
    throw new Error('npm_execpath is not set. Run this script via `npm run smoke:pack`.');
  }

  return npmExecPath;
}

function runNodeCli(cliPath, args, options = {}) {
  return execFileSync(process.execPath, [cliPath, ...args], options);
}

function getLatestTarball(cwd) {
  const tarballs = readdirSync(cwd)
    .filter(name => TARBALL_PATTERN.test(name))
    .map(name => ({
      name,
      mtimeMs: statSync(path.join(cwd, name)).mtimeMs,
    }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  if (tarballs.length === 0) {
    throw new Error('No redker56-agentforge-*.tgz tarball found. Run npm pack first.');
  }

  return path.join(cwd, tarballs[0].name);
}

function main() {
  const cwd = process.cwd();
  const npmExecPath = getNpmExecPath();
  const tarballPath = getLatestTarball(cwd);
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'agentforge-smoke-'));

  try {
    runNodeCli(npmExecPath, ['init', '-y'], {
      cwd: tempDir,
      stdio: 'ignore',
    });

    runNodeCli(npmExecPath, ['install', tarballPath], {
      cwd: tempDir,
      stdio: 'inherit',
    });

    const cliPath = path.join(tempDir, 'node_modules', PACKAGE_NAME, 'bin', 'cli.js');

    if (!existsSync(cliPath)) {
      throw new Error(`Smoke test failed: installed CLI entry was not found at ${cliPath}.`);
    }

    const output = execFileSync(process.execPath, [cliPath, '--help'], {
      cwd: tempDir,
      encoding: 'utf8',
    });

    if (!output.includes('Usage: af')) {
      throw new Error('Smoke test failed: CLI help output does not contain "Usage: af".');
    }

    console.log(`Packed CLI smoke test passed: ${path.basename(tarballPath)}`);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

main();
