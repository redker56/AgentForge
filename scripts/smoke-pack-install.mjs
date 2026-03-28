import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PACKAGE_NAME = '@redker56/agentforge';
const TARBALL_PATTERN = /^redker56-agentforge-.*\.tgz$/;

function getNpmCommand() {
  const npmExecPath = process.env.npm_execpath;

  if (!npmExecPath) {
    return {
      command: process.platform === 'win32' ? 'npm.cmd' : 'npm',
      prefixArgs: [],
    };
  }

  const extension = path.extname(npmExecPath).toLowerCase();
  const isJavaScriptEntry = extension === '.js' || extension === '.cjs' || extension === '.mjs';

  if (isJavaScriptEntry) {
    return {
      command: process.execPath,
      prefixArgs: [npmExecPath],
    };
  }

  return {
    command: npmExecPath,
    prefixArgs: [],
  };
}

function runCommand(command, args, options = {}) {
  const extension = path.extname(command).toLowerCase();
  const isWindowsCommandWrapper =
    process.platform === 'win32' && (extension === '.cmd' || extension === '.bat');

  return execFileSync(command, args, {
    ...options,
    shell: isWindowsCommandWrapper ? true : options.shell,
  });
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
  const npmCommand = getNpmCommand();
  const tarballPath = getLatestTarball(cwd);
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'agentforge-smoke-'));

  try {
    runCommand(npmCommand.command, [...npmCommand.prefixArgs, 'init', '-y'], {
      cwd: tempDir,
      stdio: 'ignore',
    });

    runCommand(npmCommand.command, [...npmCommand.prefixArgs, 'install', tarballPath], {
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
