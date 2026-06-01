const coverStyleDirections = [
  {
    name: "强观点电影海报",
    description: "深墨色或酒红点缀，电影节海报构图，超大中文标题，适合强观点、反常识、冲突感内容。",
  },
  {
    name: "清爽知识卡片",
    description: "雾蓝、鼠尾草绿、象牙白等低饱和配色，模块化信息卡和步骤感排版，适合教程、方法论、清单。",
  },
  {
    name: "温柔生活方式",
    description: "灰粉、香槟米、柔和自然光，日记拼贴或生活场景，适合成长、疗愈、日常经验和审美内容。",
  },
  {
    name: "人物访谈主视觉",
    description: "人物或拟人主体居中，杂志封面式标题层级，柔和聚光灯和采访感标签，适合个人 IP、观点表达。",
  },
  {
    name: "极简概念隐喻",
    description: "大留白、一个核心物件或抽象隐喻，标题与主体形成强关系，适合高级感、思考型、反差型内容。",
  },
];

function cleanText(value, fallback = "") {
  return String(value ?? fallback).trim();
}

function cleanHashtag(value) {
  return cleanText(value).replace(/^#+/, "").replace(/\s+/g, "");
}

export function buildCopyPrompt({ material, persona, style, referenceImageName = "" }) {
  const referenceLine = cleanText(referenceImageName)
    ? `用户已上传参考图：${cleanText(referenceImageName)}。文案模型不需要猜测图片内容，但 5 个封面提示词都要写明“生成时参考用户上传的参考图的配色、质感或版式节奏”，同时仍保持 5 个版本差异。`
    : "用户没有上传参考图，请完全根据文案内容自动匹配视觉风格。";
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
    "- 先理解用户素材的主题、受众、情绪强度、内容类型，再决定封面风格；不要不看内容就套固定红黑模板。",
    "- 5 个封面方向必须有真实差异：版式、主色、视觉隐喻、场景、标题位置、背景元素都要明显不同，让用户有选择价值。",
    "- 每个封面方向都必须包含同一个封面主标题和副标题，但不能只是同风格换小元素。",
    "- 封面图由 AI 直接生成中文标题，不做后期模板叠字；因此提示词里必须强调中文标题必须清晰可读，不要错字、乱码、伪字。",
    "- 5 个方向建议覆盖：强观点电影海报、清爽知识卡片、温柔生活方式、人物/IP 访谈主视觉、极简概念隐喻。可以根据素材微调，但不要让 5 张看起来像同一模板。",
    "- 配色必须跟内容情绪匹配：强观点可用深色/红色，教程可用清爽低饱和色，生活成长可用暖色或灰粉，商业/效率可用冷静蓝绿，情绪故事可用胶片暖光。",
    "- 除非用户明确要求全套红色，否则最多 1-2 个方向使用红黑或深红配色，其他方向必须换主色和版式。",
    "- 不要廉价营销海报，不要花哨贴纸，不要儿童手账，不要大红大紫平涂，不要赛博朋克过度复杂。",
    "- 发布正文要像创作者本人在说话，清楚、直接、能发布。",
    "- 话题 5-8 个，不要带 # 符号。",
    "- 不要编造具体数据、案例、价格、身份背书。",
    `- ${referenceLine}`,
    "",
    `账号感觉：${cleanText(persona, "AI + IP 实战，小白友好")}`,
    `视觉偏好：${cleanText(style, "根据文案自动匹配")}`,
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
      "本版本要和其他版本有明显差异，中文标题清晰可读，不要错字、乱码、伪字。",
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
      description: cleanText(prompt.description, coverStyleDirections[index]?.description || "内容驱动封面方向"),
      prompt: cleanText(prompt.prompt, fallbackPrompt(index + 1, base).prompt),
    };
  });

  return {
    ...base,
    coverPrompts,
  };
}

export function buildCoverPrompt({ coverTitle, coverSubtitle, basePrompt, revision = "", referenceImageName = "" }) {
  return [
    "生成一张小红书封面图，比例 3:4，适合手机信息流第一眼点击。",
    `封面主标题：${cleanText(coverTitle)}`,
    cleanText(coverSubtitle) ? `封面副标题：${cleanText(coverSubtitle)}` : "",
    "",
    "优先遵守“本版提示词”里的视觉策略、主色、版式、场景和隐喻；不要把所有版本统一成红黑风格。",
    "这张图需要和同批其他封面在构图和色彩上明显不同，像一个独立方案，而不是同一模板换皮。",
    "可以使用电影感、杂志感、知识卡片、生活方式、极简隐喻等风格，但必须服务于内容主题。",
    "中文标题必须清晰可读，不要错字、乱码、伪字；标题是画面核心，不要被背景遮住。",
    "整体高级、克制、有创作者个人 IP 质感；不要廉价营销海报、不要儿童手账、不要花哨贴纸、不要赛博朋克过度复杂。",
    cleanText(referenceImageName)
      ? `已提供参考图：${cleanText(referenceImageName)}。请参考它的配色、构图节奏、材质和整体气质，但不要照抄其中的文字、商标、人物身份或无关细节。`
      : "",
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
