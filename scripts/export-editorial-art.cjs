/** Local editorial asset preparation. No app imports, personal data or network access. */
const { readFileSync, writeFileSync, existsSync, mkdirSync, mkdtempSync, rmSync } = require('node:fs');
const { resolve, join } = require('node:path');
const { tmpdir } = require('node:os');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { PNG } = require('pngjs');

const root = resolve(__dirname, '..');
const folder = process.argv[2] ?? 'artwork/storyboards/editorial-v1';
if (!/^artwork\/storyboards\/editorial-v[12]$/.test(folder)) throw new Error('Choose the v1 or v2 editorial artwork pack.');
const evidenceFolder = folder.endsWith('v2') ? 'docs/evidence/story-imagery-v2/20261023' : 'docs/evidence/story-imagery/20261023';
const manifestPath = join(root, folder, 'manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const editorial = readFileSync(join(root, manifest.sourceEditorial), 'utf8');
const sections = [...editorial.matchAll(/^## (S\d{2}) · ([^\n]+)\n([\s\S]*?)(?=^## |$(?![\s\S]))/gm)];
if (sections.length !== 15 || manifest.stories.length !== 15) throw new Error('Expected 15 editorial stories.');
const temp = mkdtempSync(join(tmpdir(), 'innerus-editorial-export-'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
let frameCount = 0;
let frameBytes = 0;
const reviews = [];
const jpegQuality = 74;
const frameWidth = folder.endsWith('v2') ? 552 : 570;
const frameHeight = folder.endsWith('v2') ? 368 : 380;
const previewCells = [];

try {
  for (const story of manifest.stories) {
    const section = sections.find(match => match[1] === story.id);
    if (!section || section[2] !== story.title) throw new Error(`Editorial identity mismatch: ${story.id}`);
    const questions = [...section[3].matchAll(/^([1-5])\. \*\*([^\n]+?)\*\* — ([^\n]+)\n\n   \*Nudge:\* ([^\n]+)/gm)];
    const closing = section[3].match(/^\*\*Closing invitation:\*\* ([^\n]+)/m)?.[1];
    if (questions.length !== 5 || !closing) throw new Error(`Incomplete editorial copy: ${story.id}`);
    if (!existsSync(join(root, story.master))) throw new Error(`Missing generated master: ${story.id}`);
    const masterBytes = readFileSync(join(root, story.master));
    const master = PNG.sync.read(masterBytes);
    if (master.width !== master.height || master.width % 2 || master.height % 3) {
      throw new Error(`Expected an exact square 2×3 grid without fractional cells: ${story.id} ${master.width}×${master.height}`);
    }
    const width = frameWidth;
    const height = frameHeight;
    // Generative panels are not a pixel-exact grid. Reviewed paper-gap coordinates prevent
    // a sliver of the adjacent painting leaking into an otherwise correct equal-cell crop.
    const { x: columns, y: rows } = story.gridCuts ?? {};
    for (const [cuts, length, end] of [[columns, 3, master.width], [rows, 4, master.height]]) {
      if (!cuts || cuts.length !== length || cuts[0] !== 0 || cuts.at(-1) !== end ||
        cuts.some((value, index) => !Number.isInteger(value) || (index > 0 && value <= cuts[index - 1]))) {
        throw new Error(`Missing or invalid reviewed paper-gap cuts: ${story.id}`);
      }
    }
    story.sourceSize = { width: master.width, height: master.height };
    story.sourceSha256 = hash(masterBytes);
    story.frameSize = { width, height };
    story.chapters = [];
    story.frames.forEach((path, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const left = columns[column] + (column > 0 ? 4 : 0);
      const right = columns[column + 1] - (column < 1 ? 4 : 0);
      const top = rows[row] + (row > 0 ? 4 : 0);
      const bottom = rows[row + 1] - (row < 2 ? 4 : 0);
      if (right - left < width || bottom - top < height) throw new Error(`Reviewed cell too small: ${story.id}-${index + 1}`);
      const cropX = left + Math.floor((right - left - width) / 2);
      const cropY = story.cropOverrides?.[index]?.y === 'start' ? top : top + Math.floor((bottom - top - height) / 2);
      const cell = new PNG({ width, height });
      for (let y = 0; y < height; y++) {
        const start = ((cropY + y) * master.width + cropX) * 4;
        master.data.copy(cell.data, y * width * 4, start, start + width * 4);
      }
      const png = join(temp, `${story.id}-${index}.png`);
      writeFileSync(png, PNG.sync.write(cell));
      mkdirSync(resolve(root, path, '..'), { recursive: true });
      execFileSync('/usr/bin/sips', ['--matchTo', '/System/Library/ColorSync/Profiles/sRGB Profile.icc', '-s', 'format', 'jpeg', '-s', 'formatOptions', String(jpegQuality), png, '--out', join(root, path)], { stdio: 'ignore' });
      const bytes = readFileSync(join(root, path));
      const copy = index < 5 ? { chapter: questions[index][2], question: questions[index][3], nudge: questions[index][4] } : { chapter: 'Take this with us', question: closing };
      const concept = story.concepts?.[index];
      if (concept && concept.question !== copy.question) throw new Error(`Visual brief does not match editorial copy: ${story.id}-${index + 1}`);
      story.chapters.push({ position: index, role: index < 5 ? 'question' : 'closing', ...copy,
        ...(concept ? { recognitionCue: concept.recognitionCue, visualBrief: concept.visual } : {}),
        image: path, sourceCrop: { x: cropX, y: cropY, width, height }, sha256: hash(bytes), bytes: bytes.length, reveal: index === 5 ? 'settle' : ['arrive', 'unfold', 'glow', 'open', 'gather'][index] });
      previewCells.push({ story: story.id, position: index, cell });
      frameCount++;
      frameBytes += bytes.length;
    });
    reviews.push(`${story.id}: six ${width}×${height} JPEGs; exact editorial question/chapter/closing mapping; master and frame SHA-256 retained.`);
  }

  if (frameCount !== 90) throw new Error(`Expected 90 frames, got ${frameCount}`);
  if (new Set(manifest.stories.flatMap(story => story.chapters.map(frame => frame.sha256))).size !== 90 ||
    new Set(manifest.stories.flatMap(story => story.frames)).size !== 90) throw new Error('Frame identity or content duplicated.');
  manifest.status = manifest.ownerReview?.status === 'rejected'
    ? 'Owner rejected visual direction; retained as superseded source/history. See question-specific editorial-v2.'
    : 'Generated, extracted and visually reviewed as an editorial asset pack; owner/native review pending. No production catalogue mapping.';
  manifest.export = { tool: 'node scripts/export-editorial-art.cjs (pngjs + macOS sips)', frameCount, totalFrameBytes: frameBytes, jpegQuality, color: 'Converted to sRGB Profile.icc with macOS sips', upscale: false, crop: `${frameWidth}×${frameHeight} from reviewed paper-gap bounds; exact crop recorded per frame`, contentVersion: 'English editorial draft 0.1', review: 'Static source-sheet and frame inspection; native appearance, accessibility and independent layers unverified.' };
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

  function montage(items, columns, output) {
    const sheet = new PNG({ width: frameWidth * columns, height: frameHeight * Math.ceil(items.length / columns) });
    sheet.data.fill(255);
    items.forEach((item, index) => {
      for (let y = 0; y < frameHeight; y++) item.cell.data.copy(sheet.data,
        ((Math.floor(index / columns) * frameHeight + y) * sheet.width + (index % columns) * frameWidth) * 4,
        y * frameWidth * 4, (y + 1) * frameWidth * 4);
    });
    const source = join(temp, 'montage.png');
    writeFileSync(source, PNG.sync.write(sheet));
    execFileSync('/usr/bin/sips', ['--matchTo', '/System/Library/ColorSync/Profiles/sRGB Profile.icc', '--resampleWidth', String(Math.min(1710, sheet.width)), '-s', 'format', 'jpeg', '-s', 'formatOptions', '80', source, '--out', join(root, folder, 'previews', output)], { stdio: 'ignore' });
  }
  for (let start = 0; start < 15; start += 4) {
    const ids = manifest.stories.slice(start, start + 4).map(story => story.id);
    montage(previewCells.filter(item => ids.includes(item.story)), 6, `${ids[0]}-${ids.at(-1)}.jpg`);
  }
  const overview = [['S01', 2], ['S02', 2], ['S08', 3], ['S10', 0], ['S12', 2], ['S15', 5]];
  montage(overview.map(([id, position]) => previewCells.find(item => item.story === id && item.position === position)), 3, 'overview.jpg');

  // Local visual review: authored text stays selectable and outside the paintings.
  const reviewStories = manifest.stories.map(({ id, title, chapters }) => ({ id, title,
    chapters: chapters.map(({ chapter, question, nudge, image }) => ({ chapter, question, nudge, image })) }));
  const escapedData = JSON.stringify(reviewStories).replace(/</g, '\\u003c');
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>InnerUs · Story imagery review</title>
<style>:root{color-scheme:light;--paper:#f8f3e9;--ink:#352238;--muted:#746875;--line:#e0d6c9}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:system-ui,sans-serif}main{max-width:1280px;margin:auto;padding:32px 20px}h1,h2,.question{font-family:Georgia,serif;font-weight:400}h1{font-size:38px;margin:8px 0}header p{max-width:70ch;line-height:1.6;color:var(--muted)}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:32px 24px;margin-top:32px}article{min-width:0;padding-bottom:24px;border-bottom:1px solid var(--line)}h2{font-size:25px;margin:12px 0 8px}img{display:block;width:100%;aspect-ratio:3/2;object-fit:contain;mask-image:linear-gradient(90deg,transparent,#000 2.5%,#000 97.5%,transparent),linear-gradient(transparent,#000 3%,#000 82%,transparent);mask-composite:intersect}small,.chapter{color:var(--muted);font-size:12px;letter-spacing:.07em}.chapter{text-transform:uppercase;margin-top:14px}.question{font-size:23px;line-height:1.4;min-height:4.3em;margin:10px 0}nav{display:flex;gap:6px;flex-wrap:wrap;margin:14px 0}button{border:1px solid var(--line);border-radius:100px;background:transparent;color:var(--ink);padding:9px 13px;font:inherit;font-size:13px;cursor:pointer}button[aria-pressed=true]{background:var(--ink);color:var(--paper)}button:focus-visible,summary:focus-visible{outline:3px solid #a26748;outline-offset:3px}details{color:var(--muted);font-size:14px;line-height:1.6}summary{cursor:pointer}.dark{--paper:#352238;--ink:#f8f3e9;--muted:#d9ccda;--line:#66546a}a{color:inherit}footer{margin:36px 0;color:var(--muted);font-size:13px}</style>
<main><header><small>INNERUS · EDITORIAL ART REVIEW</small><h1>Fifteen stories, one scene at a time.</h1><p>Five question paintings and a closing for each story. Choose a chapter to review its image and exact English question. These are fictional illustrations for the new editorial draft.</p><button id="appearance" aria-pressed="false">Dark canvas</button></header><div class="grid" id="stories"></div><footer>Local review only. The production catalogue, saved sessions, purchases and personal data are separate. No network, fonts or libraries are loaded.</footer></main>
<script>const stories=${escapedData};const grid=document.getElementById('stories');for(const story of stories){const card=document.createElement('article');const label=document.createElement('small');label.textContent=story.id;const title=document.createElement('h2');title.textContent=story.title;const img=document.createElement('img');img.alt='';img.decoding='async';img.loading='lazy';const nav=document.createElement('nav');nav.setAttribute('aria-label',story.title+' chapters');const chapter=document.createElement('div');chapter.className='chapter';const question=document.createElement('p');question.className='question';const details=document.createElement('details');const summary=document.createElement('summary');summary.textContent='A little nudge';const nudge=document.createElement('p');details.append(summary,nudge);const buttons=[];const select=i=>{const frame=story.chapters[i];img.src=frame.image.split('/').slice(-2).join('/');chapter.textContent=frame.chapter;question.textContent=frame.question;nudge.textContent=frame.nudge||'';details.hidden=!frame.nudge;details.open=false;buttons.forEach((b,j)=>b.setAttribute('aria-pressed',String(i===j)))};story.chapters.forEach((frame,i)=>{const button=document.createElement('button');button.textContent=i===5?'Closing':String(i+1);button.setAttribute('aria-label',i===5?'Closing':'Question '+(i+1));button.onclick=()=>select(i);buttons.push(button);nav.append(button)});card.append(label,title,img,nav,chapter,question,details);grid.append(card);select(0)}document.getElementById('appearance').onclick=function(){const dark=document.body.classList.toggle('dark');this.setAttribute('aria-pressed',String(dark));this.textContent=dark?'Light canvas':'Dark canvas'};</script></html>`;
  writeFileSync(join(root, folder, 'review.html'), html);
  const questionMap = ['# Question-to-image review', '', 'Each image is a fictional invitation. Recognition intent is an editorial brief, not reader-tested evidence.', ''];
  for (const story of manifest.stories) {
    questionMap.push(`## ${story.id} · ${story.title}`, '');
    for (const frame of story.chapters) {
      questionMap.push(`### ${frame.position < 5 ? 'Question ' + (frame.position + 1) : 'Closing'}`, '', frame.question, '',
        `![${frame.recognitionCue ?? frame.chapter}](frames/${frame.image.split('/').at(-1)})`, '');
      if (frame.recognitionCue) questionMap.push(`Recognition cue: ${frame.recognitionCue}.`, '');
    }
  }
  writeFileSync(join(root, folder, 'question-map.md'), questionMap.join('\n') + '\n');
  const report = ['InnerUs editorial imagery export — 23 October 2026', ...reviews, `PASS: ${frameCount} unique chapter/closing frames; ${(frameBytes / 1024 / 1024).toFixed(2)} MiB total.`, 'PASS: all copy mapped from docs/STORY_LIBRARY_DRAFT.md; no upscaling.', 'PASS: local review HTML loads only local images; captions are real selectable text.', 'Scope: static assets and local review; no mobile build/device, runtime integration, independent-layer or accessibility evidence.'];
  writeFileSync(join(root, evidenceFolder, 'export.txt'), report.join('\n') + '\n');
  process.stdout.write(report.join('\n') + '\n');
} finally {
  rmSync(temp, { recursive: true, force: true });
}
