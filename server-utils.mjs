import { inflateRawSync } from "node:zlib";

export function requireAccessCode({ expected, provided }) {
  const configured = String(expected || "").trim();
  if (!configured) return { ok: true };

  const value = String(provided || "").trim();
  if (!value) {
    return { ok: false, status: 401, error: "请输入访问码后再生成。" };
  }
  if (value !== configured) {
    return { ok: false, status: 403, error: "访问码不正确，请重新输入。" };
  }
  return { ok: true };
}

export async function readRequestBuffer(req, maxBytes = 20 * 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw new Error("文件太大了，v1 建议控制在 20MB 以内。");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function readJSON(req) {
  const buffer = await readRequestBuffer(req, 3 * 1024 * 1024);
  const text = buffer.toString("utf8").trim();
  return text ? JSON.parse(text) : {};
}

export function sendJSON(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json;charset=utf-8" });
  res.end(JSON.stringify(body));
}

export function sendBuffer(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

const crcTable = new Uint32Array(256).map((_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zipDateTime(date = new Date()) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, dosDate };
}

export function createZip(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const { time, dosDate } = zipDateTime();

  for (const file of files) {
    const content = Buffer.isBuffer(file.content) ? file.content : Buffer.from(String(file.content || ""), "utf8");
    const nameBuffer = Buffer.from(file.name, "utf8");
    const crc = crc32(content);
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(time, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(content.length, 18);
    localHeader.writeUInt32LE(content.length, 22);
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);
    localParts.push(localHeader, nameBuffer, content);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(time, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(content.length, 20);
    centralHeader.writeUInt32LE(content.length, 24);
    centralHeader.writeUInt16LE(nameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    centralParts.push(centralHeader, nameBuffer);
    offset += localHeader.length + nameBuffer.length + content.length;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, ...centralParts, end]);
}

function findEndOfCentralDirectory(buffer) {
  for (let index = buffer.length - 22; index >= 0; index -= 1) {
    if (buffer.readUInt32LE(index) === 0x06054b50) return index;
  }
  throw new Error("这个 DOCX 文件结构不完整，无法读取正文。");
}

function decodeXmlEntities(value) {
  return String(value || "")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'");
}

function extractTextFromDocumentXml(xml) {
  const paragraphs = [];
  const paragraphMatches = xml.matchAll(/<w:p[\s\S]*?<\/w:p>/g);
  for (const paragraph of paragraphMatches) {
    const runs = [...paragraph[0].matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)]
      .map((match) => decodeXmlEntities(match[1]))
      .join("");
    if (runs.trim()) paragraphs.push(runs.trim());
  }
  if (paragraphs.length) return paragraphs.join("\n");

  return [...xml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)]
    .map((match) => decodeXmlEntities(match[1]).trim())
    .filter(Boolean)
    .join("\n");
}

export function extractDocxText(input) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  const eocd = findEndOfCentralDirectory(buffer);
  const entries = buffer.readUInt16LE(eocd + 10);
  let cursor = buffer.readUInt32LE(eocd + 16);

  for (let i = 0; i < entries; i += 1) {
    if (buffer.readUInt32LE(cursor) !== 0x02014b50) break;
    const method = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const name = buffer.subarray(cursor + 46, cursor + 46 + nameLength).toString("utf8");

    if (name === "word/document.xml") {
      if (buffer.readUInt32LE(localOffset) !== 0x04034b50) {
        throw new Error("DOCX 内部正文位置异常，无法读取。");
      }
      const localNameLength = buffer.readUInt16LE(localOffset + 26);
      const localExtraLength = buffer.readUInt16LE(localOffset + 28);
      const dataStart = localOffset + 30 + localNameLength + localExtraLength;
      const compressed = buffer.subarray(dataStart, dataStart + compressedSize);
      const xmlBuffer = method === 0 ? compressed : method === 8 ? inflateRawSync(compressed) : null;
      if (!xmlBuffer) throw new Error("暂不支持这个 DOCX 压缩格式。");
      const text = extractTextFromDocumentXml(xmlBuffer.toString("utf8"));
      if (!text.trim()) throw new Error("这个 DOCX 没读到正文文字。");
      return text;
    }

    cursor += 46 + nameLength + extraLength + commentLength;
  }

  throw new Error("这个 DOCX 里没有找到正文内容。");
}

export function imageDataToFile(imageUrl) {
  const match = String(imageUrl || "").match(/^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,([\s\S]+)$/);
  if (!match) throw new Error("图片数据格式不正确，无法下载。");
  return {
    ext: match[1] === "jpeg" ? "jpg" : match[1] === "svg+xml" ? "svg" : match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
}
