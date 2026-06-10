import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { buildCopyPrompt, buildCoverPrompt, normalizeCopyPackage, publishMarkdown, publishText } from "./xhs-cover-rules.mjs";
import {
  createZip,
  extractDocxText,
  imageDataToFile,
  readJSON,
  readRequestBuffer,
  requireAccessCode,
  sendBuffer,
  sendJSON,
} from "./server-utils.mjs";

const root = fileURLToPath(new URL(".", import.meta.url));
await loadLocalEnv(join(root, ".env.local"));

const port = Number(process.env.PORT || 4175);
const appMode = process.env.APP_MODE === "web" ? "web" : "local";
const host = process.env.HOST || (appMode === "web" ? "0.0.0.0" : "127.0.0.1");
const appAccessCode = process.env.APP_ACCESS_CODE || "";
const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
const deepseekBaseURL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
const deepseekModel = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";
const imageApiKey = process.env.BANANAROUTER_API_KEY;
const imageBaseURL = process.env.BANANAROUTER_BASE_URL || "https://api.bananarouter.com";
const imageModel = process.env.IMAGE_MODEL || "gpt-image-2";
const imageTimeoutMs = Number(process.env.IMAGE_TIMEOUT_MS || 240000);
const mockAI = process.env.MOCK_AI === "1";
const mockCopy = mockAI || process.env.MOCK_COPY === "1";
const mockImage = mockAI || process.env.MOCK_IMAGE === "1";
const exportStore = new Map();

const contentTypes = {
  ".html": "text/html;charset=utf-8",
  ".css": "text/css;charset=utf-8",
  ".js": "application/javascript;charset=utf-8",
  ".mjs": "application/javascript;charset=utf-8",
  ".json": "application/json;charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

async function loadLocalEnv(filePath) {
  let envText = "";
  try {
    envText = await readFile(filePath, "utf8");
  } catch {
    return;
  }

  for (const line of envText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.trim().replace(/^['"]|['"]$/g, "");
  }
}

function safeStaticPath(pathname) {
  const decoded = decodeURIComponent(pathname === "/" ? "index.html" : pathname.replace(/^\/+/, ""));
  const normalized = normalize(decoded).replace(/^(\.\.(\/|\\|$))+/, "");
  return join(root, normalized);
}

function isInside(parent, child) {
  const rel = relative(parent, child);
  return Boolean(rel) && !rel.startsWith("..") && rel !== "..";
}

function allowedStaticPath(filePath) {
  const publicFiles = new Set(["index.html", "app.js", "styles.css", "xhs-cover-rules.mjs"]);
  const relativePath = relative(root, filePath);
  if (!isInside(root, filePath) && relativePath !== "index.html") return false;
  if (publicFiles.has(relativePath)) return true;
  if (relativePath.startsWith("assets/")) return true;
  return false;
}

function accessFrom(req, body = {}) {
  return req.headers["x-access-code"] || body.accessCode || "";
}

function checkAccess(req, body = {}) {
  return requireAccessCode({ expected: appAccessCode, provided: accessFrom(req, body) });
}

function materialTheme(material) {
  const text = String(material || "")
    .replace(/[#*_`>~-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const first = text.split(/[。！？!?，,；;\n]/)[0]?.trim() || "这件事";
  return first.length > 18 ? `${first.slice(0, 18)}...` : first;
}

function mockCopyPackage(material, referenceImageName = "", coverConfig = {}) {
  const theme = materialTheme(material);
  const presetName = String(coverConfig.templateName || "强观点电影海报").trim();
  const presetPrompt = String(coverConfig.templatePrompt || "").trim();
  const fontName = String(coverConfig.fontName || "默认风格").trim();
  const smallText = String(coverConfig.smallText || "").trim();
  const stickers = String(coverConfig.stickers || "").trim();
  const coverTitle = String(coverConfig.mainTitle || theme).trim();
  const coverSubtitle = String(coverConfig.subtitle || "换 5 种视觉讲清楚").trim();
  const detailNote = [
    presetPrompt ? `预设风格：${presetName}，${presetPrompt}` : `预设风格：${presetName}`,
    `字体：${fontName}`,
    smallText ? `小字/角标：${smallText}` : "",
    stickers ? `装饰/贴纸：${stickers}` : "",
    coverConfig.extraRequirements ? `其他要求：${coverConfig.extraRequirements}` : "",
  ]
    .filter(Boolean)
    .join("；");
  const referenceNote = referenceImageName ? `生成时参考用户上传的参考图「${referenceImageName}」的配色、质感和版式节奏。` : "";
  return normalizeCopyPackage({
    coverTitle,
    coverSubtitle,
    publishTitle: `${theme}，我整理成 5 个封面方向`,
    body:
      `我把这段内容先拆成一个可发布的小红书包：封面主标题先抓住「${theme}」这个核心，再用 5 个完全不同的视觉方向去测试哪一种更适合点击。\n\n这 5 个方向不会只是在同一个红黑模板里换元素，而是分别从强观点、知识卡片、生活方式、人物 IP 和极简隐喻去表达。\n\n你可以先选最接近账号气质的一版，再在修改窗口里继续细调。`,
    hashtags: ["AI封面", "小红书运营", "内容创作", "提示词", "AI提效"],
    coverPrompts: [
      {
        name: "强观点电影海报",
        description: "深墨底色，少量酒红聚光，电影节主海报构图，超大标题压住画面。",
        prompt: `基于素材「${material.slice(0, 60)}」生成强观点电影海报版小红书封面，深色背景、少量酒红聚光、标题居上，适合反常识观点。${detailNote}。${referenceNote}`,
      },
      {
        name: "清爽知识卡片",
        description: "雾蓝和象牙白主色，模块化步骤卡片，信息清楚，适合教程方法论。",
        prompt: `基于素材「${material.slice(0, 60)}」生成清爽知识卡片版小红书封面，雾蓝、象牙白、鼠尾草绿，标题清晰，画面有 3 个方法模块。${detailNote}。${referenceNote}`,
      },
      {
        name: "温柔成长笔记",
        description: "灰粉、香槟米和柔和自然光，像创作者日记或灵感手稿。",
        prompt: `基于素材「${material.slice(0, 60)}」生成温柔成长笔记版小红书封面，灰粉和香槟米配色，纸张拼贴、柔光、标题不拥挤。${detailNote}。${referenceNote}`,
      },
      {
        name: "人物访谈杂志",
        description: "人物或拟人主体居中，杂志封面标题层级，带采访感标签。",
        prompt: `基于素材「${material.slice(0, 60)}」生成人物访谈杂志版小红书封面，主体居中、侧边标题层级、柔和聚光灯、专业 IP 质感。${detailNote}。${referenceNote}`,
      },
      {
        name: "极简概念隐喻",
        description: "大留白和单一核心物件，用视觉隐喻表达内容，不堆元素。",
        prompt: `基于素材「${material.slice(0, 60)}」生成极简概念隐喻版小红书封面，大留白、单一核心物件、克制高级、标题与物件形成强关系。${detailNote}。${referenceNote}`,
      },
    ],
  });
}

function normalizeReferenceImage(value) {
  if (!value?.dataUrl) return null;
  const match = String(value.dataUrl).match(/^data:image\/(png|jpeg|jpg|webp);base64,([\s\S]+)$/);
  if (!match) throw new Error("参考图格式不正确，请上传 PNG、JPG 或 WEBP。");
  const mimeType = match[1] === "jpg" ? "image/jpeg" : `image/${match[1]}`;
  const ext = match[1] === "jpeg" ? "jpg" : match[1];
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > 6 * 1024 * 1024) throw new Error("参考图太大了，请换一张更小的图片。");
  const safeName = String(value.name || `reference.${ext}`).replace(/[^\w\u4e00-\u9fa5.-]+/g, "-").slice(0, 80);
  return {
    buffer,
    filename: safeName || `reference.${ext}`,
    mimeType,
  };
}

function mockImageData(title) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1536" viewBox="0 0 1024 1536">
    <defs>
      <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stop-color="#080305"/>
        <stop offset="46%" stop-color="#260a0d"/>
        <stop offset="100%" stop-color="#5a1118"/>
      </linearGradient>
      <linearGradient id="title" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="#fff6ed"/>
        <stop offset="58%" stop-color="#ffb299"/>
        <stop offset="100%" stop-color="#ff514a"/>
      </linearGradient>
      <radialGradient id="b1" cx="18%" cy="18%" r="52%"><stop offset="0%" stop-color="#ff7858" stop-opacity=".7"/><stop offset="100%" stop-color="#ff7858" stop-opacity="0"/></radialGradient>
      <radialGradient id="b2" cx="86%" cy="78%" r="48%"><stop offset="0%" stop-color="#ff2f45" stop-opacity=".42"/><stop offset="100%" stop-color="#ff2f45" stop-opacity="0"/></radialGradient>
      <filter id="grain"><feTurbulence baseFrequency="0.8" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 0.12"/></feComponentTransfer></filter>
      <filter id="glow"><feGaussianBlur stdDeviation="14" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <rect width="1024" height="1536" fill="url(#g)"/>
    <rect width="1024" height="1536" fill="url(#b1)"/>
    <rect width="1024" height="1536" fill="url(#b2)"/>
    <rect width="1024" height="1536" filter="url(#grain)"/>
    <text x="62" y="208" fill="url(#title)" font-family="sans-serif" font-size="138" font-weight="900" filter="url(#glow)">${escapeXml(title.slice(0, 6))}</text>
    <text x="62" y="350" fill="url(#title)" font-family="sans-serif" font-size="124" font-weight="900" filter="url(#glow)">${escapeXml(title.slice(6, 14))}</text>
    <rect x="74" y="428" width="340" height="220" rx="22" fill="rgba(255,244,235,.88)" stroke="rgba(255,207,184,.38)" stroke-width="2"/>
    <text x="102" y="508" fill="#3a1415" font-family="serif" font-size="44" font-weight="700">Studio</text>
    <text x="102" y="562" fill="#3a1415" font-family="serif" font-size="44" font-weight="700">Archive</text>
    <rect x="474" y="410" width="440" height="250" rx="24" fill="rgba(255,232,214,.16)" stroke="rgba(255,198,166,.32)" stroke-width="2"/>
    <text x="536" y="552" fill="#fff4ee" font-family="sans-serif" font-size="58" font-weight="800">CASE WALL</text>
    <circle cx="512" cy="860" r="160" fill="#ffb09a" opacity=".92"/>
    <path d="M348 1272 C378 1034 432 950 512 950 C602 950 654 1042 688 1272 Z" fill="#d9d9d9"/>
    <path d="M354 766 C422 688 594 684 668 770 C640 690 576 636 512 636 C446 636 384 690 354 766 Z" fill="#972838"/>
    <rect x="78" y="900" width="364" height="306" rx="24" fill="rgba(255,235,218,.14)" stroke="rgba(255,169,132,.42)" stroke-width="2"/>
    <text x="112" y="1028" fill="#fff1e7" font-family="serif" font-size="54" font-weight="800">UI</text>
    <text x="112" y="1096" fill="#fff1e7" font-family="serif" font-size="54" font-weight="800">MASTER</text>
    <rect x="586" y="920" width="352" height="234" rx="22" fill="rgba(255,245,235,.82)" stroke="rgba(255,207,184,.36)" stroke-width="2"/>
    <text x="622" y="1020" fill="#3a1415" font-family="serif" font-size="46" font-weight="700">Red</text>
    <text x="622" y="1074" fill="#3a1415" font-family="serif" font-size="46" font-weight="700">Gradient</text>
    <rect x="126" y="1320" width="772" height="86" rx="28" fill="rgba(255,241,231,.1)" stroke="rgba(255,204,176,.24)" stroke-width="2"/>
    <text x="174" y="1376" fill="#ffd5bd" font-family="sans-serif" font-size="34">Crimson / UI Cards / Xiaohongshu</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

function escapeXml(value) {
  return String(value || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function extractJSON(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) throw new Error("DeepSeek 没有返回文案内容。");
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("DeepSeek 返回内容不是 JSON。");
    return JSON.parse(match[0]);
  }
}

async function handleStatus(_req, res) {
  sendJSON(res, 200, {
    mode: appMode,
    accessRequired: Boolean(appAccessCode),
    copyConfigured: Boolean(deepseekApiKey) || mockCopy,
    imageConfigured: Boolean(imageApiKey) || mockImage,
    copyModel: mockCopy ? "mock" : deepseekModel,
    imageModel: mockImage ? "mock" : imageModel,
  });
}

async function handleFileExtract(req, res) {
  const access = checkAccess(req);
  if (!access.ok) {
    sendJSON(res, access.status, { error: access.error });
    return;
  }

  const fileName = decodeURIComponent(String(req.headers["x-file-name"] || ""));
  const ext = extname(fileName).toLowerCase();
  if (![".txt", ".md", ".docx"].includes(ext)) {
    sendJSON(res, 415, { error: ".doc / PDF / 视频暂不支持。v1 请上传 .txt、.md 或 .docx 文本文件。" });
    return;
  }

  const buffer = await readRequestBuffer(req);
  const text = ext === ".docx" ? extractDocxText(buffer) : buffer.toString("utf8");
  sendJSON(res, 200, {
    fileName,
    text: text.trim(),
  });
}

async function handleCopyGenerate(req, res) {
  const body = await readJSON(req);
  const access = checkAccess(req, body);
  if (!access.ok) {
    sendJSON(res, access.status, { error: access.error });
    return;
  }

  const material = String(body.material || "").trim();
  if (material.length < 10) {
    sendJSON(res, 400, { error: "请先输入或上传一段更完整的文案。" });
    return;
  }
  if (mockCopy) {
    sendJSON(res, 200, mockCopyPackage(material, body.referenceImageName || "", body.coverConfig || {}));
    return;
  }
  if (!deepseekApiKey) {
    sendJSON(res, 500, { error: "DEEPSEEK_API_KEY 还没有配置。" });
    return;
  }

  const upstream = await fetch(`${deepseekBaseURL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${deepseekApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: deepseekModel,
      messages: [
        {
          role: "system",
          content: "你只输出可解析 JSON。你擅长小红书封面标题、发布文案和 AI 生图提示词。",
        },
        {
          role: "user",
          content: buildCopyPrompt({
            material,
            persona: body.persona || "",
            style: body.style || "",
            referenceImageName: body.referenceImageName || "",
            coverConfig: body.coverConfig || {},
          }),
        },
      ],
      temperature: 0.72,
      response_format: { type: "json_object" },
    }),
  });
  const payload = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    sendJSON(res, upstream.status, { error: payload.error?.message || payload.error || "DeepSeek 文案生成失败。", details: payload });
    return;
  }

  try {
    const copyPackage = normalizeCopyPackage(extractJSON(payload.choices?.[0]?.message?.content));
    sendJSON(res, 200, copyPackage);
  } catch (error) {
    sendJSON(res, 502, { error: error.message || "DeepSeek 返回格式无法解析。", details: payload });
  }
}

async function handleImageGenerate(req, res) {
  const body = await readJSON(req);
  const access = checkAccess(req, body);
  if (!access.ok) {
    sendJSON(res, access.status, { error: access.error });
    return;
  }

  const coverTitle = String(body.coverTitle || "").trim();
  if (!coverTitle) {
    sendJSON(res, 400, { error: "缺少封面标题。" });
    return;
  }
  let referenceImage;
  try {
    referenceImage = normalizeReferenceImage(body.referenceImage);
  } catch (error) {
    sendJSON(res, 400, { error: error.message || "参考图无法使用。" });
    return;
  }
  const prompt = buildCoverPrompt({
    coverTitle,
    coverSubtitle: body.coverSubtitle || "",
    basePrompt: body.basePrompt || "",
    revision: body.revision || "",
    referenceImageName: referenceImage?.filename || "",
    coverConfig: body.coverConfig || {},
  });

  if (mockImage) {
    sendJSON(res, 200, { imageUrl: mockImageData(coverTitle), prompt, provider: "mock" });
    return;
  }
  if (!imageApiKey) {
    sendJSON(res, 500, { error: "BANANAROUTER_API_KEY 还没有配置。" });
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), imageTimeoutMs);
  let upstream;
  try {
    if (referenceImage) {
      const form = new FormData();
      form.append("model", body.model || imageModel);
      form.append("prompt", prompt);
      form.append("n", "1");
      form.append("size", body.size || "1024x1536");
      form.append("quality", body.quality || "low");
      form.append("output_format", body.output_format || "png");
      form.append("moderation", body.moderation || "auto");
      form.append("response_format", "b64_json");
      form.append("image", new File([referenceImage.buffer], referenceImage.filename, { type: referenceImage.mimeType }));
      upstream = await fetch(`${imageBaseURL}/v1/images/edits`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${imageApiKey}`,
        },
        body: form,
      });
    } else {
      upstream = await fetch(`${imageBaseURL}/v1/images/generations`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${imageApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: body.model || imageModel,
          prompt,
          n: 1,
          size: body.size || "1024x1536",
          quality: body.quality || "low",
          output_format: body.output_format || "png",
          moderation: body.moderation || "auto",
          response_format: "b64_json",
        }),
      });
    }
  } catch (error) {
    if (error.name === "AbortError") {
      sendJSON(res, 504, { error: "Image2 请求超时，请稍后重试。" });
      return;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const payload = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    sendJSON(res, upstream.status, { error: payload.error?.message || payload.error || "Image2 生成失败。", details: payload });
    return;
  }

  const b64 = payload.data?.[0]?.b64_json;
  const imageUrl = b64 ? `data:image/png;base64,${b64}` : payload.data?.[0]?.url;
  if (!imageUrl) {
    sendJSON(res, 502, { error: "Image2 没有返回图片数据。", details: payload });
    return;
  }
  sendJSON(res, 200, { imageUrl, prompt, provider: imageModel, usedReference: Boolean(referenceImage) });
}

function cleanupExports() {
  const now = Date.now();
  for (const [id, item] of exportStore.entries()) {
    if (item.expiresAt < now) exportStore.delete(id);
  }
}

async function handleExportPrepare(req, res) {
  const body = await readJSON(req);
  const access = checkAccess(req, body);
  if (!access.ok) {
    sendJSON(res, access.status, { error: access.error });
    return;
  }

  const packageData = body.packageData || {};
  const { ext, buffer } = imageDataToFile(body.imageUrl);
  const imageName = `cover-final.${ext}`;
  const markdown = publishMarkdown(packageData, imageName);
  const text = publishText(packageData, imageName);
  const manifest = {
    createdAt: new Date().toISOString(),
    publishTitle: packageData.publishTitle || "",
    coverFile: imageName,
    hashtags: packageData.hashtags || [],
  };
  const zip = createZip([
    { name: imageName, content: buffer },
    { name: "发布文案.md", content: markdown },
    { name: "发布文案.txt", content: text },
    { name: "manifest.json", content: JSON.stringify(manifest, null, 2) },
  ]);

  cleanupExports();
  const id = randomUUID();
  const filename = encodeURIComponent(`${packageData.publishTitle || "小红书封面发布包"}.zip`);
  exportStore.set(id, {
    zip,
    filename,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });
  sendJSON(res, 200, { downloadUrl: `/api/export/download?id=${encodeURIComponent(id)}` });
}

async function handleExportDownload(_req, res, url) {
  cleanupExports();
  const id = url.searchParams.get("id");
  const item = exportStore.get(id);
  if (!item) {
    sendJSON(res, 404, { error: "下载包已经过期，请重新点击下载。" });
    return;
  }
  sendBuffer(res, 200, item.zip, {
    "Content-Type": "application/zip",
    "Content-Length": String(item.zip.length),
    "Content-Disposition": `attachment; filename*=UTF-8''${item.filename}`,
  });
}

async function handleStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const filePath = safeStaticPath(url.pathname);
  if (!allowedStaticPath(filePath)) {
    sendJSON(res, 404, { error: "Not found." });
    return;
  }
  try {
    const data = await readFile(filePath);
    const type = contentTypes[extname(filePath)] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    if (req.method !== "HEAD") res.end(data);
    else res.end();
  } catch {
    sendJSON(res, 404, { error: "Not found." });
  }
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (req.method === "GET" && url.pathname === "/api/app/status") {
      await handleStatus(req, res);
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/file/extract") {
      await handleFileExtract(req, res);
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/copy/generate") {
      await handleCopyGenerate(req, res);
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/image/generate") {
      await handleImageGenerate(req, res);
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/export/prepare") {
      await handleExportPrepare(req, res);
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/export/download") {
      await handleExportDownload(req, res, url);
      return;
    }
    if (req.method === "GET" || req.method === "HEAD") {
      await handleStatic(req, res);
      return;
    }
    sendJSON(res, 405, { error: "Method not allowed." });
  } catch (error) {
    sendJSON(res, 500, { error: error.message || "Internal server error." });
  }
});

server.listen(port, host, () => {
  console.log(`小红书封面发布包网站已启动：http://${host}:${port}/`);
  console.log(appAccessCode ? "Access code: configured" : "Access code: not configured");
  console.log(deepseekApiKey || mockCopy ? `Copy provider: ${mockCopy ? "mock" : deepseekModel}` : "Copy provider: missing DEEPSEEK_API_KEY");
  console.log(imageApiKey || mockImage ? `Image provider: ${mockImage ? "mock" : imageModel}` : "Image provider: missing BANANAROUTER_API_KEY");
});
