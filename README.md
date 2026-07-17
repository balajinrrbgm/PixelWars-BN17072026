# 🏆 PixelWars — Real-Time Collaborative Canvas at Internet Scale

> **Track**: Million-Scale Global App | **Database**: Amazon DynamoDB (with Streams)  
> **Hackathon**: H0: Hack the Zero Stack with Vercel v0 and AWS Databases

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel)](https://pixelwars.vercel.app)
[![AWS DynamoDB](https://img.shields.io/badge/Database-DynamoDB-orange?logo=amazonaws)](https://aws.amazon.com/dynamodb/)
[![Next.js 14](https://img.shields.io/badge/Frontend-Next.js%2014-black?logo=nextdotjs)](https://nextjs.org)

---

## 🎯 Problem

Real-time collaborative experiences at internet scale are **technically hard**:
- Reddit r/place (2022) was revolutionary — 6 million simultaneous users placing pixels — but it was temporary
- No permanent platform exists for large-scale collaborative pixel art with game mechanics
- Most "real-time" apps break under load because their databases can't handle concurrent writes at scale
- Building this on a traditional RDBMS would require complex sharding, connection pools, and custom caching

---

## 💡 Solution

PixelWars is a **permanent, real-time collaborative pixel art canvas** — think Reddit r/place meets faction warfare, built to scale to millions:

1. **1000×1000 pixel canvas** shared globally — anyone can place a pixel in their faction's color
2. **Real-time updates** via DynamoDB Streams → Lambda → WebSocket API Gateway — pixels update on every canvas worldwide in milliseconds
3. **Faction battles** — join Team Red, Blue, Green, or Purple; your faction's total pixels on canvas = your territory
4. **Global leaderboards** — DynamoDB GSI tracks top contributors and most active factions in real-time
5. **Time-lapse replay** — DynamoDB Streams records every pixel event; replay the entire canvas history
6. **Cooldown system** — place 1 pixel every 5 minutes (TTL-based cooldown in DynamoDB)

---

## 🏗️ Architecture

See [docs/architecture.md](docs/architecture.md) for the full Mermaid diagram.

**Key design decisions**:
- **DynamoDB single-table design** — PixelCanvas, Leaderboard, and GameSession data in one table with GSIs
- **DynamoDB Streams** — Change data capture for real-time pixel propagation to all connected clients
- **Lambda + API Gateway WebSocket** — Serverless WebSocket connections; scales to millions of concurrent users
- **TTL for cooldowns** — Zero-cost automatic cooldown expiration using DynamoDB TTL
- **Conditional writes** — Optimistic locking prevents race conditions when two users click same pixel simultaneously

---

## 🚀 Features

- **🎨 Live Canvas** — 1000×1000 shared canvas updating in real-time for all viewers
- **⚔️ Faction System** — 4 factions competing for canvas territory; join and fight for your color
- **🏆 Leaderboards** — Top pixel placers and faction standings via DynamoDB GSI
- **⏱️ Cooldown System** — DynamoDB TTL auto-expires cooldown markers (zero cron jobs needed)
- **📺 Time-Lapse Replay** — Watch the entire canvas evolution via DynamoDB Streams history
- **🌍 Global Real-Time** — DynamoDB Global Tables ensures sub-50ms latency worldwide
- **📊 Battle Stats** — Territory percentage, pixels placed today, active users count
- **🔒 Anti-Cheat** — Conditional writes + server-side validation prevent pixel spam

---

## 🛠️ Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | Next.js 14 App Router | Server Components for initial canvas load |
| Canvas Rendering | HTML5 Canvas + WebGL | Render 1M pixels at 60fps |
| Real-time | WebSocket API Gateway | Persistent connections, scales to millions |
| Database | DynamoDB (single-table design) | 100K+ writes/sec, single-digit ms latency |
| Change Data Capture | DynamoDB Streams | Pixel events propagated to all clients |
| Serverless | Lambda (stream processor + WS manager) | Auto-scale with traffic |
| Global Tables | DynamoDB Global Tables | Sub-50ms latency from any region |
| IaC | AWS CloudFormation | Complete infrastructure as code |
| Deployment | Vercel | Edge-deployed Next.js app |

---

## 🏃 Getting Started

```bash
git clone https://github.com/yourusername/pixelwars
cd pixelwars
npm install
cp .env.example .env.local
npm run dev
```

Deploy AWS infrastructure:
```bash
aws cloudformation deploy \
  --template-file infra/cloudformation/main.yml \
  --stack-name pixelwars-prod \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides Environment=prod
```

---

## 🏆 Hackathon Submission Notes

- **AWS Database Used**: Amazon DynamoDB with Streams, TTL, GSIs, and Global Tables
- **Advanced Features**:
  - **DynamoDB Streams** → Lambda → WebSocket for real-time pixel propagation (zero polling)
  - **Single-table design** — all entities in one DynamoDB table with carefully designed PKs/SKs
  - **DynamoDB TTL** for zero-cost cooldown expiration
  - **Conditional writes** for optimistic locking on pixel placement
  - **GSI for leaderboards** — real-time ranking without table scans
  - **DynamoDB Global Tables** for sub-50ms worldwide latency
- **Scale justification**: DynamoDB can handle 100K+ writes/sec; at peak r/place scale (6M users), each user placing 1 pixel per 5 minutes = 20K writes/sec — well within DynamoDB capacity

## 📄 License
MIT — see [LICENSE](LICENSE)
