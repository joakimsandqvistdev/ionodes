import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import process from 'node:process';

const level = process.argv[2] ?? 'patch';
const validLevels = new Set(['patch', 'minor', 'major']);

function run(command, args, options = {}) {
  const output = execFileSync(command, args, {
    encoding: 'utf8',
    stdio: options.stdio ?? 'pipe'
  });
  return typeof output === 'string' ? output.trim() : '';
}

function fail(message) {
  console.error(`Release stopped: ${message}`);
  process.exit(1);
}

if (!validLevels.has(level)) {
  fail(`expected patch, minor, or major; received "${level}".`);
}

if (run('git', ['branch', '--show-current']) !== 'main') {
  fail('check out the main branch first.');
}

if (run('git', ['status', '--porcelain'])) {
  fail('commit or stash all changes first so the release contains only the version bump.');
}

const npmCli = process.env.npm_execpath;
if (!npmCli) {
  fail('run this script through npm: npm run release -- patch.');
}

run(process.execPath, [npmCli, 'version', level, '--no-git-tag-version'], {
  stdio: 'inherit'
});

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const version = packageJson.version;
const tag = `v${version}`;

try {
  run('git', ['show-ref', '--verify', '--quiet', `refs/tags/${tag}`]);
  fail(`tag ${tag} already exists; choose a new package version.`);
} catch (error) {
  if (error.status !== 1) throw error;
}

run('git', ['add', 'package.json', 'package-lock.json']);
run('git', ['commit', '-m', `chore(release): ${version}`], { stdio: 'inherit' });
run('git', ['tag', '-a', tag, '-m', tag]);
run('git', ['push', 'origin', 'main', '--follow-tags'], { stdio: 'inherit' });

console.log(`Pushed ${tag}. GitHub Actions will build, test, and publish ionodes@${version} to npm.`);
