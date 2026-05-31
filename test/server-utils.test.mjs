import assert from "node:assert/strict";
import test from "node:test";
import { Buffer } from "node:buffer";
import { createZip, extractDocxText, requireAccessCode } from "../server-utils.mjs";

test("access code is required when APP_ACCESS_CODE is configured", () => {
  assert.equal(requireAccessCode({ expected: "film2026", provided: "film2026" }).ok, true);

  const missing = requireAccessCode({ expected: "film2026", provided: "" });
  assert.equal(missing.ok, false);
  assert.equal(missing.status, 401);

  const wrong = requireAccessCode({ expected: "film2026", provided: "wrong" });
  assert.equal(wrong.ok, false);
  assert.equal(wrong.status, 403);
});

test("docx extractor reads text from word/document.xml inside a zip", () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
    <w:body>
      <w:p><w:r><w:t>第一段文案</w:t></w:r></w:p>
      <w:p><w:r><w:t>第二段 &amp; 重点</w:t></w:r></w:p>
    </w:body>
  </w:document>`;
  const docx = createZip([{ name: "word/document.xml", content: Buffer.from(xml, "utf8") }]);

  const text = extractDocxText(docx);

  assert.match(text, /第一段文案/);
  assert.match(text, /第二段 & 重点/);
});
