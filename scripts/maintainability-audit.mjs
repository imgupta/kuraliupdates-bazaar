#!/usr/bin/env node
/**
 * Lightweight, dependency-free maintainability inventory.
 *
 * This intentionally reports structural indicators only. It does not claim
 * cyclomatic/cognitive complexity or semantic duplicate detection.
 */
import fs from 'node:fs';
import path from 'node:path';

const roots = ['src', 'backend-java-spring/src/main/java'];
const extensions = new Set(['.ts', '.tsx', '.java']);
const largeFileLines = 500;
const veryLargeFileLines = 1000;
const duplicateWindow = 8;
const files = [];

function walk(directory) {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(fullPath);
    else if (entry.isFile() && extensions.has(path.extname(entry.name))) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split(/\r?\n/);
      files.push({
        path: fullPath.replaceAll(path.sep, '/'),
        lines: lines.length - (lines.at(-1) === '' ? 1 : 0),
        bytes: Buffer.byteLength(content),
        sourceLines: lines.map(line => line.trim()).filter(line =>
          line && !line.startsWith('//') && !line.startsWith('*') && !line.startsWith('/*')
        )
      });
    }
  }
}

for (const root of roots) walk(root);
files.sort((a, b) => b.lines - a.lines);

const blocks = new Map();
for (const file of files) {
  const seenInFile = new Set();
  for (let i = 0; i <= file.sourceLines.length - duplicateWindow; i += 1) {
    const block = file.sourceLines.slice(i, i + duplicateWindow).join('\n');
    if (block.length < 120 || seenInFile.has(block)) continue;
    seenInFile.add(block);
    const entries = blocks.get(block) ?? [];
    entries.push({ path: file.path, start: i + 1 });
    blocks.set(block, entries);
  }
}
const duplicates = [...blocks.entries()]
  .filter(([, occurrences]) => new Set(occurrences.map(item => item.path)).size > 1)
  .map(([block, occurrences]) => ({
    lines: block.split('\n').length,
    occurrences
  }))
  .sort((a, b) => b.occurrences.length - a.occurrences.length || b.lines - a.lines);

const report = {
  generatedAt: new Date().toISOString(),
  scope: roots,
  files: files.length,
  totalLines: files.reduce((sum, file) => sum + file.lines, 0),
  largeFiles: files.filter(file => file.lines >= largeFileLines).map(({ path, lines, bytes }) => ({ path, lines, bytes })),
  veryLargeFiles: files.filter(file => file.lines >= veryLargeFileLines).map(({ path, lines, bytes }) => ({ path, lines, bytes })),
  exactDuplicateBlocks: duplicates.length,
  duplicateExamples: duplicates.slice(0, 25)
};

console.log('Maintainability inventory (structural indicators; not a complexity score)');
console.log(JSON.stringify(report, null, 2));
if (process.env.GITHUB_STEP_SUMMARY) {
  const summary = [
    '# Maintainability inventory',
    '',
    `- Source files: **${report.files}**`,
    `- Source lines: **${report.totalLines.toLocaleString()}**`,
    `- Files at least ${largeFileLines} lines: **${report.largeFiles.length}**`,
    `- Files at least ${veryLargeFileLines} lines: **${report.veryLargeFiles.length}**`,
    `- Exact repeated ${duplicateWindow}-line blocks across files: **${report.exactDuplicateBlocks}**`,
    '',
    'This is a structural inventory, not cyclomatic/cognitive complexity or semantic duplication analysis.',
    '',
    '## Largest files',
    ...report.largeFiles.slice(0, 20).map(file => `- \`${file.path}\`: ${file.lines} lines`),
    '',
    '## Repeated block candidates',
    ...report.duplicateExamples.slice(0, 10).map(item => `- ${item.lines} lines in ${item.occurrences.map(o => `${o.path}:${o.start}`).join(', ')}`)
  ].join('\n');
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary + '\n');
}
