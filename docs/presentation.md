# PixelWars — Presentation Deck

**Hackathon**: H0: Hack the Zero Stack | **Track**: B2C / Million-Scale

---

## Slide 1: The Scale Benchmark

**Title**: Reddit r/place ran on PostgreSQL. We built something bigger.

**Talking points**:
- In 2022, Reddit ran r/place — 6 million users, real-time collaborative pixel canvas
- It was a cultural phenomenon. It crashed. It scaled. It became legend.
- The core challenge: **20,000 pixel placements per second** at peak, every write visible to everyone instantly
- PostgreSQL at that scale requires sharding, read replicas, complex queuing
- We asked: *what if you built r/place with DynamoDB from day one?*

**Visual**: Side-by-side — r/place screenshot (left) vs PixelWars canvas (right)

---

## Slide 2: PixelWars

**Title**: A million-player collaborative canvas — powered by DynamoDB

**Talking points**:
- 1000×1000 canvas — 1 million pixels
- Players join factions (Red, Blue, Green, Yellow, Purple, Orange)
- Place one pixel every 5 minutes — cooldown enforced by DynamoDB TTL
- Real-time updates via WebSocket API Gateway + DynamoDB Streams
- Leaderboard sorted by pixels placed — powered by DynamoDB GSI

**Visual**: Live canvas screenshot with faction territory overlay

---

## Slide 3: Live Demo

**Title**: Watch it work at scale

**Demo flow** (see demo_script.md for full script):
1. Place a pixel as Team Red — instant update in second browser window
2. Show AWS Console — DynamoDB item: `CANVAS#default | PIXEL#400#300`
3. Show cooldown TTL item — `expiresAt` attribute counting down
4. Show CloudWatch — Lambda stream processor invocations spiking
5. Show leaderboard — GSI query, no table scan
6. Show scale math: 20,000 writes/sec capacity vs r/place peak

---

## Slide 4: DynamoDB — Why It's the Only Choice

**Title**: PostgreSQL would break under this load. DynamoDB doesn't.

| Requirement | PostgreSQL | DynamoDB |
|---|---|---|
| 20K writes/sec | Sharding required | Native, on-demand |
| 1M concurrent readers | Read replicas + CDN | Native, any region |
| 5-min cooldown expiry | Cron job / trigger | TTL — automatic |
| Real-time propagation | Logical replication + custom stream | DynamoDB Streams |
| Global distribution | Multi-AZ, complex | Global Tables, 1 flag |
| Operational overhead | High | Zero |

**Say**: *"The right database isn't always the most familiar one. For this workload, DynamoDB is the only rational choice."*

---

## Slide 5: Single-Table Design — All Entities, One Table

**Title**: One table. Every entity. Zero joins.

```
PK                    SK                    Entity
─────────────────────────────────────────────────────
CANVAS#default        PIXEL#400#300         Pixel (color, faction, userId, timestamp)
USER#<userId>         PROFILE               UserProfile (name, faction, pixelsPlaced)
USER#<userId>         COOLDOWN#default      Cooldown TTL marker (expiresAt)
USER#<userId>         STATS                 UserStats (pixelsPlaced, timestamp)
FACTION#red           STATS                 FactionStats (totalPixels, lastActivity)
CONN#<connectionId>   META                  WebSocket connection (userId, connectedAt)
```

**DynamoDB access patterns**:
- Get single pixel: `GetItem(PK=CANVAS#default, SK=PIXEL#x#y)` — O(1)
- Check cooldown: `GetItem(PK=USER#id, SK=COOLDOWN#default)` — O(1)  
- Leaderboard top 20: `Query(GSI2, PK=USER_STATS)` — sorted, no scan
- All faction stats: `Query(PK=FACTION#red)` — one call per faction

---

## Slide 6: Real-Time Architecture — Streams to WebSocket

**Title**: DynamoDB → Lambda → WebSocket → Every Browser

```
Browser A places pixel
       ↓
POST /api/pixel
       ↓
DynamoDB TransactWriteItems (4 atomic writes)
  1. PIXEL#x#y (color, faction, timestamp)
  2. COOLDOWN TTL (expiresAt = now + 300s)
  3. USER#userId STATS (increment pixelsPlaced)
  4. FACTION#faction STATS (increment)
       ↓
DynamoDB Streams (NEW_AND_OLD_IMAGES)
       ↓
Lambda Stream Processor (batch 100, window 1s)
       ↓
Query CONN# items → get all active WebSocket connections
       ↓
API Gateway PostToConnection → ALL connected browsers
```

**Key technical details**:
- `TransactWriteItems` — 4 atomic writes, guaranteed consistency
- DynamoDB Streams with 1-second tumbling window — batch propagation
- Lambda filter expression: only process `PIXEL` entity type events
- WebSocket API Gateway: 10ms median latency, 100K concurrent connections

---

## Slide 7: Advanced DynamoDB Features

**Feature showcase**:

**TTL (Time To Live)**:
- Cooldown enforcement: `expiresAt` set to `now + 300s`
- DynamoDB auto-deletes expired cooldowns — no cron jobs, no Lambda cleanup
- Zero operational overhead for a complex game mechanic

**Conditional Writes**:
- `ConditionExpression: attribute_not_exists(expiresAt) OR expiresAt < :now`
- Prevents race conditions when two clients try to place at same pixel simultaneously

**Global Tables** (CloudFormation replica regions: us-west-2, eu-west-1):
- Active-active replication
- Players write to nearest region — < 20ms for 95% of the world
- DynamoDB handles conflict resolution automatically

**DynamoDB Streams**:
- `StreamSpecification: StreamViewType: NEW_AND_OLD_IMAGES`
- Lambda EventSourceMapping with filter: `{"dynamodb": {"NewImage": {"entityType": {"S": ["PIXEL"]}}}}`
- Exactly-once delivery to stream processor

---

## Slide 8: Scale Math

**Title**: Built for r/place. Ready for bigger.

| Metric | r/place 2022 | PixelWars Capacity |
|---|---|---|
| Concurrent users | 6 million | DynamoDB on-demand: unlimited |
| Peak write rate | 20,000 pixels/sec | DynamoDB: 40,000+ WCU |
| Canvas size | 2000×2000 | 1000×1000 (4M items at full) |
| Real-time latency | ~2 seconds | < 500ms (Streams + WebSocket) |
| Database | PostgreSQL + Redis | DynamoDB (one service) |
| Global regions | 1 | 3 (Global Tables) |
| On-call incidents | Multiple | 0 (DynamoDB serverless) |

**Closing**: *"We didn't just build a game. We proved DynamoDB is the right database for any workload where r/place is the benchmark."*
