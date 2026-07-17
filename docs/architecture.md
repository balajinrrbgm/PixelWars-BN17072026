# PixelWars — Architecture Design Document

## System Architecture Overview

```mermaid
graph TB
    subgraph Players["🌍 Players (Global)"]
        P1[Browser — New York\nHTML5 Canvas + WebSocket]
        P2[Browser — London\nHTML5 Canvas + WebSocket]
        P3[Browser — Tokyo\nHTML5 Canvas + WebSocket]
    end

    subgraph Vercel["☁️ Vercel Edge"]
        NEXT[Next.js App\nCanvas UI]
        API[API Routes\nPOST /api/pixel\nGET /api/leaderboard\nGET /api/canvas/state]
    end

    subgraph AWS["☁️ AWS"]
        direction TB
        subgraph APIGW["API Gateway WebSocket"]
            WSGW[WebSocket API\nGlobal connections]
            CONNECT[$connect route]
            DISCONNECT[$disconnect route]
        end

        subgraph LAMBDA["Lambda Functions"]
            STREAM[Stream Processor\nReads DynamoDB Streams\nBroadcasts to all WS clients]
            WSCONN[WS Connect Handler\nStores connId in DynamoDB]
            WSDISCONN[WS Disconnect Handler\nRemoves connId from DynamoDB]
        end

        subgraph DYNAMO["Amazon DynamoDB — Single-Table Design"]
            direction TB
            TABLE[pixelwars-prod\nGlobal Table — 2 regions]
            subgraph ENTITIES["Entities in one table"]
                PIXELS[CANVAS#default | PIXEL#x#y\ne.g. PIXEL#42#100]
                USERS[USER#userId | PROFILE\nfaction, pixelsPlaced, lastPixelAt]
                COOLDOWNS[USER#userId | COOLDOWN#default\nexpiresAt TTL → auto-deleted!]
                CONNS[CONN#connId | METADATA\nexpiresAt TTL → stale conns auto-deleted]
                LEADERBOARD[LEADERBOARD#global | USER#userId\npixelsPlaced → GSI2 sort]
                FACTIONS[FACTION#red | STATS\ntotalPixelsPlaced, pixelsOwned]
            end
            GSI1[GSI1: faction-based pixel queries]
            GSI2[GSI2: global leaderboard\nsorted by pixelsPlaced]
            STREAM_ARN[DynamoDB Streams\nNEW_AND_OLD_IMAGES]
        end

        subgraph GLOBAL["DynamoDB Global Tables"]
            US[us-east-1 replica]
            EU[eu-west-1 replica]
        end

        CW[CloudWatch\nMetrics + Throttle Alarms]
    end

    %% Players ↔ Vercel
    P1 -->|HTTPS pixel placement| API
    P2 -->|HTTPS pixel placement| API
    P3 -->|HTTPS pixel placement| API

    %% Players ↔ WebSocket
    P1 <-->|WebSocket\nReceive pixel updates| WSGW
    P2 <-->|WebSocket\nReceive pixel updates| WSGW
    P3 <-->|WebSocket\nReceive pixel updates| WSGW

    %% API → DynamoDB
    API -->|TransactWrite: pixel + cooldown + user stats + faction stats| TABLE

    %% WS connection management
    WSGW --> CONNECT
    WSGW --> DISCONNECT
    CONNECT --> WSCONN
    DISCONNECT --> WSDISCONN
    WSCONN -->|PutItem CONN#connId| TABLE
    WSDISCONN -->|DeleteItem CONN#connId| TABLE

    %% DynamoDB Streams → Lambda → WebSocket broadcast
    TABLE -->|NEW pixel events\n(filtered to PIXEL entity type)| STREAM_ARN
    STREAM_ARN -->|Event source mapping| STREAM
    STREAM -->|Query all active CONN# items| TABLE
    STREAM -->|PostToConnection each connId| WSGW
    WSGW -->|Push pixel update| P1
    WSGW -->|Push pixel update| P2
    WSGW -->|Push pixel update| P3

    %% Table internals
    TABLE --- PIXELS
    TABLE --- USERS
    TABLE --- COOLDOWNS
    TABLE --- CONNS
    TABLE --- LEADERBOARD
    TABLE --- FACTIONS
    TABLE --- GSI1
    TABLE --- GSI2

    %% Global Tables replication
    TABLE --- US
    US <-->|Active-active replication| EU

    %% TTL cleanup (automatic, zero cost)
    COOLDOWNS -.->|Auto-expired by DynamoDB TTL| DYNAMO
    CONNS -.->|Auto-expired by DynamoDB TTL| DYNAMO

    %% Monitoring
    TABLE -.->|Metrics| CW
    STREAM -.->|Errors| CW

    style AWS fill:#FF9900,color:#000,stroke:#FF9900
    style Vercel fill:#000,color:#fff,stroke:#444
    style DYNAMO fill:#2496ED,color:#fff,stroke:#2496ED
    style Players fill:#f0f9ff,color:#000,stroke:#0ca2e8
    style GLOBAL fill:#4CAF50,color:#fff,stroke:#4CAF50
```

## DynamoDB Single-Table Design

The entire PixelWars data model lives in **one DynamoDB table**. This is an advanced NoSQL pattern that demonstrates deep expertise with DynamoDB's access patterns.

### Key Design

| Entity | PK | SK | GSI1PK | GSI2PK | GSI2SK | TTL |
|---|---|---|---|---|---|---|
| Pixel | `CANVAS#default` | `PIXEL#{x}#{y}` | `FACTION#{faction}` | — | — | — |
| User Profile | `USER#{userId}` | `PROFILE` | — | `LEADERBOARD#global` | pixelsPlaced | — |
| Cooldown | `USER#{userId}` | `COOLDOWN#default` | — | — | — | ✅ expiresAt |
| WS Connection | `CONN#{connId}` | `METADATA` | — | — | — | ✅ expiresAt |
| Faction Stats | `FACTION#{faction}` | `STATS` | — | — | — | — |

### Access Patterns

| Pattern | DynamoDB Operation | Index Used |
|---|---|---|
| Get pixel at (x,y) | `GetItem` PK=`CANVAS#default`, SK=`PIXEL#42#100` | Primary |
| Get all pixels owned by faction | `Query` GSI1PK=`FACTION#red` | GSI1 |
| Get leaderboard (top 20) | `Query` PK=`LEADERBOARD#global`, sort by pixelsPlaced | GSI2 |
| Check user cooldown | `GetItem` PK=`USER#abc`, SK=`COOLDOWN#default` | Primary |
| Get all WS connections | `Query` PK begins with `CONN#` | Primary |
| Place pixel (atomic) | `TransactWriteItems` (4 operations) | — |

## Real-Time Architecture: DynamoDB Streams → WebSocket

The killer feature is the **zero-polling real-time pipeline**:

1. Player places pixel → API writes to DynamoDB
2. DynamoDB Stream fires → Lambda invoked within 1 second
3. Lambda queries all active `CONN#` records from DynamoDB
4. Lambda calls `PostToConnection` for each WebSocket client
5. Every player's canvas updates simultaneously

**Why this is better than polling**:
- Polling: Every client hits `/api/canvas/state` every second = 1M requests/sec at scale
- Streams: Lambda receives batched changes, broadcasts once = ~1 Lambda invocation per pixel

## Scale Calculations

```
r/place 2022 peak: 6M simultaneous users
Cooldown: 5 minutes = 300 seconds
Peak write rate: 6,000,000 / 300 = 20,000 writes/second

DynamoDB on-demand capacity: scales to 40,000+ WCU automatically
Write latency: <5ms (p99)
DynamoDB Global Tables replication lag: <1 second between regions

WebSocket connections at 6M users:
- API Gateway WebSocket: no stated limit on simultaneous connections
- Lambda concurrency for stream processor: auto-scales
- Each pixel event → 1 batch → broadcast to all connections

This is why DynamoDB was chosen. Not PostgreSQL, not MySQL.
```
