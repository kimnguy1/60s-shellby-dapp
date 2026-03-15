import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  walletAddress: text("wallet_address").primaryKey(),
  displayName: text("display_name").notNull(),
  aptBalance: integer("apt_balance").notNull().default(0),
  shelbyUsdBalance: integer("shelby_usd_balance").notNull().default(0),
  shelbyTokenBalance: integer("shelby_token_balance").notNull().default(0),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull()
});

export const videos = sqliteTable("videos", {
  id: text("id").primaryKey(),
  ownerWalletAddress: text("owner_wallet_address").notNull(),
  caption: text("caption"),
  videoUrl: text("video_url").notNull(),
  createdAt: integer("created_at").notNull()
});

export const interactions = sqliteTable("interactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  videoId: text("video_id").notNull(),
  walletAddress: text("wallet_address").notNull(),
  type: text("type", { enum: ["like", "comment", "donate", "download"] }).notNull(),
  comment: text("comment"),
  amount: integer("amount"),
  createdAt: integer("created_at").notNull()
});
