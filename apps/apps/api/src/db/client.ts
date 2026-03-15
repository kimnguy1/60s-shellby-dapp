import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { eq } from "drizzle-orm";
import { interactions, users, videos } from "./schema";
import { buildSyntheticInteractions, runSyntheticFixtureChecks, syntheticCreators, syntheticVideos } from "./syntheticFixtures";

const dbPath = process.env.DB_PATH ?? "./shelby.db";
const sqlite = new Database(dbPath, { create: true });

sqlite.exec(`
CREATE TABLE IF NOT EXISTS users (
  wallet_address TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  apt_balance INTEGER NOT NULL DEFAULT 0,
  shelby_usd_balance INTEGER NOT NULL DEFAULT 0,
  shelby_token_balance INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY,
  owner_wallet_address TEXT NOT NULL,
  caption TEXT,
  video_url TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS interactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  video_id TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  type TEXT NOT NULL,
  comment TEXT,
  amount INTEGER,
  created_at INTEGER NOT NULL
);
`);

export const db = drizzle(sqlite);

function mockBalancesForWallet(walletAddress: string): {
  aptBalance: number;
  shelbyUsdBalance: number;
  shelbyTokenBalance: number;
} {
  const seed = walletAddress.replace(/^0x/, "").slice(0, 8);
  const parsed = Number.parseInt(seed || "1", 16) || 1;
  return {
    aptBalance: 10 + (parsed % 250),
    shelbyUsdBalance: 50 + (parsed % 1000),
    shelbyTokenBalance: 1_000 + (parsed % 20_000)
  };
}

async function ensureSeedData(): Promise<void> {
  const fixtureCheck = runSyntheticFixtureChecks();
  if (!fixtureCheck.pass) {
    const failedChecks = fixtureCheck.checks.filter((check) => !check.pass).map((check) => `${check.name}: ${check.detail}`);
    throw new Error(`synthetic fixture self-check failed: ${failedChecks.join("; ")}`);
  }

  for (const creator of syntheticCreators) {
    const existingUser = await db.select().from(users).where(eq(users.walletAddress, creator.walletAddress)).limit(1);
    if (existingUser.length > 0) {
      continue;
    }

    const balances = mockBalancesForWallet(creator.walletAddress);
    await db.insert(users).values({
      walletAddress: creator.walletAddress,
      displayName: creator.displayName,
      ...balances,
      createdAt: syntheticVideos[0]!.createdAt,
      updatedAt: syntheticVideos[0]!.createdAt
    });
  }

  const existingVideos = await db.select().from(videos).limit(1);
  if (existingVideos.length > 0) {
    return;
  }

  await db.insert(videos).values(
    syntheticVideos.map((video) => ({
      id: video.id,
      ownerWalletAddress: video.ownerWalletAddress,
      caption: video.caption,
      videoUrl: video.videoUrl,
      createdAt: video.createdAt
    }))
  );

  await db.insert(interactions).values(buildSyntheticInteractions());
}

await ensureSeedData();

export { mockBalancesForWallet };
