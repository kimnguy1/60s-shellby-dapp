export type WalletProfile = {
  walletAddress: string;
  displayName: string;
  avatarUrl?: string;
  balances: {
    apt: number;
    shelbyUsd: number;
    shelbyToken: number;
  };
  uploadedVideos: number;
};

export type WalletConnectResponse = Omit<WalletProfile, "uploadedVideos">;

export type FeedItem = {
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

export type FeedResponse = {
  items: FeedItem[];
};

export type UploadVideoInput = {
  walletAddress: string;
  videoUrl: string;
  caption?: string;
};

export type UploadVideoResponse = {
  id: string;
  ownerWalletAddress: string;
  caption: string | null;
  videoUrl: string;
  createdAt: number;
};

export type QueueActionType = "like" | "comment" | "donate" | "download";

export type PendingQueueAction = {
  id: string;
  type: QueueActionType;
  videoId: string;
  status: "pending" | "done" | "failed";
  createdAt: number;
  error?: string;
};
