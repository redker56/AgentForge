import fs from 'node:fs';

const CHANGELOG_PATH = 'CHANGELOG.md';

function normalizeVersion(input) {
  return input.replace(/^v/, '').trim();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractSection(changelog, version) {
  const heading = new RegExp(`^## \\[${escapeRegExp(version)}\\].*$`, 'm');
  const match = changelog.match(heading);

  if (!match || match.index == null) {
    throw new Error(`CHANGELOG.md does not contain a section for ${version}`);
  }

  const start = match.index;
  const nextHeading = changelog.slice(start + match[0].length).search(/^## \[/m);
  const end =
    nextHeading === -1 ? changelog.length : start + match[0].length + nextHeading;

  return changelog.slice(start, end).trim();
}

function omitMaintenanceSections(section) {
  const lines = section.split(/\r?\n/);
  const releaseLines = [];
  let skipping = false;

  for (const line of lines) {
    if (/^###\s+(Internal|Maintenance|Testing|Tests?|CI|Workflow)\b/i.test(line)) {
      skipping = true;
      continue;
    }

    if (/^###\s+/.test(line)) {
      skipping = false;
    }

    if (!skipping) {
      releaseLines.push(line);
    }
  }

  return releaseLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function main() {
  const versionArg = process.argv[2];
  if (!versionArg) {
    throw new Error('Usage: node scripts/extract-changelog.mjs <version-or-tag>');
  }

  const version = normalizeVersion(versionArg);
  const changelog = fs.readFileSync(CHANGELOG_PATH, 'utf8');
  const section = extractSection(changelog, version);

  process.stdout.write(`${omitMaintenanceSections(section)}\n`);
}

main();
