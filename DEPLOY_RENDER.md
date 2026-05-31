# Render 部署说明

## 准备

- GitHub 新仓库
- Render 账号
- 三个环境变量：
  - `APP_ACCESS_CODE`
  - `BANANAROUTER_API_KEY`
  - `DEEPSEEK_API_KEY`，如果暂时没有就先设置 `MOCK_COPY=1`

不要把 Key 写进代码、README 或前端文件。

## 步骤

1. 把本目录上传到一个新的 GitHub 仓库。
2. 打开 Render Dashboard。
3. 选择 New -> Blueprint。
4. 连接这个 GitHub 仓库。
5. Render 会读取 `render.yaml`。
6. 在环境变量里填入：
   - `APP_ACCESS_CODE`
   - `BANANAROUTER_API_KEY`
   - `DEEPSEEK_API_KEY`，如果暂时没有就先设置 `MOCK_COPY=1`
7. 创建服务，等待部署完成。
8. 打开 Render 分配的 `onrender.com` 地址。

## 当前配置

`render.yaml` 已经设置：

- `APP_MODE=web`
- `HOST=0.0.0.0`
- `MOCK_COPY=1`
- 启动命令：`npm run start:web`
- 免费规格：`plan: free`

免费规格可能会休眠，第一次打开会慢一些。正式长期使用可以升级付费规格。

## 公网安全

公网生成接口会校验 `APP_ACCESS_CODE`。访问码不是登录系统，只是轻量保护，用来避免陌生人随便消耗 DeepSeek 和 Image2 额度。
