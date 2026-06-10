import { publishMarkdown, publishText } from "./xhs-cover-rules.mjs";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const coverTemplatePresets = [
  {
    id: "hand-drawn-frame",
    name: "手绘边框",
    tag: "强点击",
    tone: "marker",
    prompt: "主体或人物居中，粗手绘描边，黄色箭头和感叹号，标题大且有冲击力，像小红书爆款封面但不杂乱。",
  },
  {
    id: "outdoor-handwriting",
    name: "户外手写",
    tag: "生活方式",
    tone: "outdoor",
    prompt: "自然户外背景，手写大字沿画面边缘排布，阳光、绿植、随手拍质感，适合旅行、生活方式和轻成长内容。",
  },
  {
    id: "contrast-pop",
    name: "克制撞色",
    tag: "醒目",
    tone: "pop",
    prompt: "高识别撞色边框，人物或主体被干净抠出，标题用两层颜色强调关键词，活泼但保持高级。",
  },
  {
    id: "layered-layout",
    name: "多层排版",
    tag: "信息量",
    tone: "layered",
    prompt: "多层卡片和半透明信息块，主标题、补充小字、局部贴纸形成清晰层级，适合方法论、清单和知识密度高的内容。",
  },
  {
    id: "study-room",
    name: "书房知性",
    tag: "专业感",
    tone: "study",
    prompt: "书房、台灯、纸张或电脑桌面氛围，字体稳重，画面偏暖，适合知识博主、复盘和个人 IP 深度观点。",
  },
  {
    id: "workplace-card",
    name: "职场卡片",
    tag: "效率",
    tone: "work",
    prompt: "办公桌、屏幕、文件卡片和清晰步骤感，主标题放大，适合职场、AI 工具、效率工作流内容。",
  },
  {
    id: "sticker-energy",
    name: "贴纸活力",
    tag: "年轻感",
    tone: "sticker",
    prompt: "白底或浅色底，大量克制贴纸、星星、箭头、波点，标题像贴纸拼贴，适合轻松种草和实用分享。",
  },
  {
    id: "dashed-outline",
    name: "虚线装饰",
    tag: "亲和",
    tone: "dashed",
    prompt: "主体周围有虚线框、手绘圈注和小标签，背景干净，标题不过度拥挤，适合经验分享和案例拆解。",
  },
  {
    id: "giant-background-text",
    name: "背景大字",
    tag: "记忆点",
    tone: "giant",
    prompt: "画面后方有巨型半透明关键词，前景标题和主体形成强对比，适合观点、情绪和强结论内容。",
  },
  {
    id: "question-thinking",
    name: "思考提问",
    tag: "互动",
    tone: "question",
    prompt: "人物或物件带思考姿态，标题用问句结构，边缘有问号、便签和小批注，适合引发评论和收藏。",
  },
  {
    id: "split-label",
    name: "分屏标签",
    tag: "对比",
    tone: "split",
    prompt: "左右或上下分屏，对比前后、A/B、误区/正确做法，标签清晰，适合测评、避坑、教程类内容。",
  },
  {
    id: "cozy-home",
    name: "温馨居家",
    tag: "疗愈",
    tone: "cozy",
    prompt: "暖色家居、咖啡、桌面、柔光窗边，标题温柔但清楚，适合成长、情绪、生活复盘和温暖故事。",
  },
  {
    id: "career-bold",
    name: "职场大字",
    tag: "强观点",
    tone: "career",
    prompt: "超大黑白或深色标题压屏，局部黄色/红色强调，职场海报感，适合强结论、收入、转型和效率主题。",
  },
  {
    id: "dark-glow",
    name: "深色发光",
    tag: "科技",
    tone: "glow",
    prompt: "深色背景、边缘发光、玻璃卡片、霓虹细线，标题清晰，适合 AI、工具、未来感和数字产品内容。",
  },
  {
    id: "home-motivation",
    name: "居家励志",
    tag: "成长",
    tone: "motivation",
    prompt: "居家场景和温柔励志标题，人物或主体自然放松，画面有金色光影和轻微胶片颗粒。",
  },
  {
    id: "quiet-negative-space",
    name: "情绪留白",
    tag: "高级",
    tone: "quiet",
    prompt: "大面积留白，一个核心物件或安静人物，标题少而有力，适合高级感、反思、人生选择和个人表达。",
  },
  {
    id: "data-collage",
    name: "信息拼贴",
    tag: "干货",
    tone: "data",
    prompt: "截图、便签、数据卡片和流程箭头拼贴，像创作者工作台，适合工具测评、教程、清单和 SOP。",
  },
  {
    id: "film-ticket",
    name: "胶片票根",
    tag: "电影感",
    tone: "film",
    prompt: "电影节票根、胶片边框、暖红渐变和排片信息感，标题像海报片名，适合故事、观点和戏剧化表达。",
  },
];

const fontStyles = [
  { id: "default", name: "默认风格", sample: "ABC", prompt: "现代中文黑体，清楚耐看，标题粗细有层级。" },
  { id: "bold", name: "大粗黑体", sample: "ABC", prompt: "超粗黑体或标题黑体，字形厚重，适合强观点和大标题。" },
  { id: "variety", name: "综艺体", sample: "ABC", prompt: "综艺感标题字，活泼、有描边和轻微弹跳感，但不要幼稚。" },
  { id: "songti", name: "稳重宋体", sample: "ABC", prompt: "高对比宋体或新宋体，稳重、有知识感，适合深度内容。" },
  { id: "rounded", name: "圆体", sample: "ABC", prompt: "圆润中文字体，亲和、柔软，适合生活方式和成长内容。" },
  { id: "handwritten", name: "手写体", sample: "ABC", prompt: "自然手写中文，像笔记批注，适合真实经验和日记风格。" },
  { id: "calligraphy", name: "书法体", sample: "ABC", prompt: "克制书法感标题，笔锋清楚，适合东方审美和情绪表达。" },
];

const els = {
  accessCard: $("#accessCard"),
  accessCode: $("#accessCode"),
  accessHint: $("#accessHint"),
  fileInput: $("#fileInput"),
  fileHint: $("#fileHint"),
  referenceImageInput: $("#referenceImageInput"),
  referenceImageHint: $("#referenceImageHint"),
  referencePreview: $("#referencePreview"),
  referenceImagePreview: $("#referenceImagePreview"),
  referenceImageName: $("#referenceImageName"),
  referenceImageMeta: $("#referenceImageMeta"),
  clearReferenceImage: $("#clearReferenceImage"),
  material: $("#material"),
  persona: $("#persona"),
  style: $("#style"),
  presetGrid: $("#presetGrid"),
  detailCoverTitle: $("#detailCoverTitle"),
  detailCoverSubtitle: $("#detailCoverSubtitle"),
  detailSmallText: $("#detailSmallText"),
  fontGrid: $("#fontGrid"),
  aspectRatio: $("#aspectRatio"),
  detailStickers: $("#detailStickers"),
  detailRequirements: $("#detailRequirements"),
  batchVariants: $("#batchVariants"),
  generateDraft: $("#generateDraft"),
  generateCovers: $("#generateCovers"),
  railStatus: $("#railStatus"),
  providerPill: $("#providerPill"),
  steps: $$(".step"),
  panels: $$(".stage-panel"),
  coverTitle: $("#coverTitle"),
  coverSubtitle: $("#coverSubtitle"),
  publishTitle: $("#publishTitle"),
  body: $("#body"),
  hashtags: $("#hashtags"),
  coverPromptList: $("#coverPromptList"),
  coverGrid: $("#coverGrid"),
  revisionText: $("#revisionText"),
  regenerateSelected: $("#regenerateSelected"),
  finalizeCover: $("#finalizeCover"),
  finalPackage: $("#finalPackage"),
  copyPackage: $("#copyPackage"),
  downloadPng: $("#downloadPng"),
  downloadMarkdown: $("#downloadMarkdown"),
  downloadText: $("#downloadText"),
  downloadZip: $("#downloadZip"),
  previewScreen: $("#previewScreen"),
  previewBadge: $("#previewBadge"),
  miniLog: $("#miniLog"),
  toast: $("#toast"),
};

const state = {
  status: null,
  phase: "draft",
  packageData: null,
  covers: [],
  selectedCoverId: null,
  finalCoverId: null,
  referenceImage: null,
  selectedPresetId: coverTemplatePresets[0].id,
  selectedFontId: fontStyles[0].id,
};

const NETWORK_ERROR_MESSAGE = "本地生成服务没有连接上。请确认预览服务正在运行，然后刷新页面再试。";

function accessCode() {
  return els.accessCode.value.trim();
}

function persistAccessCode() {
  const value = accessCode();
  if (value) localStorage.setItem("xhs-cover-access-code", value);
}

function setBusy(button, label) {
  button.dataset.originalText = button.textContent;
  button.textContent = label;
  button.disabled = true;
}

function restoreButton(button, fallback) {
  button.textContent = button.dataset.originalText || fallback;
  button.disabled = false;
}

function toast(message) {
  els.toast.textContent = message;
  els.toast.hidden = false;
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => {
    els.toast.hidden = true;
  }, 3200);
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function splitHashtags(value) {
  return String(value || "")
    .split(/[\s,，、|/]+/)
    .map((tag) => tag.replace(/^#+/, "").trim())
    .filter(Boolean);
}

function friendlyErrorMessage(error, fallback = "请求失败，请稍后重试。") {
  if (error instanceof TypeError || error?.message === "Failed to fetch") return NETWORK_ERROR_MESSAGE;
  return error?.message || fallback;
}

function restoreSelectValue(select, value) {
  if ([...select.options].some((option) => option.value === value)) select.value = value;
}

function selectedPreset() {
  return coverTemplatePresets.find((preset) => preset.id === state.selectedPresetId) || coverTemplatePresets[0];
}

function selectedFont() {
  return fontStyles.find((font) => font.id === state.selectedFontId) || fontStyles[0];
}

function normalizeCoverConfig(config = {}) {
  const preset = coverTemplatePresets.find((item) => item.id === config.templateId) || coverTemplatePresets[0];
  const font = fontStyles.find((item) => item.id === config.fontId) || fontStyles[0];
  return {
    templateId: preset.id,
    templateName: preset.name,
    templatePrompt: preset.prompt,
    fontId: font.id,
    fontName: font.name,
    fontPrompt: font.prompt,
    mainTitle: String(config.mainTitle || "").trim(),
    subtitle: String(config.subtitle || "").trim(),
    smallText: String(config.smallText || "").trim(),
    stickers: String(config.stickers || "").trim(),
    aspectRatio: String(config.aspectRatio || "3:4"),
    extraRequirements: String(config.extraRequirements || "").trim(),
    batchVariants: Boolean(config.batchVariants),
  };
}

function currentCoverConfig() {
  const preset = selectedPreset();
  const font = selectedFont();
  return normalizeCoverConfig({
    templateId: preset.id,
    templateName: preset.name,
    templatePrompt: preset.prompt,
    fontId: font.id,
    fontName: font.name,
    fontPrompt: font.prompt,
    mainTitle: els.detailCoverTitle.value,
    subtitle: els.detailCoverSubtitle.value,
    smallText: els.detailSmallText.value,
    stickers: els.detailStickers.value,
    aspectRatio: els.aspectRatio.value,
    extraRequirements: els.detailRequirements.value,
    batchVariants: els.batchVariants.checked,
  });
}

function applyCoverConfig(config = {}) {
  const normalized = normalizeCoverConfig(config);
  state.selectedPresetId = normalized.templateId;
  state.selectedFontId = normalized.fontId;
  els.detailCoverTitle.value = normalized.mainTitle;
  els.detailCoverSubtitle.value = normalized.subtitle;
  els.detailSmallText.value = normalized.smallText;
  els.detailStickers.value = normalized.stickers;
  restoreSelectValue(els.aspectRatio, normalized.aspectRatio);
  els.detailRequirements.value = normalized.extraRequirements;
  els.batchVariants.checked = normalized.batchVariants;
  renderPresetGrid();
  renderFontGrid();
}

function syncDetailFieldsFromPackage(data) {
  if (!data) return;
  if (!els.detailCoverTitle.value.trim()) els.detailCoverTitle.value = data.coverTitle || "";
  if (!els.detailCoverSubtitle.value.trim()) els.detailCoverSubtitle.value = data.coverSubtitle || "";
}

function imageSizeForAspectRatio(aspectRatio) {
  return aspectRatio === "1:1" ? "1024x1024" : "1024x1536";
}

async function postJSON(path, body) {
  let response;
  try {
    response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, accessCode: accessCode() }),
    });
  } catch (error) {
    throw new Error(friendlyErrorMessage(error));
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "请求失败，请稍后重试。");
  return payload;
}

function dataUrlExt(dataUrl) {
  const match = String(dataUrl || "").match(/^data:image\/(png|jpeg|jpg|webp|svg\+xml);/);
  if (!match) return "png";
  if (match[1] === "jpeg") return "jpg";
  if (match[1] === "svg+xml") return "svg";
  return match[1];
}

function dataUrlToBlob(dataUrl) {
  const [meta, b64] = String(dataUrl || "").split(",");
  const mime = meta.match(/^data:(.*?);base64$/)?.[1] || "application/octet-stream";
  const bytes = Uint8Array.from(atob(b64 || ""), (char) => char.charCodeAt(0));
  return new Blob([bytes], { type: mime });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1200);
}

function selectedCover() {
  return state.covers.find((cover) => cover.id === state.selectedCoverId) || null;
}

function finalCover() {
  return state.covers.find((cover) => cover.id === state.finalCoverId) || selectedCover();
}

function showStep(stepName) {
  state.phase = stepName;
  els.steps.forEach((step) => step.classList.toggle("active", step.dataset.step === stepName));
  els.panels.forEach((panel) => panel.classList.toggle("active", panel.dataset.panel === stepName));
  saveDraftState();
}

async function openImageCache() {
  if (!("indexedDB" in window)) return null;
  return new Promise((resolve) => {
    const request = indexedDB.open("xhs-cover-package-images", 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("covers")) db.createObjectStore("covers", { keyPath: "id" });
      if (!db.objectStoreNames.contains("references")) db.createObjectStore("references", { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

async function putImageCache(storeName, value) {
  const db = await openImageCache();
  if (!db) return;
  await new Promise((resolve) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).put(value);
    tx.oncomplete = resolve;
    tx.onerror = resolve;
  });
  db.close();
}

async function getImageCache(storeName, id) {
  const db = await openImageCache();
  if (!db) return null;
  const value = await new Promise((resolve) => {
    const tx = db.transaction(storeName, "readonly");
    const request = tx.objectStore(storeName).get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => resolve(null);
    tx.oncomplete = () => db.close();
    tx.onerror = () => db.close();
  });
  return value;
}

async function deleteImageCache(storeName, id) {
  const db = await openImageCache();
  if (!db) return;
  await new Promise((resolve) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).delete(id);
    tx.oncomplete = resolve;
    tx.onerror = resolve;
  });
  db.close();
}

async function cacheCoverImage(id, imageUrl) {
  if (!imageUrl?.startsWith("data:image/")) return;
  await putImageCache("covers", { id, imageUrl, updatedAt: new Date().toISOString() });
}

async function readCoverImage(id) {
  return (await getImageCache("covers", id))?.imageUrl || null;
}

async function cacheReferenceImage(referenceImage) {
  if (!referenceImage?.dataUrl?.startsWith("data:image/")) return;
  await putImageCache("references", { id: "current", image: referenceImage, updatedAt: new Date().toISOString() });
}

async function readReferenceImage() {
  return (await getImageCache("references", "current"))?.image || null;
}

async function clearReferenceImageCache() {
  await deleteImageCache("references", "current");
}

function saveDraftState() {
  const covers = state.covers.map((cover) => ({
    ...cover,
    imageUrl: cover.imageUrl ? "__indexeddb__" : "",
    history: (cover.history || []).map((item) => ({ ...item, imageUrl: item.imageUrl ? "__indexeddb__" : "" })),
  }));
  localStorage.setItem(
    "xhs-cover-package-draft",
    JSON.stringify({
      material: els.material.value,
      persona: els.persona.value,
      style: els.style.value,
      coverConfig: currentCoverConfig(),
      phase: state.phase,
      packageData: state.packageData,
      covers,
      referenceImage: state.referenceImage ? { ...state.referenceImage, dataUrl: "__indexeddb__" } : null,
      selectedCoverId: state.selectedCoverId,
      finalCoverId: state.finalCoverId,
    })
  );
}

async function restoreDraftState() {
  const access = localStorage.getItem("xhs-cover-access-code");
  if (access) els.accessCode.value = access;

  const raw = localStorage.getItem("xhs-cover-package-draft");
  if (!raw) return;
  try {
    const draft = JSON.parse(raw);
    els.material.value = draft.material || "";
    restoreSelectValue(els.persona, draft.persona);
    restoreSelectValue(els.style, draft.style);
    applyCoverConfig(draft.coverConfig || {});
    state.packageData = draft.packageData || null;
    state.covers = Array.isArray(draft.covers) ? draft.covers : [];
    state.referenceImage = null;
    state.selectedCoverId = draft.selectedCoverId || null;
    state.finalCoverId = draft.finalCoverId || null;

    for (const cover of state.covers) {
      const imageUrl = await readCoverImage(cover.id);
      if (imageUrl) cover.imageUrl = imageUrl;
    }
    state.referenceImage = await readReferenceImage();
    renderReferencePreview();

    if (state.packageData) {
      renderDraft();
      renderCoverGrid();
      renderPreview();
      renderFinalPackage();
      showStep(draft.phase || "draft");
    }
  } catch {
    localStorage.removeItem("xhs-cover-package-draft");
  }
}

async function checkStatus() {
  try {
    const response = await fetch("/api/app/status");
    state.status = await response.json();
    const ready = state.status.copyConfigured && state.status.imageConfigured;
    els.providerPill.querySelector("span:last-child").textContent = ready
      ? `${state.status.copyModel} + ${state.status.imageModel}`
      : "AI 接口未配置";
    els.providerPill.classList.toggle("ready", ready);
    els.accessCard.classList.toggle("not-required", !state.status.accessRequired);
    els.accessHint.textContent = state.status.accessRequired ? "公网生成需要访问码" : "当前未启用访问码";
  } catch (error) {
    els.providerPill.querySelector("span:last-child").textContent = "服务未连接";
    els.providerPill.classList.remove("ready");
    els.accessHint.textContent = "本地生成服务未连接";
    toast(friendlyErrorMessage(error));
  }
}

function collectPackageFromInputs() {
  if (!state.packageData) return null;
  const coverConfig = currentCoverConfig();
  const coverPrompts = $$(".prompt-card").map((card, index) => ({
    id: state.packageData.coverPrompts[index]?.id || `cover-${index + 1}`,
    name: card.querySelector("[data-field='name']").value.trim() || `版本 ${index + 1}`,
    description: card.querySelector("[data-field='description']").value.trim(),
    prompt: card.querySelector("[data-field='prompt']").value.trim(),
  }));
  state.packageData = {
    ...state.packageData,
    coverTitle: coverConfig.mainTitle || els.coverTitle.value.trim(),
    coverSubtitle: coverConfig.subtitle || els.coverSubtitle.value.trim(),
    publishTitle: els.publishTitle.value.trim(),
    body: els.body.value.trim(),
    hashtags: splitHashtags(els.hashtags.value),
    coverConfig,
    coverPrompts,
  };
  els.coverTitle.value = state.packageData.coverTitle;
  els.coverSubtitle.value = state.packageData.coverSubtitle;
  return state.packageData;
}

async function handleFileUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const ext = file.name.toLowerCase().split(".").pop();
  if (["doc", "pdf", "mp4", "mov", "m4v", "avi"].includes(ext) || file.type.startsWith("video/")) {
    els.fileHint.textContent = ".doc / PDF / 视频暂不支持。v1 请上传 TXT、Markdown 或 DOCX。";
    toast("这个格式下一版再接，先用文本文件或直接粘贴文案。");
    return;
  }

  try {
    els.fileHint.textContent = "正在读取文件...";
    if (["txt", "md"].includes(ext)) {
      els.material.value = await file.text();
    } else if (ext === "docx") {
      const response = await fetch("/api/file/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          "X-File-Name": encodeURIComponent(file.name),
          "X-Access-Code": accessCode(),
        },
        body: await file.arrayBuffer(),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "DOCX 读取失败。");
      els.material.value = payload.text;
    } else {
      throw new Error("暂不支持这个文件格式。");
    }
    els.fileHint.textContent = `已读取：${file.name}`;
    saveDraftState();
    toast("文案已经放进输入框。");
  } catch (error) {
    const message = friendlyErrorMessage(error, "文件读取失败。");
    els.fileHint.textContent = message;
    toast(message);
  } finally {
    event.target.value = "";
  }
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("参考图读取失败。"));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("参考图无法识别，请换一张图片。"));
    image.src = dataUrl;
  });
}

async function prepareReferenceImage(file) {
  if (!file.type.startsWith("image/")) throw new Error("请上传 PNG、JPG 或 WEBP 参考图。");
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    throw new Error("参考图只支持 PNG、JPG 或 WEBP。");
  }
  if (file.size > 12 * 1024 * 1024) throw new Error("参考图太大了，请控制在 12MB 以内。");

  const originalDataUrl = await fileToDataURL(file);
  const image = await loadImage(originalDataUrl);
  const maxEdge = 1280;
  const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.fillStyle = "#fffdf7";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  return {
    name: file.name,
    mimeType: "image/jpeg",
    width,
    height,
    dataUrl: canvas.toDataURL("image/jpeg", 0.88),
  };
}

function renderReferencePreview() {
  const reference = state.referenceImage;
  els.referencePreview.hidden = !reference;
  if (!reference) {
    els.referenceImagePreview.removeAttribute("src");
    els.referenceImageName.textContent = "参考图";
    els.referenceImageMeta.textContent = "已压缩到适合生成的尺寸";
    return;
  }
  els.referenceImagePreview.src = reference.dataUrl;
  els.referenceImageName.textContent = reference.name || "参考图";
  els.referenceImageMeta.textContent = `${reference.width || "-"} x ${reference.height || "-"}，生成封面时会参考`;
}

async function handleReferenceImageUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    els.referenceImageHint.textContent = "正在处理参考图...";
    state.referenceImage = await prepareReferenceImage(file);
    await cacheReferenceImage(state.referenceImage);
    renderReferencePreview();
    els.referenceImageHint.textContent = "参考图已加入，生成封面时会参考它的配色、质感或版式。";
    saveDraftState();
    toast("参考图已上传。");
  } catch (error) {
    const message = friendlyErrorMessage(error, "参考图上传失败。");
    els.referenceImageHint.textContent = message;
    toast(message);
  } finally {
    event.target.value = "";
  }
}

async function clearReferenceImage() {
  state.referenceImage = null;
  await clearReferenceImageCache();
  renderReferencePreview();
  els.referenceImageHint.textContent = "已移除参考图；之后会完全根据文案生成。";
  saveDraftState();
}

function renderPresetGrid() {
  els.presetGrid.innerHTML = coverTemplatePresets
    .map((preset) => {
      const selected = preset.id === state.selectedPresetId;
      return `
        <button class="preset-card ${selected ? "selected" : ""}" type="button" data-preset-id="${escapeHTML(preset.id)}">
          <span class="preset-art tone-${escapeHTML(preset.tone)}">
            <i></i>
            <b>${escapeHTML(preset.name.slice(0, 4))}</b>
            <em>${escapeHTML(preset.tag)}</em>
          </span>
          <strong>${escapeHTML(preset.name)}</strong>
          <small>${escapeHTML(preset.tag)}</small>
        </button>
      `;
    })
    .join("");

  $$(".preset-card").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedPresetId = button.dataset.presetId;
      renderPresetGrid();
      renderPreview();
      saveDraftState();
    });
  });
}

function renderFontGrid() {
  els.fontGrid.innerHTML = fontStyles
    .map((font) => {
      const selected = font.id === state.selectedFontId;
      return `
        <button class="font-card font-${escapeHTML(font.id)} ${selected ? "selected" : ""}" type="button" data-font-id="${escapeHTML(font.id)}">
          <b>${escapeHTML(font.sample)}</b>
          <strong>字体</strong>
          <small>${escapeHTML(font.name)}</small>
        </button>
      `;
    })
    .join("");

  $$(".font-card").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedFontId = button.dataset.fontId;
      renderFontGrid();
      renderPreview();
      saveDraftState();
    });
  });
}

function renderConfigPreview(config, data) {
  const title = config.mainTitle || data?.coverTitle || "封面主标题";
  const subtitle = config.subtitle || data?.coverSubtitle || "副标题";
  const smallText = config.smallText || "NEW NOTE";
  const stickers = splitHashtags(config.stickers).slice(0, 3);
  return `
    <div class="config-poster-preview tone-${escapeHTML(selectedPreset().tone)} font-${escapeHTML(config.fontId)}">
      <span class="preview-kicker">${escapeHTML(smallText)}</span>
      <strong>${escapeHTML(title)}</strong>
      <p>${escapeHTML(subtitle)}</p>
      <div class="preview-stickers">
        ${(stickers.length ? stickers : [selectedPreset().tag, config.fontName])
          .map((item) => `<i>${escapeHTML(item)}</i>`)
          .join("")}
      </div>
    </div>
  `;
}

async function generateDraft() {
  persistAccessCode();
  const material = els.material.value.trim();
  if (material.length < 10) {
    toast("先粘贴或上传一段完整文案。");
    return;
  }

  setBusy(els.generateDraft, "生成草稿中...");
  els.railStatus.textContent = "DeepSeek 正在整理封面标题、发布标题、正文、话题和 5 个封面方向。";
  try {
    state.packageData = await postJSON("/api/copy/generate", {
      material,
      persona: els.persona.value,
      style: els.style.value,
      referenceImageName: state.referenceImage?.name || "",
      coverConfig: currentCoverConfig(),
    });
    state.covers = [];
    state.selectedCoverId = null;
    state.finalCoverId = null;
    renderDraft();
    renderCoverGrid();
    renderPreview();
    renderFinalPackage();
    showStep("draft");
    els.generateCovers.disabled = false;
    els.railStatus.textContent = "草稿已生成。你可以先改标题、正文、话题或任意封面提示词。";
    toast("封面发布包草稿已生成。");
  } catch (error) {
    const message = friendlyErrorMessage(error, "生成失败。");
    toast(message);
    els.railStatus.textContent = message;
  } finally {
    restoreButton(els.generateDraft, "生成封面文案和发布包");
    saveDraftState();
  }
}

function renderDraft() {
  const data = state.packageData;
  if (!data) return;
  els.coverTitle.value = data.coverTitle || "";
  els.coverSubtitle.value = data.coverSubtitle || "";
  els.publishTitle.value = data.publishTitle || "";
  els.body.value = data.body || "";
  els.hashtags.value = (data.hashtags || []).map((tag) => `#${tag}`).join(" ");
  els.generateCovers.disabled = false;
  syncDetailFieldsFromPackage(data);

  els.coverPromptList.innerHTML = data.coverPrompts
    .map(
      (prompt, index) => `
        <article class="prompt-card">
          <div class="prompt-index">${String(index + 1).padStart(2, "0")}</div>
          <label>
            <span>版本名称</span>
            <input data-field="name" value="${escapeHTML(prompt.name)}" />
          </label>
          <label>
            <span>视觉策略</span>
            <input data-field="description" value="${escapeHTML(prompt.description)}" />
          </label>
          <label class="prompt-text">
            <span>生图提示词</span>
            <textarea data-field="prompt" rows="5">${escapeHTML(prompt.prompt)}</textarea>
          </label>
        </article>
      `
    )
    .join("");
}

async function generateOneCover(cover, revision = "") {
  cover.status = "loading";
  cover.error = "";
  renderCoverGrid();
  const payload = await postJSON("/api/image/generate", {
    coverTitle: state.packageData.coverTitle,
    coverSubtitle: state.packageData.coverSubtitle,
    basePrompt: cover.prompt,
    revision,
    coverConfig: currentCoverConfig(),
    size: imageSizeForAspectRatio(currentCoverConfig().aspectRatio),
    referenceImage: state.referenceImage
      ? {
          name: state.referenceImage.name,
          mimeType: state.referenceImage.mimeType,
          dataUrl: state.referenceImage.dataUrl,
        }
      : null,
  });
  if (cover.imageUrl) {
    cover.history = [
      ...(cover.history || []),
      {
        imageUrl: cover.imageUrl,
        prompt: cover.generatedPrompt || cover.prompt,
        note: revision || "原始版本",
        createdAt: new Date().toISOString(),
      },
    ].slice(-5);
  }
  cover.imageUrl = payload.imageUrl;
  cover.generatedPrompt = payload.prompt;
  cover.status = "ready";
  await cacheCoverImage(cover.id, cover.imageUrl);
  if (!state.selectedCoverId) state.selectedCoverId = cover.id;
  renderCoverGrid();
  renderPreview();
  saveDraftState();
}

async function generateCovers() {
  const data = collectPackageFromInputs();
  if (!data) {
    toast("先生成文案草稿。");
    return;
  }
  persistAccessCode();
  setBusy(els.generateCovers, "生成 5 版封面中...");
  state.covers = data.coverPrompts.map((prompt, index) => ({
    ...prompt,
    id: prompt.id || `cover-${index + 1}`,
    status: "pending",
    imageUrl: "",
    error: "",
    history: [],
  }));
  state.selectedCoverId = state.covers[0]?.id || null;
  state.finalCoverId = null;
  showStep("covers");
  renderCoverGrid();
  renderPreview();

  let completed = 0;
  for (const cover of state.covers) {
    try {
      els.railStatus.textContent = `正在生成封面 ${completed + 1}/5：${cover.name}`;
      await generateOneCover(cover);
    } catch (error) {
      cover.status = "error";
      cover.error = friendlyErrorMessage(error, "生成失败。");
      renderCoverGrid();
      toast(`${cover.name} 生成失败，可以单独重试。`);
    }
    completed += 1;
  }
  restoreButton(els.generateCovers, "确认并生成 5 版封面");
  els.generateCovers.disabled = false;
  els.railStatus.textContent = "5 个封面版本已处理完。选择最顺眼的一张，或者在修改窗口里重生成。";
  renderCoverGrid();
  renderPreview();
  saveDraftState();
}

function renderCoverGrid() {
  if (!state.covers.length) {
    els.coverGrid.innerHTML = '<div class="empty-state">确认方案后会生成 5 个封面版本。</div>';
    els.regenerateSelected.disabled = true;
    els.finalizeCover.disabled = true;
    return;
  }

  els.coverGrid.innerHTML = state.covers
    .map((cover) => {
      const selected = cover.id === state.selectedCoverId;
      const image = cover.imageUrl
        ? `<img src="${escapeHTML(cover.imageUrl)}" alt="${escapeHTML(cover.name)}" />`
        : `<div class="cover-loading">${cover.status === "error" ? "生成失败" : cover.status === "loading" ? "生成中" : "等待"}</div>`;
      return `
        <button class="cover-card ${selected ? "selected" : ""} ${cover.status}" data-cover-id="${escapeHTML(cover.id)}">
          <span class="cover-card-label">${escapeHTML(cover.name)}</span>
          <div class="cover-card-art">${image}</div>
          <small>${cover.error ? escapeHTML(cover.error) : escapeHTML(cover.description)}</small>
        </button>
      `;
    })
    .join("");

  $$(".cover-card").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedCoverId = button.dataset.coverId;
      renderCoverGrid();
      renderPreview();
      saveDraftState();
    });
  });

  const canUseSelected = Boolean(selectedCover()?.imageUrl);
  els.regenerateSelected.disabled = !selectedCover();
  els.finalizeCover.disabled = !canUseSelected;
}

function renderPreview() {
  const cover = selectedCover() || finalCover();
  const config = currentCoverConfig();
  els.previewScreen.dataset.aspect = config.aspectRatio || "3:4";
  if (!cover?.imageUrl) {
    els.previewScreen.innerHTML = renderConfigPreview(config, state.packageData);
    els.previewBadge.textContent = cover?.status === "loading" ? "生成中" : "未生成";
    els.miniLog.textContent = `当前模板：${selectedPreset().name}；字体：${selectedFont().name}。`;
    return;
  }

  els.previewScreen.innerHTML = `<img src="${escapeHTML(cover.imageUrl)}" alt="${escapeHTML(cover.name)}" />`;
  els.previewBadge.textContent = cover.name || "已选封面";
  const historyCount = cover.history?.length || 0;
  els.miniLog.textContent = historyCount ? `这张封面已有 ${historyCount} 个历史版本。` : "这张封面还没有重生成历史。";
}

async function regenerateSelected() {
  const cover = selectedCover();
  if (!cover) {
    toast("先选中一张封面。");
    return;
  }
  const revision = els.revisionText.value.trim();
  if (!revision) {
    toast("先写一句修改意见。");
    return;
  }
  persistAccessCode();
  setBusy(els.regenerateSelected, "重生成中...");
  try {
    collectPackageFromInputs();
    await generateOneCover(cover, revision);
    els.revisionText.value = "";
    toast("选中封面已按意见重生成。");
  } catch (error) {
    cover.status = "error";
    cover.error = friendlyErrorMessage(error, "重生成失败。");
    renderCoverGrid();
    toast(cover.error);
  } finally {
    restoreButton(els.regenerateSelected, "按意见重生成选中封面");
    els.regenerateSelected.disabled = !selectedCover();
    saveDraftState();
  }
}

function finalizeCover() {
  const cover = selectedCover();
  if (!cover?.imageUrl) {
    toast("先选择一张已经生成成功的封面。");
    return;
  }
  collectPackageFromInputs();
  state.finalCoverId = cover.id;
  renderFinalPackage();
  showStep("final");
  toast("最终发布包已整理好。");
}

function finalPackageText() {
  const data = state.packageData;
  const cover = finalCover();
  const filename = cover?.imageUrl ? `cover-final.${dataUrlExt(cover.imageUrl)}` : "cover-final.png";
  return publishText(data, filename);
}

function renderFinalPackage() {
  const data = state.packageData;
  const cover = finalCover();
  const ready = Boolean(data && cover?.imageUrl);
  [els.copyPackage, els.downloadPng, els.downloadMarkdown, els.downloadText, els.downloadZip].forEach((button) => {
    button.disabled = !ready;
  });
  if (!ready) {
    els.finalPackage.innerHTML = '<div class="empty-state">确认最终封面后，这里会出现封面图、发布标题、正文和话题。</div>';
    return;
  }

  els.finalPackage.innerHTML = `
    <div class="final-cover">
      <img src="${escapeHTML(cover.imageUrl)}" alt="最终封面" />
    </div>
    <article class="final-copy">
      <span>发布标题</span>
      <h4>${escapeHTML(data.publishTitle)}</h4>
      <span>发布正文</span>
      <p>${escapeHTML(data.body).replaceAll("\n", "<br />")}</p>
      <span>话题</span>
      <p class="hashtag-line">${data.hashtags.map((tag) => `#${escapeHTML(tag)}`).join(" ")}</p>
    </article>
  `;
}

async function copyPackage() {
  await navigator.clipboard.writeText(finalPackageText());
  toast("发布标题、正文和话题已复制。");
}

function downloadPng() {
  const cover = finalCover();
  if (!cover?.imageUrl) return;
  const ext = dataUrlExt(cover.imageUrl);
  downloadBlob(dataUrlToBlob(cover.imageUrl), `cover-final.${ext}`);
}

function downloadText() {
  const blob = new Blob([finalPackageText()], { type: "text/plain;charset=utf-8" });
  downloadBlob(blob, "发布文案.txt");
}

function downloadMarkdown() {
  const data = state.packageData;
  const cover = finalCover();
  if (!data || !cover?.imageUrl) return;
  const filename = `cover-final.${dataUrlExt(cover.imageUrl)}`;
  const blob = new Blob([publishMarkdown(data, filename)], { type: "text/markdown;charset=utf-8" });
  downloadBlob(blob, "发布文案.md");
}

async function downloadZip() {
  const cover = finalCover();
  if (!cover?.imageUrl) return;
  setBusy(els.downloadZip, "打包中...");
  try {
    const payload = await postJSON("/api/export/prepare", {
      packageData: state.packageData,
      imageUrl: cover.imageUrl,
    });
    window.location.href = payload.downloadUrl;
    toast("已开始下载完整包。");
  } catch (error) {
    toast(friendlyErrorMessage(error, "打包失败。"));
  } finally {
    window.setTimeout(() => restoreButton(els.downloadZip, "下载完整包"), 1000);
  }
}

function bindEvents() {
  els.fileInput.addEventListener("change", handleFileUpload);
  els.referenceImageInput.addEventListener("change", handleReferenceImageUpload);
  els.clearReferenceImage.addEventListener("click", clearReferenceImage);
  els.generateDraft.addEventListener("click", generateDraft);
  els.generateCovers.addEventListener("click", generateCovers);
  els.regenerateSelected.addEventListener("click", regenerateSelected);
  els.finalizeCover.addEventListener("click", finalizeCover);
  els.copyPackage.addEventListener("click", copyPackage);
  els.downloadPng.addEventListener("click", downloadPng);
  els.downloadMarkdown.addEventListener("click", downloadMarkdown);
  els.downloadText.addEventListener("click", downloadText);
  els.downloadZip.addEventListener("click", downloadZip);
  els.accessCode.addEventListener("input", persistAccessCode);
  els.material.addEventListener("input", saveDraftState);
  els.persona.addEventListener("change", saveDraftState);
  els.style.addEventListener("change", saveDraftState);
  [
    els.detailCoverTitle,
    els.detailCoverSubtitle,
    els.detailSmallText,
    els.aspectRatio,
    els.detailStickers,
    els.detailRequirements,
    els.batchVariants,
  ].forEach((element) => {
    element.addEventListener("input", () => {
      renderPreview();
      saveDraftState();
    });
    element.addEventListener("change", () => {
      renderPreview();
      saveDraftState();
    });
  });
  els.steps.forEach((step) => {
    step.addEventListener("click", () => showStep(step.dataset.step));
  });
}

renderPresetGrid();
renderFontGrid();
bindEvents();
await restoreDraftState();
renderReferencePreview();
renderPreview();
await checkStatus();
