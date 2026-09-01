import "server-only";

interface ZipEntry {
  name: string;
  data: Uint8Array;
}

const LOCAL_FILE_SIGNATURE = 0x04034b50;
const CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
const END_OF_DIRECTORY_SIGNATURE = 0x06054b50;
const UTF8_FLAG = 0x0800;
const ZIP_VERSION = 20;

const CRC_TABLE = new Uint32Array(256);
for (let index = 0; index < CRC_TABLE.length; index++) {
  let value = index;
  for (let bit = 0; bit < 8; bit++) {
    value = (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  CRC_TABLE[index] = value >>> 0;
}

function crc32(data: Uint8Array): number {
  let value = 0xffffffff;

  for (const byte of data) {
    value = CRC_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8);
  }

  return (value ^ 0xffffffff) >>> 0;
}

function makeLocalHeader(name: Buffer, data: Uint8Array, checksum: number): Buffer {
  const header = Buffer.alloc(30 + name.length);
  header.writeUInt32LE(LOCAL_FILE_SIGNATURE, 0);
  header.writeUInt16LE(ZIP_VERSION, 4);
  header.writeUInt16LE(UTF8_FLAG, 6);
  header.writeUInt16LE(0, 8); // Stored, not compressed: PNG is already compressed.
  header.writeUInt16LE(0, 10); // DOS time: deterministic 00:00:00.
  header.writeUInt16LE(33, 12); // DOS date: 1980-01-01.
  header.writeUInt32LE(checksum, 14);
  header.writeUInt32LE(data.byteLength, 18);
  header.writeUInt32LE(data.byteLength, 22);
  header.writeUInt16LE(name.length, 26);
  header.writeUInt16LE(0, 28);
  name.copy(header, 30);
  return header;
}

function makeCentralHeader(
  name: Buffer,
  data: Uint8Array,
  checksum: number,
  localOffset: number,
): Buffer {
  const header = Buffer.alloc(46 + name.length);
  header.writeUInt32LE(CENTRAL_DIRECTORY_SIGNATURE, 0);
  header.writeUInt16LE(ZIP_VERSION, 4); // Version made by.
  header.writeUInt16LE(ZIP_VERSION, 6);
  header.writeUInt16LE(UTF8_FLAG, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(0, 12);
  header.writeUInt16LE(33, 14);
  header.writeUInt32LE(checksum, 16);
  header.writeUInt32LE(data.byteLength, 20);
  header.writeUInt32LE(data.byteLength, 24);
  header.writeUInt16LE(name.length, 28);
  header.writeUInt16LE(0, 30); // Extra length.
  header.writeUInt16LE(0, 32); // Comment length.
  header.writeUInt16LE(0, 34); // Disk number.
  header.writeUInt16LE(0, 36); // Internal attributes.
  header.writeUInt32LE(0, 38); // External attributes.
  header.writeUInt32LE(localOffset, 42);
  name.copy(header, 46);
  return header;
}

function makeEndOfDirectory(
  entryCount: number,
  centralDirectorySize: number,
  centralDirectoryOffset: number,
): Buffer {
  const end = Buffer.alloc(22);
  end.writeUInt32LE(END_OF_DIRECTORY_SIGNATURE, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entryCount, 8);
  end.writeUInt16LE(entryCount, 10);
  end.writeUInt32LE(centralDirectorySize, 12);
  end.writeUInt32LE(centralDirectoryOffset, 16);
  end.writeUInt16LE(0, 20);
  return end;
}

/** Build a deterministic ZIP archive without a runtime or third-party dependency. */
export function createZip(entries: ZipEntry[]): Buffer {
  if (entries.length > 0xffff) {
    throw new Error("A ZIP archive cannot contain more than 65,535 files");
  }

  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    if (name.length === 0 || name.length > 0xffff) {
      throw new Error("ZIP entry names must contain between 1 and 65,535 bytes");
    }

    const data = Buffer.from(entry.data);
    const checksum = crc32(data);
    const localHeader = makeLocalHeader(name, data, checksum);
    localParts.push(localHeader, data);
    centralParts.push(makeCentralHeader(name, data, checksum, offset));
    offset += localHeader.length + data.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  return Buffer.concat([
    ...localParts,
    centralDirectory,
    makeEndOfDirectory(entries.length, centralDirectory.length, offset),
  ]);
}
