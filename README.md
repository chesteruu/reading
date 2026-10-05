# 星光书架

平板优先的儿童分级英语阅读应用。孩子在全屏绘本里听读、点读、做三个触控小游戏、录下自己的声音，并收集星光。家长用邮箱管理级别、时长和词汇热力。

## 演示家庭

| | |
| :--- | :--- |
| 家长 | `demo@reading.app` / `demo1234` |
| Luna | PIN `1234`，级别 E |
| Leo | PIN `2580`，级别 D |

Luna 可以读三本演示故事。Leo 还打不开夜市那本，用来核对级别锁。

## 本地运行

```bash
python3 -m pip install -r backend/requirements.txt
cd backend && python3 -m uvicorn app.main:app --reload --port 8000

cd frontend && npm install && npm run dev
```

打开 <http://localhost:5173>。接口文档在 <http://localhost:8000/api/docs>。

默认数据库是 `backend/data/reading.db`。第一次启动会写入演示家庭和三本原创作文。

```bash
cd backend && python3 -m pytest -q
```

## 孩子端在做什么

- **书架**：横滑选书。级别刚好、可复习、下一本挑战、未解锁，分开摆放。
- **伴读**：原声音频若是 `speech:en-US`，用浏览器英语语音朗读，并用 `requestAnimationFrame` 按词时间戳做卡拉 OK 变色。速度 0.8x / 1.0x，并尽量保持音高。若 `audio_url` 是真正的音频地址，则改由音频时间轴驱动高亮。
- **自读**：点词即读，双击收藏，长按看图解。左右滑翻页。后面两页插画会预加载。
- **三个游戏**：故事排序、画面寻宝、音词连线。答对才由服务器记 3 颗星，重复通关不再加星。
- **录音间**：麦克风收成 16 kHz、16-bit、单声道 WAV，画声波，可跟原声对比，再存进个人小电台。
- **星光**：读完结算，书房装饰按星数解锁。

孩子的 JWT 只能写自己的进度、录音和游戏结果，不能改书、不能看家长统计。PIN 连续错 5 次会锁定约 30 秒。登录令牌默认 30 天，方便平板一直摊开着读。

## 家长端

`/parent` 可以看阅读时长、点读热力、收藏词和录音，调整 GRL 级别，添加孩子，或按一行一句上传新故事。新故事会自动生成排序和配对。

## 部署

自建机器：

```bash
docker compose up --build
```

浏览器打开 <http://localhost:8080>。Compose 里有 Postgres、Gunicorn/Uvicorn API，以及托管前端的 Nginx。上传的录音留在 `apidata` 卷。

Vercel 只跑 API：根目录的 `vercel.json` 把 FastAPI 交给 `api/index.py`（同时导出 Mangum `handler`）。请设置 `DATABASE_URL`（Neon / Supabase 这类 Postgres）和 `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY`。SQLite 和本地磁盘在 Serverless 上不会保留。

录音可以改存 Cloudflare R2 或 S3。填好 `.env.example` 里的 `S3_*`。插画和原声音频不要经 Python 转发，把 `image_url` / `audio_url` 写成 CDN 地址即可。演示绘本使用站内 SVG，方便离线把整条阅读路径跑通。

平板安装：用 Safari 或 Chrome 打开后「添加到主屏幕」。清单把显示模式设为 `standalone`。
