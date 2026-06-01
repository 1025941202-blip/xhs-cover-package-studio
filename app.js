import { publishMarkdown, publishText } from "./xhs-cover-rules.mjs";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

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
    .split(/[\s,，]+/)
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
  const coverPrompts = $$(".prompt-card").map((card, index) => ({
    id: state.packageData.coverPrompts[index]?.id || `cover-${index + 1}`,
    name: card.querySelector("[data-field='name']").value.trim() || `版本 ${index + 1}`,
    description: card.querySelector("[data-field='description']").value.trim(),
    prompt: card.querySelector("[data-field='prompt']").value.trim(),
  }));
  state.packageData = {
    ...state.packageData,
    coverTitle: els.coverTitle.value.trim(),
    coverSubtitle: els.coverSubtitle.value.trim(),
    publishTitle: els.publishTitle.value.trim(),
    body: els.body.value.trim(),
    hashtags: splitHashtags(els.hashtags.value),
    coverPrompts,
  };
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
  if (!cover?.imageUrl) {
    els.previewScreen.innerHTML = `
      <div class="poster-placeholder">
        <span>Cover</span>
        <strong>${state.packageData ? escapeHTML(state.packageData.coverTitle) : "等待生成"}</strong>
        <p>5 个版本会在这里预览。</p>
      </div>
    `;
    els.previewBadge.textContent = cover?.status === "loading" ? "生成中" : "未生成";
    els.miniLog.textContent = "修改窗口会保留当前版本的重生成记录。";
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
  els.steps.forEach((step) => {
    step.addEventListener("click", () => showStep(step.dataset.step));
  });
}

bindEvents();
await restoreDraftState();
renderReferencePreview();
await checkStatus();
