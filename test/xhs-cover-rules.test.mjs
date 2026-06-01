import assert from "node:assert/strict";
import test from "node:test";
import { buildCoverPrompt, buildCopyPrompt, normalizeCopyPackage, publishMarkdown, publishText } from "../xhs-cover-rules.mjs";

test("copy prompt asks for five cover directions and publish package fields", () => {
  const prompt = buildCopyPrompt({
    material: "这是一段关于 AI 提效的原始文案。",
    persona: "AI + IP 实战，小白友好",
    style: "根据文案自动匹配",
    referenceImageName: "参考海报.png",
  });

  assert.match(prompt, /coverPrompts\[5\]/);
  assert.match(prompt, /publishTitle/);
  assert.match(prompt, /话题 5-8 个/);
  assert.match(prompt, /AI 直接生成中文标题/);
  assert.match(prompt, /5 个封面方向必须有真实差异/);
  assert.match(prompt, /参考海报\.png/);
});

test("normalizes a complete cover package into five editable cover prompts", () => {
  const normalized = normalizeCopyPackage({
    coverTitle: "普通人也能做出高级封面",
    coverSubtitle: "5 个提示词边界",
    publishTitle: "我终于搞懂 AI 封面为什么总翻车了",
    body: "正文内容",
    hashtags: ["AI封面", "#小红书运营", "提示词"],
    coverPrompts: Array.from({ length: 6 }, (_, index) => ({
      name: `版本 ${index + 1}`,
      description: "黑红大师级 UI 海报质感",
      prompt: `生成第 ${index + 1} 张封面`,
    })),
  });

  assert.equal(normalized.coverPrompts.length, 5);
  assert.deepEqual(normalized.hashtags, ["AI封面", "小红书运营", "提示词"]);
  assert.equal(normalized.coverPrompts[0].id, "cover-1");
});

test("cover prompt keeps each version distinct and can carry reference image notes", () => {
  const prompt = buildCoverPrompt({
    coverTitle: "别再让 AI 乱画封面",
    coverSubtitle: "先给边界，再要高级感",
    basePrompt: "雾蓝背景，模块化知识卡片，三段步骤",
    revision: "标题更短，颜色更清爽一点",
    referenceImageName: "参考图.jpg",
  });

  assert.match(prompt, /小红书封面/);
  assert.match(prompt, /不要把所有版本统一成红黑风格/);
  assert.match(prompt, /构图和色彩上明显不同/);
  assert.match(prompt, /参考图\.jpg/);
  assert.match(prompt, /标题更短/);
  assert.match(prompt, /中文标题必须清晰可读/);
});

test("publish exports include title body hashtags and selected cover filename", () => {
  const packageData = {
    publishTitle: "AI 封面不翻车的关键",
    body: "先说明用户，再说明用途。",
    hashtags: ["AI封面", "小红书运营"],
  };

  const markdown = publishMarkdown(packageData, "cover-final.png");
  const text = publishText(packageData, "cover-final.png");

  assert.match(markdown, /# AI 封面不翻车的关键/);
  assert.match(markdown, /cover-final\.png/);
  assert.match(text, /#AI封面 #小红书运营/);
});
