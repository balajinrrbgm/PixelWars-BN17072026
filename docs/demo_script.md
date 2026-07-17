# PixelWars — Demo Script

**Total demo time**: 2:45 minutes

---

## Pre-Demo Checklist
- [ ] pixelwars.vercel.app open, logged in as "demo_red" (Team Red)
- [ ] Second browser window open, logged in as "demo_blue" (Team Blue)
- [ ] AWS Console tab: DynamoDB → Tables → pixelwars-prod
- [ ] CloudWatch tab showing Stream Processor Lambda invocations
- [ ] Both canvases showing live activity

---

## Demo Flow

### [0:00–0:15] Hook
**Say**: *"Reddit's r/place had 6 million simultaneous users placing pixels in real-time. The question was: what database could handle that? The answer is DynamoDB. PixelWars is built to the same scale — and it's live right now."*

---

### [0:15–0:50] Live Canvas + Real-Time Update
**Action**: Open canvas — show the colorful 1000×1000 grid  
**Say**: *"1000×1000 shared canvas. Every pixel you see was placed by a real player and stored in DynamoDB."*

**Action**: Click a pixel to place it (Team Red, coordinate ~400×300)  
**Say**: *"I'm placing a red pixel at 400, 300."*

**Action**: Watch second browser window update within 1 second  
**Say**: *"Watch the other window — that player is in a completely different session. DynamoDB Stream fired instantly, Lambda processed it, WebSocket API Gateway broadcast it to every connected client. No polling. Pure event-driven."*

---

### [0:50–1:20] DynamoDB Architecture Explanation
**Action**: Switch to AWS Console → DynamoDB table  
**Say**: *"This is our DynamoDB table. One table — single-table design pattern. Pixels, users, cooldowns, faction stats, and WebSocket connections are all here with different partition keys."*

**Show**: Table items — demonstrate `CANVAS#default | PIXEL#400#300`  
**Say**: *"The pixel I just placed: PK = CANVAS#default, SK = PIXEL#400#300. Simple key pattern that gives us O(1) point reads and efficient range scans."*

**Show**: `USER#userId | COOLDOWN#default` item with expiresAt  
**Say**: *"The cooldown marker has a TTL attribute — expiresAt set to 5 minutes from now. DynamoDB automatically deletes it when it expires. Zero cron jobs, zero cleanup Lambda. Pure DynamoDB."*

---

### [1:20–1:45] Faction Leaderboard
**Action**: Navigate to Leaderboard tab  
**Say**: *"Real-time faction standings. Team Red currently controls 31% of the canvas."*

**Show**: GSI2 explanation  
**Say**: *"This leaderboard is backed by a DynamoDB GSI — Global Secondary Index — sorted by pixels placed descending. No table scan, no aggregation pipeline. One Query call against the index returns the top 20 players instantly."*

---

### [1:45–2:10] DynamoDB Streams in Action (CloudWatch)
**Action**: Switch to CloudWatch → Lambda metric for stream processor  
**Say**: *"Every time a pixel is placed, this Lambda invocation spikes. That's the Stream Processor reading the DynamoDB Stream and pushing to WebSocket clients."*

**Action**: Place several pixels quickly  
**Say**: *"Watch the invocations increase. DynamoDB Streams batches records with up to 1-second window — so we're pushing updates to all connected players every second at peak."*

---

### [2:10–2:35] Scale Story
**Say**: *"Let's do the scale math. Reddit r/place: 6 million users at a 5-minute cooldown = 20,000 pixel placements per second. DynamoDB on-demand scales to 40,000+ write capacity units automatically — we have 2x headroom at r/place peak scale. No pre-provisioning, no sharding, no operational work."*

**Show**: DynamoDB on-demand capacity mode in console  
**Say**: *"This is why DynamoDB was the right choice for this track. Aurora PostgreSQL can't do 20,000 writes per second on a single table without significant engineering work. DynamoDB does it out of the box."*

---

### [2:35–2:45] Close
**Say**: *"PixelWars demonstrates exactly what DynamoDB was built for: massive concurrent writes, single-digit millisecond latency, global tables for worldwide distribution, and Streams for real-time event propagation. The entire data model in one table. The entire real-time pipeline from database to browser. Built for millions."*

---

## Backup Plans

| Failure | Recovery |
|---|---|
| WebSocket fails to update | Show pre-recorded video of real-time update |
| DynamoDB connection error | Show table screenshot from AWS Console |
| Lambda stream processor error | Show CloudWatch logs; explain architecture verbally |
| Canvas loads blank | Hard-refresh; seed data is pre-loaded |
