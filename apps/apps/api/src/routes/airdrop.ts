import { randomUUIDv7 } from "bun";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db, mockBalancesForWallet } from "../db/client";
import { interactions, users, videos } from "../db/schema";

const walletSchema = z.string().startsWith("0x").min(4);

const connectWalletBody = z.object({
  walletAddress: walletSchema,
  displayName: z.string().trim().min(1).max(50).optional()
});

const uploadBody = z.object({
  walletAddress: walletSchema,
  videoUrl: z.string().url(),
  caption: z.string().trim().max(240).optional()
});

const likeBody = z.object({ walletAddress: walletSchema });

const commentBody = z.object({
  walletAddress: walletSchema,
  content: z.string().trim().min(1).max(280)
});

const donateBody = z.object({
  walletAddress: walletSchema,
  amount: z.number().int().positive().max(10_000)
});

const downloadBody = z.object({ walletAddress: walletSchema });

type FeedItem = {
  id: string;
  ownerWalletAddress: string;
  ownerDisplayName: string;
  caption: string | null;
  videoUrl: string;
  createdAt: number;
  likes: number;
  comments: number;
  donations: number;
  downloads: number;
};

type VideoRow = typeof videos.$inferSelect;
type InteractionRow = typeof interactions.$inferSelect;
const connectedWallets = new Set<string>();

function normalizeWalletAddress(walletAddress: string): string {
  return walletAddress.trim().toLowerCase();
}

function assertWalletConnected(walletAddress: string): void {
  if (!connectedWallets.has(normalizeWalletAddress(walletAddress))) {
    throw new HTTPException(401, { message: "Connect wallet before interacting" });
  }
}

async function assertVideoExists(videoId: string): Promise<void> {
  const targetVideo = await db.select().from(videos).where(eq(videos.id, videoId)).limit(1);
  if (targetVideo.length === 0) {
    throw new HTTPException(404, { message: "video not found" });
  }
}

function aggregateFeedItems(
  videoRows: VideoRow[],
  interactionRows: InteractionRow[],
  userMap: Map<string, string>
): FeedItem[] {
  const byVideoId = new Map<string, { likes: number; comments: number; donations: number; downloads: number }>();

  for (const interaction of interactionRows) {
    const stats = byVideoId.get(interaction.videoId) ?? { likes: 0, comments: 0, donations: 0, downloads: 0 };
    if (interaction.type === "like") {
      stats.likes += 1;
    } else if (interaction.type === "comment") {
      stats.comments += 1;
    } else if (interaction.type === "donate") {
      stats.donations += interaction.amount ?? 0;
    } else if (interaction.type === "download") {
      stats.downloads += 1;
    }
    byVideoId.set(interaction.videoId, stats);
  }

  return videoRows.map((video) => {
    const stats = byVideoId.get(video.id) ?? { likes: 0, comments: 0, donations: 0, downloads: 0 };
    return {
      id: video.id,
      ownerWalletAddress: video.ownerWalletAddress,
      ownerDisplayName: userMap.get(video.ownerWalletAddress) ?? "Unknown",
      caption: video.caption,
      videoUrl: video.videoUrl,
      createdAt: video.createdAt,
      likes: stats.likes,
      comments: stats.comments,
      donations: stats.donations,
      downloads: stats.downloads
    };
  });
}

async function ensureUser(walletAddress: string, displayName?: string): Promise<(typeof users)["$inferSelect"]> {
  const existing = await db.select().from(users).where(eq(users.walletAddress, walletAddress)).limit(1);
  const now = Date.now();

  if (existing.length > 0) {
    const user = existing[0]!;
    if (displayName && displayName !== user.displayName) {
      await db
        .update(users)
        .set({ displayName, updatedAt: now })
        .where(eq(users.walletAddress, walletAddress));
      return { ...user, displayName, updatedAt: now };
    }
    return user;
  }

  const balances = mockBalancesForWallet(walletAddress);
  const inserted = {
    walletAddress,
    displayName: displayName ?? `User ${walletAddress.slice(2, 8)}`,
    ...balances,
    createdAt: now,
    updatedAt: now
  };

  await db.insert(users).values(inserted);
  return inserted;
}

export const airdropRouter = new Hono();

airdropRouter.post("/wallet/connect", async (c) => {
  const parsed = connectWalletBody.safeParse(await c.req.json());
  if (!parsed.success) {
    throw new HTTPException(400, { message: parsed.error.message });
  }

  const user = await ensureUser(parsed.data.walletAddress, parsed.data.displayName);
  connectedWallets.add(normalizeWalletAddress(parsed.data.walletAddress));
  return c.json({
    walletAddress: user.walletAddress,
    displayName: user.displayName,
    balances: {
      apt: user.aptBalance,
      shelbyUsd: user.shelbyUsdBalance,
      shelbyToken: user.shelbyTokenBalance
    }
  });
});

airdropRouter.get("/feed", async (c) => {
  const limit = Number(c.req.query("limit") ?? 20);
  if (Number.isNaN(limit) || limit < 1 || limit > 50) {
    throw new HTTPException(400, { message: "limit must be between 1 and 50" });
  }

  const videoRows = await db.select().from(videos).orderBy(desc(videos.createdAt)).limit(limit);
  if (videoRows.length === 0) {
    return c.json({ items: [] });
  }

  const ownerWallets = [...new Set(videoRows.map((video) => video.ownerWalletAddress))];
  const userRows = await db.select().from(users).where(inArray(users.walletAddress, ownerWallets));
  const userMap = new Map(userRows.map((user) => [user.walletAddress, user.displayName]));

  const videoIds = videoRows.map((video) => video.id);
  const interactionRows = await db.select().from(interactions).where(inArray(interactions.videoId, videoIds));

  return c.json({ items: aggregateFeedItems(videoRows, interactionRows, userMap) });
});

airdropRouter.get("/profile/:walletAddress", async (c) => {
  const walletAddress = walletSchema.safeParse(c.req.param("walletAddress"));
  if (!walletAddress.success) {
    throw new HTTPException(400, { message: walletAddress.error.message });
  }

  const user = await ensureUser(walletAddress.data);
  const uploadedVideos = await db.select().from(videos).where(eq(videos.ownerWalletAddress, walletAddress.data));

  return c.json({
    walletAddress: user.walletAddress,
    displayName: user.displayName,
    balances: {
      apt: user.aptBalance,
      shelbyUsd: user.shelbyUsdBalance,
      shelbyToken: user.shelbyTokenBalance
    },
    uploadedVideos: uploadedVideos.length
  });
});

airdropRouter.post("/videos/upload", async (c) => {
  const parsed = uploadBody.safeParse(await c.req.json());
  if (!parsed.success) {
    throw new HTTPException(400, { message: parsed.error.message });
  }

  await ensureUser(parsed.data.walletAddress);

  const video = {
    id: randomUUIDv7(),
    ownerWalletAddress: parsed.data.walletAddress,
    caption: parsed.data.caption ?? null,
    videoUrl: parsed.data.videoUrl,
    createdAt: Date.now()
  };

  await db.insert(videos).values(video);
  return c.json(video, 201);
});

airdropRouter.post("/videos/:videoId/like", async (c) => {
  const parsed = likeBody.safeParse(await c.req.json());
  if (!parsed.success) {
    throw new HTTPException(400, { message: parsed.error.message });
  }

  const videoId = c.req.param("videoId");
  if (!videoId) {
    throw new HTTPException(400, { message: "videoId is required" });
  }

  await assertVideoExists(videoId);
  assertWalletConnected(parsed.data.walletAddress);

  await ensureUser(parsed.data.walletAddress);
  await db.insert(interactions).values({
    videoId,
    walletAddress: parsed.data.walletAddress,
    type: "like",
    createdAt: Date.now()
  });

  return c.json({ ok: true });
});

airdropRouter.post("/videos/:videoId/comment", async (c) => {
  const parsed = commentBody.safeParse(await c.req.json());
  if (!parsed.success) {
    throw new HTTPException(400, { message: parsed.error.message });
  }

  const videoId = c.req.param("videoId");
  if (!videoId) {
    throw new HTTPException(400, { message: "videoId is required" });
  }

  await assertVideoExists(videoId);
  assertWalletConnected(parsed.data.walletAddress);
  await ensureUser(parsed.data.walletAddress);
  await db.insert(interactions).values({
    videoId,
    walletAddress: parsed.data.walletAddress,
    type: "comment",
    comment: parsed.data.content,
    createdAt: Date.now()
  });

  return c.json({ ok: true });
});

airdropRouter.post("/videos/:videoId/donate", async (c) => {
  const parsed = donateBody.safeParse(await c.req.json());
  if (!parsed.success) {
    throw new HTTPException(400, { message: parsed.error.message });
  }

  const videoId = c.req.param("videoId");
  if (!videoId) {
    throw new HTTPException(400, { message: "videoId is required" });
  }

  await assertVideoExists(videoId);
  assertWalletConnected(parsed.data.walletAddress);
  await ensureUser(parsed.data.walletAddress);
  await db.insert(interactions).values({
    videoId,
    walletAddress: parsed.data.walletAddress,
    type: "donate",
    amount: parsed.data.amount,
    createdAt: Date.now()
  });

  return c.json({ ok: true });
});

airdropRouter.post("/videos/:videoId/download", async (c) => {
  const parsed = downloadBody.safeParse(await c.req.json());
  if (!parsed.success) {
    throw new HTTPException(400, { message: parsed.error.message });
  }

  const videoId = c.req.param("videoId");
  if (!videoId) {
    throw new HTTPException(400, { message: "videoId is required" });
  }

  await assertVideoExists(videoId);
  assertWalletConnected(parsed.data.walletAddress);
  await ensureUser(parsed.data.walletAddress);
  await db.insert(interactions).values({
    videoId,
    walletAddress: parsed.data.walletAddress,
    type: "download",
    createdAt: Date.now()
  });

  const video = await db.select().from(videos).where(eq(videos.id, videoId)).limit(1);

  return c.json({ url: video[0]!.videoUrl });
});
