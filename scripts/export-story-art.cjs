/** Export the six equal storyboard cells without altering the paintings. macOS utility, not app code. */
const { readFileSync, writeFileSync, mkdtempSync, rmSync, statSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { execFileSync } = require('node:child_process');
const { PNG } = require('pngjs'); // Pinned by the Expo toolchain in package-lock.json.
const root = resolve(__dirname, '..');
const manifest = JSON.parse(readFileSync(join(root, 'artwork/storyboards/v2/manifest.json'), 'utf8'));
const temp = mkdtempSync(join(tmpdir(), 'innerus-story-export-'));
let bytes = 0;
try {
  for (const story of manifest.sources) {
    const master = PNG.sync.read(readFileSync(join(root, story.master)));
    const w = master.width / 3, h = master.height / 2;
    if (!Number.isInteger(w) || !Number.isInteger(h) || w !== h) throw new Error(`Unexpected atlas dimensions: ${story.id}`);
    story.frames.forEach((path, i) => {
      const cell = new PNG({ width: w, height: h });
      for (let y = 0; y < h; y++) {
        const start = (((Math.floor(i / 3) * h + y) * master.width) + (i % 3) * w) * 4;
        master.data.copy(cell.data, y * w * 4, start, start + w * 4);
      }
      const png = join(temp, 'cell.png');
      writeFileSync(png, PNG.sync.write(cell));
      execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '80', png, '--out', join(root, path)], { stdio: 'ignore' });
      bytes += statSync(join(root, path)).size;
    });
  }
  process.stdout.write(`Exported 90 individual chapter/closing frames; ${(bytes / 1024 / 1024).toFixed(2)} MiB bundled.\n`);
} finally { rmSync(temp, { recursive: true, force: true }); }
