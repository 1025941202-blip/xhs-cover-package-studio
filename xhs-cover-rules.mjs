const coverStyleDirections = [
  {
    name: "黑红大师级主视觉",
    description: "大面积暗黑背景，珊瑚红到深酒红渐变，顶部巨型粗标题，像强冲击小红书封面。",
  },
  {
    name: "悬浮作品卡片",
    description: "人物或主体居中，周围漂浮 4-6 张网页作品卡片，玻璃卡片有红色边缘光。",
  },
  {
    name: "影棚人物海报",
    description: "黑红影棚光、人物前景伸手互动感，背景像 UI 案例墙，标题压迫感强。",
  },
  {
    name: "红色渐变案例墙",
    description: "深黑空间里叠加红色烟雾光、半透明 UI 截图卡、轻微景深和电影海报层次。",
  },
  {
    name: "巨型标题冲击版",
    description: "封面上半部使用超大中文标题，红白渐变字效，下半部堆叠作品卡和内容线索。",
  },
];

function cleanText(value, fallback = "") {
  return String(value ?? fallback).trim();
}

function cleanHashtag(value) {
  return cleanText(value).replace(/^#+/, "").replace(/\s+/g, "");
}

export function buildCopyPrompt({ material, persona, style }) {
  return [
    "你是小红书封面策划、发布文案编辑和 AI 生图提示词导演。",
    "请根据用户给的文案/素材，生成一份小红书封面发布包草稿。",
    "",
    "输出必须是严格 JSON，不要 Markdown，不要解释。",
    "JSON 字段：",
    "{",
    '  "coverTitle": "封面主标题，短、强、有点击理由，适合 AI 直接生成中文标题",',
    '  "coverSubtitle": "封面副标题，12 字以内，可为空",',
    '  "publishTitle": "小红书发布标题，15-25 字，口语化、有点击欲",',
    '  "body": "发布正文，保留原文核心，手机阅读友好，有信息量，不油腻",',
    '  "hashtags": ["话题1", "话题2"],',
    '  "coverPrompts": [',
    '    { "name": "版本名称", "description": "这个版本的视觉策略", "prompt": "完整中文生图提示词" }',
    "  ]",
    "}",
    "",
    "硬性要求：",
    "- coverPrompts[5] 必须正好给出 5 个封面方向。",
    "- 每个封面方向都必须包含同一个封面主标题和副标题，但构图、光影、背景元素要有区别。",
    "- 封面图由 AI 直接生成中文标题，不做后期模板叠字；因此提示词里必须强调中文标题必须清晰可读，不要错字、乱码、伪字。",
    "- 视觉整体参考黑红大师级 UI 海报：暗黑背景、珊瑚红/酒红渐变、巨型中文标题、人物或主体前景、悬浮网页作品卡、玻璃拟态边缘光、微噪点、电影感景深。",
    "- 不要廉价营销海报，不要花哨贴纸，不要儿童手账，不要大红大紫平涂，不要赛博朋克过度复杂。",
    "- 发布正文要像创作者本人在说话，清楚、直接、能发布。",
    "- 话题 5-8 个，不要带 # 符号。",
    "- 不要编造具体数据、案例、价格、身份背书。",
    "",
    `账号感觉：${cleanText(persona, "AI + IP 实战，小白友好")}`,
    `视觉偏好：${cleanText(style, "黑红大师级 UI 海报")}`,
    `用户素材：${cleanText(material)}`,
  ].join("\n");
}

function fallbackPrompt(index, data) {
  const direction = coverStyleDirections[index - 1] || coverStyleDirections[0];
  return {
    name: direction.name,
    description: direction.description,
    prompt: [
      `生成一张小红书 3:4 竖版封面，主标题是「${data.coverTitle}」。`,
      data.coverSubtitle ? `副标题是「${data.coverSubtitle}」。` : "",
      direction.description,
      "黑红大师级 UI 海报风格，红色渐变、巨型标题、悬浮作品卡片，中文标题清晰可读。",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

export function normalizeCopyPackage(value) {
  if (!value || typeof value !== "object") throw new Error("文案模型没有返回可用的发布包。");
  const coverTitle = cleanText(value.coverTitle || value.publishTitle);
  const publishTitle = cleanText(value.publishTitle || value.coverTitle);
  const body = cleanText(value.body);
  if (!coverTitle || !publishTitle || !body) {
    throw new Error("发布包缺少封面标题、发布标题或正文。");
  }

  const base = {
    coverTitle,
    coverSubtitle: cleanText(value.coverSubtitle),
    publishTitle,
    body,
    hashtags: (Array.isArray(value.hashtags) ? value.hashtags : [])
      .map(cleanHashtag)
      .filter(Boolean)
      .slice(0, 8),
  };
  if (!base.hashtags.length) base.hashtags = ["小红书运营", "AI封面", "内容创作"];

  const incoming = Array.isArray(value.coverPrompts) ? value.coverPrompts : [];
  const coverPrompts = Array.from({ length: 5 }, (_, index) => {
    const prompt = incoming[index] || fallbackPrompt(index + 1, base);
    return {
      id: `cover-${index + 1}`,
      name: cleanText(prompt.name, coverStyleDirections[index]?.name || `版本 ${index + 1}`),
      description: cleanText(prompt.description, coverStyleDirections[index]?.description || "黑红渐变封面方向"),
      prompt: cleanText(prompt.prompt, fallbackPrompt(index + 1, base).prompt),
    };
  });

  return {
    ...base,
    coverPrompts,
  };
}

export function buildCoverPrompt({ coverTitle, coverSubtitle, basePrompt, revision = "" }) {
  return [
    "生成一张小红书封面图，比例 3:4，适合手机信息流第一眼点击。",
    `封面主标题：${cleanText(coverTitle)}`,
    cleanText(coverSubtitle) ? `封面副标题：${cleanText(coverSubtitle)}` : "",
    "",
    "视觉方向：黑红大师级 UI 海报风格。",
    "使用大面积暗黑背景、珊瑚红到深酒红渐变、红色舞台光、轻微烟雾、微噪点、玻璃拟态悬浮网页作品卡片；画面要像强冲击小红书封面和高级设计作品展示墙。",
    "构图可以参考：上方超大中文标题，中央人物或主体前景，周围漂浮多张 UI/网页案例卡片，底部保留小红书互动感。",
    "中文标题必须清晰可读，不要错字、乱码、伪字；标题是画面核心，不要被背景遮住。",
    "整体高级、克制、有创作者个人 IP 质感；不要廉价营销海报、不要儿童手账、不要花哨贴纸、不要赛博朋克过度复杂。",
    "",
    `本版提示词：${cleanText(basePrompt)}`,
    cleanText(revision) ? `修改要求：${cleanText(revision)}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function hashtagLine(hashtags = []) {
  return hashtags.map((tag) => `#${cleanHashtag(tag)}`).filter((tag) => tag.length > 1).join(" ");
}

export function publishMarkdown(data, coverFilename = "cover-final.png") {
  return `# ${cleanText(data.publishTitle)}

${cleanText(data.body)}

## 话题
${hashtagLine(data.hashtags)}

## 封面图
${coverFilename}
`;
}

export function publishText(data, coverFilename = "cover-final.png") {
  return [
    cleanText(data.publishTitle),
    "",
    cleanText(data.body),
    "",
    hashtagLine(data.hashtags),
    "",
    `封面图：${coverFilename}`,
  ].join("\n");
}
