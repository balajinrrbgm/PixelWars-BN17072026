/**
 * DynamoDB client and data access layer for PixelWars.
 *
 * Single-table design:
 * All entities stored in one DynamoDB table using composite keys to model
 * different entity types efficiently.
 *
 * Table: pixelwars-{env}
 *
 * Access patterns and key design:
 *
 * ┌──────────────────┬────────────────────┬────────────────────┬──────────────┐
 * │ Entity           │ PK                 │ SK                 │ GSI1PK       │
 * ├──────────────────┼────────────────────┼────────────────────┼──────────────┤
 * │ Pixel            │ CANVAS#default     │ PIXEL#{x}#{y}      │ FACTION#red  │
 * │ UserProfile      │ USER#{userId}      │ PROFILE            │ —            │
 * │ UserCooldown     │ USER#{userId}      │ COOLDOWN#default   │ —            │ ← TTL
 * │ Connection       │ CONN#{connId}      │ METADATA           │ —            │ ← TTL
 * │ LeaderboardEntry │ LEADERBOARD#global │ USER#{userId}      │ —            │
 * │ FactionStats     │ FACTION#{name}     │ STATS              │ —            │
 * └──────────────────┴────────────────────┴────────────────────┴──────────────┘
 *
 * GSI1: GSI1PK (faction) → sort by pixelsPlaced → faction leaderboard
 * GSI2: PK = LEADERBOARD#global, sort by GSI2SK (pixelsPlaced desc) → global leaderboard
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
  TransactWriteCommand,
  type TransactWriteCommandInput,
} from '@aws-sdk/lib-dynamodb'

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME!

const ddbClient = new DynamoDBClient({
  region: process.env.AWS_REGION ?? 'us-east-1',
  ...(process.env.NODE_ENV === 'development'
    ? {
        // DynamoDB Local for development
        endpoint: 'http://localhost:8000',
        credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
      }
    : {}),
})

export const ddb = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false,
  },
})

// ─── Types ───────────────────────────────────────────────────────────────────

export type Faction = 'red' | 'blue' | 'green' | 'purple'

export type Pixel = {
  x: number
  y: number
  color: string         // hex color e.g. '#FF0000'
  faction: Faction
  placedBy: string      // userId
  placedAt: string      // ISO timestamp
}

export type UserProfile = {
  userId: string
  username: string
  faction: Faction
  pixelsPlaced: number
  lastPixelAt: string | null
}

export type LeaderboardEntry = {
  userId: string
  username: string
  faction: Faction
  pixelsPlaced: number
  rank?: number
}

export type FactionStats = {
  faction: Faction
  pixelsOwned: number
  totalPixelsPlaced: number
  memberCount: number
}

// ─── Canvas operations ────────────────────────────────────────────────────────

/**
 * Get a single pixel from the canvas.
 */
export async function getPixel(x: number, y: number): Promise<Pixel | null> {
  const result = await ddb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: 'CANVAS#default',
        SK: `PIXEL#${x}#${y}`,
      },
    })
  )
  if (!result.Item) return null
  return {
    x: result.Item.x,
    y: result.Item.y,
    color: result.Item.color,
    faction: result.Item.faction,
    placedBy: result.Item.placedBy,
    placedAt: result.Item.placedAt,
  }
}

/**
 * Place a pixel — uses a DynamoDB transaction to:
 * 1. Write the pixel with conditional check (prevent race conditions)
 * 2. Check and clear the user's cooldown marker
 * 3. Update the user's pixel count
 * 4. Update the faction pixel count
 */
export async function placePixel(
  userId: string,
  x: number,
  y: number,
  color: string,
  faction: Faction
): Promise<{ success: boolean; error?: string }> {
  const now = new Date().toISOString()
  const cooldownExpiry = Math.floor(Date.now() / 1000) + (parseInt(process.env.NEXT_PUBLIC_COOLDOWN_SECONDS ?? '300', 10))

  // Validate canvas bounds
  const canvasWidth = parseInt(process.env.NEXT_PUBLIC_CANVAS_WIDTH ?? '1000', 10)
  const canvasHeight = parseInt(process.env.NEXT_PUBLIC_CANVAS_HEIGHT ?? '1000', 10)
  if (x < 0 || x >= canvasWidth || y < 0 || y >= canvasHeight) {
    return { success: false, error: 'Pixel out of bounds' }
  }

  // Check cooldown first
  const cooldownResult = await ddb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: 'COOLDOWN#default' },
    })
  )
  if (cooldownResult.Item) {
    const remainingSecs = (cooldownResult.Item.expiresAt as number) - Math.floor(Date.now() / 1000)
    if (remainingSecs > 0) {
      return { success: false, error: `Cooldown: ${remainingSecs} seconds remaining` }
    }
  }

  const transactItems: TransactWriteCommandInput['TransactItems'] = [
    // 1. Write pixel
    {
      Put: {
        TableName: TABLE_NAME,
        Item: {
          PK: 'CANVAS#default',
          SK: `PIXEL#${x}#${y}`,
          x,
          y,
          color,
          faction,
          placedBy: userId,
          placedAt: now,
          // GSI for faction-based queries
          GSI1PK: `FACTION#${faction}`,
          GSI1SK: `PIXEL#${x}#${y}`,
          entityType: 'PIXEL',
        },
      },
    },
    // 2. Set cooldown (TTL auto-expires it — no cleanup needed!)
    {
      Put: {
        TableName: TABLE_NAME,
        Item: {
          PK: `USER#${userId}`,
          SK: 'COOLDOWN#default',
          userId,
          setAt: now,
          expiresAt: cooldownExpiry,  // DynamoDB TTL attribute
          entityType: 'COOLDOWN',
        },
      },
    },
    // 3. Increment user pixel count
    {
      Update: {
        TableName: TABLE_NAME,
        Key: { PK: `USER#${userId}`, SK: 'PROFILE' },
        UpdateExpression: 'ADD pixelsPlaced :one SET lastPixelAt = :now, faction = :faction',
        ExpressionAttributeValues: {
          ':one': 1,
          ':now': now,
          ':faction': faction,
        },
      },
    },
    // 4. Increment faction pixel count
    {
      Update: {
        TableName: TABLE_NAME,
        Key: { PK: `FACTION#${faction}`, SK: 'STATS' },
        UpdateExpression: 'ADD totalPixelsPlaced :one',
        ExpressionAttributeValues: { ':one': 1 },
      },
    },
  ]

  try {
    await ddb.send(new TransactWriteCommand({ TransactItems: transactItems }))
    return { success: true }
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      (error as { name: string }).name === 'TransactionCanceledException'
    ) {
      return { success: false, error: 'Transaction conflict — try again' }
    }
    throw error
  }
}

/**
 * Get global leaderboard — top pixel placers.
 * Uses DynamoDB query on leaderboard items sorted by pixelsPlaced.
 */
export async function getLeaderboard(limit = 20): Promise<LeaderboardEntry[]> {
  const result = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': 'LEADERBOARD#global' },
      ScanIndexForward: false,  // descending order
      Limit: limit,
      IndexName: 'GSI2',
    })
  )
  return (result.Items ?? []).map((item, idx) => ({
    userId: item.userId,
    username: item.username,
    faction: item.faction,
    pixelsPlaced: item.pixelsPlaced,
    rank: idx + 1,
  }))
}

/**
 * Get all faction stats.
 */
export async function getAllFactionStats(): Promise<FactionStats[]> {
  const factions: Faction[] = ['red', 'blue', 'green', 'purple']
  const stats = await Promise.all(
    factions.map(async (faction) => {
      const result = await ddb.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: { PK: `FACTION#${faction}`, SK: 'STATS' },
        })
      )
      return {
        faction,
        pixelsOwned: result.Item?.pixelsOwned ?? 0,
        totalPixelsPlaced: result.Item?.totalPixelsPlaced ?? 0,
        memberCount: result.Item?.memberCount ?? 0,
      }
    })
  )
  return stats
}

/**
 * Get a user's profile.
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const result = await ddb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: 'PROFILE' },
    })
  )
  if (!result.Item) return null
  return {
    userId: result.Item.userId,
    username: result.Item.username,
    faction: result.Item.faction,
    pixelsPlaced: result.Item.pixelsPlaced ?? 0,
    lastPixelAt: result.Item.lastPixelAt ?? null,
  }
}

/**
 * Get a user's cooldown status.
 */
export async function getUserCooldown(userId: string): Promise<{ active: boolean; remainingSeconds: number }> {
  const result = await ddb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: 'COOLDOWN#default' },
    })
  )
  if (!result.Item) return { active: false, remainingSeconds: 0 }
  const remaining = (result.Item.expiresAt as number) - Math.floor(Date.now() / 1000)
  return { active: remaining > 0, remainingSeconds: Math.max(0, remaining) }
}
