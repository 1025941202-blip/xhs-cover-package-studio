# 小红书封面发布包网站

一个独立的小红书发布包工具：输入文案或上传文本文件，先生成封面文案、发布标题、正文、话题和 5 个封面方向，再生成 5 版封面图，最后导出封面和发布文案。

当前界面风格是黑红大师级 UI 海报：暗黑背景、红色渐变、巨型标题、玻璃悬浮卡片、微噪点和影棚海报感。

## 当前能力

- 支持粘贴文案
- 支持上传 `.txt`、`.md`、`.docx`
- `.doc`、PDF、视频在 v1 暂不支持，会给出提示
- DeepSeek 生成封面主标题、封面副标题、发布标题、正文、话题、5 个封面提示词
- Image2 / BananaRouter 生成 5 个封面版本
- 选中封面后可输入修改意见，只重生成当前封面
- 最终发布包包含封面图、发布标题、正文和话题
- 支持复制文案、下载封面、下载 Markdown、下载 TXT、下载完整 zip
- 公网模式支持 `APP_ACCESS_CODE` 访问码

## 本地启动

```bash
cp .env.local.example .env.local
node server.mjs
```

打开：

```text
http://127.0.0.1:4175/
```

本地只看界面或流程时，可以使用模拟模式：

```bash
MOCK_AI=1 node server.mjs
```

## 环境变量

```bash
APP_MODE=web
HOST=0.0.0.0
APP_ACCESS_CODE=你的访问码
DEEPSEEK_API_KEY=你的 DeepSeek Key
BANANAROUTER_API_KEY=你的 BananaRouter Image2 Key
```

API Key 只放服务端环境变量，不要写进前端文件。

## 部署

推荐 Render Blueprint。这个目录已经包含 `render.yaml`，创建服务时填：

- `APP_ACCESS_CODE`
- `DEEPSEEK_API_KEY`
- `BANANAROUTER_API_KEY`

公网版本会监听 Render 提供的 `PORT`，并用 `HOST=0.0.0.0` 对外服务。

## 验证

```bash
npm run check
npm test
```

如果本机没有 `npm` 命令，也可以直接用 Node 跑同等检查：

```bash
node --check server.mjs && node --check app.js && node --check xhs-cover-rules.mjs && node --check server-utils.mjs
node --test
```
