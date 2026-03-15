"use client";

import { create } from "zustand";
import type { FeedItem, PendingQueueAction, QueueActionType, WalletProfile } from "@/types/airdrop";

export type WalletState = "disconnected" | "connected";

type AirdropState = {
  walletAddress: string;
  displayName: string;
  walletState: WalletState;
  profile: WalletProfile | null;
  feed: FeedItem[];
  queue: PendingQueueAction[];
  error: string | null;
  setWalletAddress: (value: string) => void;
  setDisplayName: (value: string) => void;
  setWalletConnected: (walletAddress: string) => void;
  setWalletDisconnected: () => void;
  setProfile: (profile: WalletProfile | null) => void;
  setFeed: (feed: FeedItem[]) => void;
  prependFeedItem: (item: FeedItem) => void;
  bumpFeedMetric: (videoId: string, type: QueueActionType, value?: number) => void;
  enqueueAction: (videoId: string, type: QueueActionType) => string;
  resolveAction: (actionId: string) => void;
  failAction: (actionId: string, error: string) => void;
  setError: (error: string | null) => void;
};

function updateMetric(item: FeedItem, type: QueueActionType, value?: number): FeedItem {
  if (type === "like") {
    return { ...item, likes: item.likes + 1 };
  }
  if (type === "comment") {
    return { ...item, comments: item.comments + 1 };
  }
  if (type === "donate") {
    return { ...item, donations: item.donations + (value ?? 0) };
  }
  return { ...item, downloads: item.downloads + 1 };
}

export const useAirdropStore = create<AirdropState>((set) => ({
  walletAddress: "",
  displayName: "",
  walletState: "disconnected",
  profile: null,
  feed: [],
  queue: [],
  error: null,
  setWalletAddress: (walletAddress) => set({ walletAddress }),
  setDisplayName: (displayName) => set({ displayName }),
  setWalletConnected: (walletAddress) => set({ walletAddress, walletState: "connected", error: null }),
  setWalletDisconnected: () => set({ walletAddress: "", walletState: "disconnected", profile: null, error: null }),
  setProfile: (profile) => set({ profile }),
  setFeed: (feed) => set({ feed }),
  prependFeedItem: (item) => set((state) => ({ feed: [item, ...state.feed] })),
  bumpFeedMetric: (videoId, type, value) =>
    set((state) => ({
      feed: state.feed.map((item) => (item.id === videoId ? updateMetric(item, type, value) : item))
    })),
  enqueueAction: (videoId, type) => {
    const id = crypto.randomUUID();
    set((state) => ({
      queue: [{ id, type, videoId, status: "pending" as const, createdAt: Date.now() }, ...state.queue].slice(0, 20)
    }));
    return id;
  },
  resolveAction: (actionId) =>
    set((state) => ({
      queue: state.queue.map((action) => (action.id === actionId ? { ...action, status: "done" } : action))
    })),
  failAction: (actionId, error) =>
    set((state) => ({
      queue: state.queue.map((action) => (action.id === actionId ? { ...action, status: "failed", error } : action))
    })),
  setError: (error) => set({ error })
}));
