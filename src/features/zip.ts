/**
 * A small, dependency-free ZIP writer for exports (spec 37).
 *
 * - STORE method only (no compression): audio is already compressed and text is small, so deflate
 *   would add code and CPU time for almost no gain.
 * - Streams entries into a sink chunk by chunk, so a large recording never has to sit in memory as a whole.
 *   Each local header is written with zero CRC/sizes first and patched once the entry's data is written
 *   (no data descriptors, so every unzip tool, including macOS Archive Utility and Windows Explorer, reads it).
 * - File names are UTF-8 (general purpose flag bit 11), so Dutch characters survive.
 * - Limits (classic ZIP, no ZIP64): at most 65,535 entries and 4 GB in total. Exports that would pass those
 *   limits fail with `ZipLimitError` before a broken archive is produced.
 *
 * No platform imports here: the sink and source are tiny interfaces, so the same code runs against an
 * expo-file-system `FileHandle` in the app and against a buffer in a quick Node check.
 */

export interface ZipSink {
  /** Appends bytes at the end of the archive. */
  write(bytes: Uint8Array): Promise<void>;
  /** Overwrites bytes at an absolute position that was already written. */
  patch(position: number, bytes: Uint8Array): Promise<void>;
}

export interface ZipSource {
  /** Returns the next chunk of at most `maxBytes`; an empty array means the end. */
  read(maxBytes: number): Promise<Uint8Array>;
}

export class ZipLimitError extends Error {
  constructor() {
    super('The export is larger than a ZIP archive can hold.');
    this.name = 'ZipLimitError';
  }
}

const MAX_UINT32 = 0xffffffff;
const MAX_ENTRIES = 0xffff;
/** Read size per chunk: keeps memory flat while staying fast on device storage. */
export const ZIP_CHUNK_BYTES = 256 * 1024;

// ---------------------------------------------------------------------------------------------
// CRC-32 (IEEE 802.3, the polynomial ZIP uses)
// ---------------------------------------------------------------------------------------------
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

/** Continues a CRC-32 over another chunk. Start with `crc32(chunk)` and pass the previous value on. */
export function crc32(bytes: Uint8Array, previous = 0): number {
  let crc = (previous ^ MAX_UINT32) >>> 0;
  for (let i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ MAX_UINT32) >>> 0;
}

// ---------------------------------------------------------------------------------------------
// Little-endian helpers
// ---------------------------------------------------------------------------------------------
class Bytes {
  private readonly view: DataView;
  readonly data: Uint8Array;
  private at = 0;
  constructor(length: number) {
    this.data = new Uint8Array(length);
    this.view = new DataView(this.data.buffer);
  }
  u16(value: number) { this.view.setUint16(this.at, value, true); this.at += 2; return this; }
  u32(value: number) { this.view.setUint32(this.at, value >>> 0, true); this.at += 4; return this; }
  raw(bytes: Uint8Array) { this.data.set(bytes, this.at); this.at += bytes.length; return this; }
}

function dosDateTime(date: Date) {
  const year = Math.min(Math.max(date.getFullYear(), 1980), 2107);
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

const encoder = new TextEncoder();
const UTF8_FLAG = 0x0800;
const VERSION = 20; // 2.0: plain stored entries with folders

type CentralEntry = { name: Uint8Array; crc: number; size: number; offset: number; time: number; date: number };

/** One sequential ZIP archive. Call `add…` for each entry in order, then `finish()` exactly once. */
export class ZipWriter {
  private offset = 0;
  private readonly entries: CentralEntry[] = [];
  private finished = false;
  private readonly sink: ZipSink;

  constructor(sink: ZipSink) {
    this.sink = sink;
  }

  /** Bytes written so far. */
  get size() { return this.offset; }

  /** Adds an entry from bytes already in memory (the readable text, transcripts). */
  async addBytes(path: string, data: Uint8Array, modified: Date = new Date()): Promise<void> {
    let done = false;
    await this.addStream(path, { read: async () => { if (done) return new Uint8Array(0); done = true; return data; } }, modified);
  }

  /** Adds a text entry as UTF-8. */
  addText(path: string, text: string, modified: Date = new Date()): Promise<void> {
    return this.addBytes(path, encoder.encode(text), modified);
  }

  /** Adds an entry by pulling chunks from a source until it is empty (recordings). */
  async addStream(path: string, source: ZipSource, modified: Date = new Date()): Promise<void> {
    if (this.finished) throw new Error('The archive is already finished.');
    if (this.entries.length >= MAX_ENTRIES) throw new ZipLimitError();
    const name = encoder.encode(path.replace(/\\/g, '/').replace(/^\/+/, ''));
    const { time, date } = dosDateTime(modified);
    const headerOffset = this.offset;

    const header = new Bytes(30 + name.length)
      .u32(0x04034b50).u16(VERSION).u16(UTF8_FLAG).u16(0) // signature, version needed, flags, method STORE
      .u16(time).u16(date)
      .u32(0).u32(0).u32(0) // CRC and sizes, patched below
      .u16(name.length).u16(0)
      .raw(name);
    await this.append(header.data);

    let crc = 0;
    let size = 0;
    for (;;) {
      const chunk = await source.read(ZIP_CHUNK_BYTES);
      if (!chunk || chunk.length === 0) break;
      crc = crc32(chunk, crc);
      size += chunk.length;
      await this.append(chunk);
    }

    await this.sink.patch(headerOffset + 14, new Bytes(12).u32(crc).u32(size).u32(size).data);
    this.entries.push({ name, crc, size, offset: headerOffset, time, date });
  }

  /** Writes the central directory. Returns the archive size in bytes. */
  async finish(): Promise<number> {
    if (this.finished) return this.offset;
    this.finished = true;
    const directoryOffset = this.offset;
    for (const entry of this.entries) {
      const record = new Bytes(46 + entry.name.length)
        .u32(0x02014b50).u16(VERSION).u16(VERSION).u16(UTF8_FLAG).u16(0)
        .u16(entry.time).u16(entry.date)
        .u32(entry.crc).u32(entry.size).u32(entry.size)
        .u16(entry.name.length).u16(0).u16(0) // name, extra, comment lengths
        .u16(0).u16(0).u32(0) // disk number, internal and external attributes
        .u32(entry.offset)
        .raw(entry.name);
      await this.append(record.data);
    }
    const directorySize = this.offset - directoryOffset;
    const end = new Bytes(22)
      .u32(0x06054b50).u16(0).u16(0)
      .u16(this.entries.length).u16(this.entries.length)
      .u32(directorySize).u32(directoryOffset)
      .u16(0);
    await this.append(end.data);
    return this.offset;
  }

  private async append(bytes: Uint8Array) {
    if (this.offset + bytes.length > MAX_UINT32) throw new ZipLimitError();
    await this.sink.write(bytes);
    this.offset += bytes.length;
  }
}

// ---------------------------------------------------------------------------------------------
// Adapters for a random-access file handle (structurally an expo-file-system FileHandle)
// ---------------------------------------------------------------------------------------------
export type HandleLike = {
  offset: number | null;
  readBytes(length: number): Promise<Uint8Array>;
  writeBytes(bytes: Uint8Array): Promise<void>;
};

/** A sink over a handle opened read-write on an empty file. */
export function handleSink(handle: HandleLike): ZipSink {
  let end = 0;
  return {
    async write(bytes) {
      handle.offset = end;
      await handle.writeBytes(bytes);
      end += bytes.length;
    },
    async patch(position, bytes) {
      handle.offset = position;
      await handle.writeBytes(bytes);
      handle.offset = end;
    },
  };
}

/** A source reading a handle from its current offset to the end. */
export function handleSource(handle: HandleLike): ZipSource {
  return { read: maxBytes => handle.readBytes(maxBytes) };
}

// ---------------------------------------------------------------------------------------------
// Human-readable, safe file names inside the archive
// ---------------------------------------------------------------------------------------------

/** Removes characters that file systems or share targets reject; keeps letters with accents. */
export function sanitizeFileName(value: string, fallback: string, maxLength = 60): string {
  const cleaned = value
    .replace(/[\\/:*?"<>|\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[.\s]+|[.\s]+$/g, '')
    .slice(0, maxLength)
    .trim();
  return cleaned || fallback;
}

/** Hands out unique paths: a second "2026-10-22 Coffee.m4a" becomes "2026-10-22 Coffee (2).m4a". */
export class UniquePaths {
  private readonly taken = new Set<string>();
  take(folder: string, base: string, extension: string): string {
    const prefix = folder ? `${folder}/` : '';
    const suffix = extension ? `.${extension}` : '';
    let candidate = `${prefix}${base}${suffix}`;
    for (let n = 2; this.taken.has(candidate.toLowerCase()); n++) candidate = `${prefix}${base} (${n})${suffix}`;
    this.taken.add(candidate.toLowerCase());
    return candidate;
  }
}
