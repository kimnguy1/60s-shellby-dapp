"use client";

import { AccountAddress } from "@aptos-labs/ts-sdk";
import { WalletCore } from "@aptos-labs/wallet-adapter-core";
import { WalletReadyState, type AdapterWallet, type InputTransactionData } from "@aptos-labs/wallet-adapter-core";
import { Howl } from "howler";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  ApiError,
  commentVideo,
  connectWallet,
  donateVideo,
  downloadVideo,
  getFeed,
  getProfile,
  likeVideo,
  uploadVideo
} from "@/lib/api";
import { useAirdropStore } from "@/store/airdropStore";
import { syntheticCreators, syntheticFollowGraphHints } from "../../backend/src/db/syntheticFixtures";

function normalizeWalletAddress(address: string): string {
  return AccountAddress.fromString(address).toStringLong();
}

function formatWalletAddress(address: string): string {
  if (address.length <= 14) {
    return address;
  }
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

function formatTime(epochMs: number): string {
  return new Date(epochMs).toLocaleString();
}

function avatarStorageKey(walletAddress: string): string {
  return `shelby.avatar.${walletAddress.toLowerCase()}`;
}

function bioStorageKey(walletAddress: string): string {
  return `shelby.bio.${walletAddress.toLowerCase()}`;
}

function normalizeWalletKey(walletAddress: string): string {
  return walletAddress.trim().toLowerCase();
}

function getInstalledWallets(walletCore: WalletCore): AdapterWallet[] {
  return walletCore.wallets.filter((wallet): wallet is AdapterWallet => {
    return (wallet as AdapterWallet).readyState === WalletReadyState.Installed;
  });
}

function isExtensionInjectionConflict(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("cannot redefine property: ethereum") ||
    message.includes("metamask") ||
    message.includes("backpack") ||
    message.includes("ethereum")
  );
}

function walletConflictFallbackMessage(): string {
  return "Wallet extension conflict detected. Disable conflicting EVM wallet extensions or enter Aptos wallet address manually.";
}

function extractHashtags(caption: string | null): string[] {
  if (!caption) {
    return [];
  }
  const matches = caption.match(/#[\p{L}\p{N}_]+/gu);
  return matches ? matches.slice(0, 3) : [];
}

function captionWithoutHashtags(caption: string | null): string {
  if (!caption) {
    return "No caption";
  }
  const stripped = caption.replace(/#[\p{L}\p{N}_]+/gu, "").replace(/\s+/g, " ").trim();
  return stripped.length > 0 ? stripped : "No caption";
}

function isNftCaption(caption: string | null): boolean {
  return /(^|\s)#nft\b/i.test(caption ?? "");
}

function profileInitial(displayName: string): string {
  return displayName.slice(0, 1).toUpperCase();
}

const APT_OCTA = 100_000_000n;
const MAX_DONATE_APT = 10_000;

function buildFallbackProfile(walletAddress: string, displayName: string): { walletAddress: string; displayName: string; balances: { apt: number; shelbyUsd: number; shelbyToken: number }; uploadedVideos: number } {
  return {
    walletAddress,
    displayName: displayName.trim().length > 0 ? displayName.trim() : "Guest Creator",
    balances: {
      apt: 0,
      shelbyUsd: 0,
      shelbyToken: 0
    },
    uploadedVideos: 0
  };
}

function parseAptAmount(rawAmount: string): { aptAmount: number; octas: bigint } {
  const trimmedAmount = rawAmount.trim();
  if (!/^\d+(\.\d{1,8})?$/.test(trimmedAmount)) {
    throw new Error("Enter a valid APT amount with up to 8 decimals");
  }

  const [wholePart = "0", decimalPart = ""] = trimmedAmount.split(".");
  const paddedDecimals = decimalPart.padEnd(8, "0");
  const octas = BigInt(wholePart) * APT_OCTA + BigInt(paddedDecimals);

  if (octas <= 0n) {
    throw new Error("Donation amount must be greater than 0 APT");
  }

  const aptAmount = Number(trimmedAmount);
  if (!Number.isFinite(aptAmount) || aptAmount > MAX_DONATE_APT) {
    throw new Error(`Donation amount must be between 0 and ${MAX_DONATE_APT} APT`);
  }

  return { aptAmount, octas };
}

function buildAptTransferTransaction(recipientAddress: string, amountOctas: bigint): InputTransactionData {
  return {
    data: {
      function: "0x1::aptos_account::transfer",
      typeArguments: [],
      functionArguments: [recipientAddress, amountOctas.toString()]
    }
  };
}

function isShelbyHostedVideo(videoUrl: string): boolean {
  try {
    const parsed = new URL(videoUrl);
    const host = parsed.hostname.toLowerCase();
    return host.includes("shelby");
  } catch (error) {
    return false;
  }
}

type ActionIconName = "like" | "comment" | "share" | "donate" | "download";

function ActionIcon({ name }: { name: ActionIconName }) {
  if (name === "like") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 20.4L10.6 19.1C5.3 14.4 2 11.4 2 7.8C2 5 4.2 2.8 7 2.8C8.6 2.8 10.1 3.5 11.1 4.7L12 5.8L12.9 4.7C13.9 3.5 15.4 2.8 17 2.8C19.8 2.8 22 5 22 7.8C22 11.4 18.7 14.4 13.4 19.1L12 20.4Z"
          fill="currentColor"
        />
      </svg>
    );
  }
  if (name === "comment") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M4 3.5H20C21.1 3.5 22 4.4 22 5.5V15.5C22 16.6 21.1 17.5 20 17.5H9.2L4.8 21.6C4.2 22.1 3.2 21.7 3.2 20.8V17.5H4C2.9 17.5 2 16.6 2 15.5V5.5C2 4.4 2.9 3.5 4 3.5Z"
          fill="currentColor"
        />
      </svg>
    );
  }
  if (name === "share") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M16.5 3C18.4 3 20 4.6 20 6.5C20 6.9 19.9 7.4 19.7 7.8L8.8 13.4C8.2 12.8 7.4 12.5 6.5 12.5C6.2 12.5 5.9 12.5 5.6 12.6L5.5 12.6C4.1 12.9 3 14.1 3 15.5C3 17.4 4.6 19 6.5 19C7.4 19 8.2 18.7 8.8 18.1L19.7 23.7L20.8 21.7L10 16.2C10 16 10 15.7 10 15.5C10 15.3 10 15 10 14.8L20.8 9.3C21 8.9 21 8.7 21 8.5C21 5.5 19 3 16.5 3Z"
          fill="currentColor"
        />
      </svg>
    );
  }
  if (name === "donate") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 2C7 2 3 6 3 11C3 15.2 5.9 18.7 9.8 19.7V22H14.2V19.7C18.1 18.7 21 15.2 21 11C21 6 17 2 12 2ZM13 17.8V19.6H11V17.8C9.2 17.5 7.8 16.2 7.6 14.4H10.1C10.3 15.2 11.1 15.8 12 15.8C13 15.8 13.8 15.2 13.8 14.4C13.8 13.5 12.9 13.2 11.8 12.9C10.2 12.4 7.8 11.8 7.8 9.2C7.8 7.3 9.2 5.8 11 5.4V3.8H13V5.4C14.8 5.7 16.2 7 16.4 8.8H13.9C13.7 8 12.9 7.4 12 7.4C11 7.4 10.2 8 10.2 8.8C10.2 9.6 11.1 9.9 12.2 10.2C13.8 10.7 16.2 11.3 16.2 13.9C16.2 15.9 14.8 17.4 13 17.8Z"
          fill="currentColor"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3L12 15.6L7.7 11.3L6.3 12.7L13 19.4L19.7 12.7L18.3 11.3L14 15.6L14 3H12Z" fill="currentColor" />
      <path d="M4 19H20V21H4V19Z" fill="currentColor" />
    </svg>
  );
}

type SideNavIconName = "for-you" | "following" | "explore" | "live";

function SideNavIcon({ name }: { name: SideNavIconName }) {
  if (name === "for-you") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3L21 10.2V21H14.8V14.6H9.2V21H3V10.2L12 3Z" fill="currentColor" />
      </svg>
    );
  }
  if (name === "following") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 12.2C10.9 12.2 12.4 10.7 12.4 8.8C12.4 6.9 10.9 5.4 9 5.4C7.1 5.4 5.6 6.9 5.6 8.8C5.6 10.7 7.1 12.2 9 12.2Z" />
        <path d="M15.8 11.4C17.3 11.4 18.5 10.2 18.5 8.7C18.5 7.2 17.3 6 15.8 6C14.3 6 13.1 7.2 13.1 8.7C13.1 10.2 14.3 11.4 15.8 11.4Z" />
        <path d="M2.8 18.4C3.2 15.8 5.3 14 7.9 14H10.1C12.7 14 14.8 15.8 15.2 18.4H2.8Z" />
        <path d="M13.3 18.4C13.6 16.6 15 15.3 16.8 15.3H17.7C19.5 15.3 20.9 16.6 21.2 18.4H13.3Z" />
      </svg>
    );
  }
  if (name === "explore") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 4H13V13H4V4Z" />
        <path d="M4 15H13V20H4V15Z" />
        <path d="M15 4H20V9H15V4Z" />
        <path d="M15 11H20V20H15V11Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3.5 7.5C3.5 6.4 4.4 5.5 5.5 5.5H14.5C15.6 5.5 16.5 6.4 16.5 7.5V16.5C16.5 17.6 15.6 18.5 14.5 18.5H5.5C4.4 18.5 3.5 17.6 3.5 16.5V7.5Z" />
      <path d="M17.7 9.3L21 7.5V16.5L17.7 14.7V9.3Z" />
    </svg>
  );
}

export default function HomePage() {
  const [loading, setLoading] = useState(false);
  const [uploadUrl, setUploadUrl] = useState("");
  const [uploadCaption, setUploadCaption] = useState("");
  const [uploadSource, setUploadSource] = useState<"url" | "file">("url");
  const [selectedUploadFileName, setSelectedUploadFileName] = useState("");
  const [selectedUploadPreview, setSelectedUploadPreview] = useState("");
  const [latestUploadedUrl, setLatestUploadedUrl] = useState("");
  const [shelbyUploadStatus, setShelbyUploadStatus] = useState<"unknown" | "verified" | "not-verified">("unknown");
  const [shareStatusByVideoId, setShareStatusByVideoId] = useState<Record<string, "idle" | "copied">>({});
  const [profileDisplayNameInput, setProfileDisplayNameInput] = useState("");
  const [profileAvatarInput, setProfileAvatarInput] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [profileTab, setProfileTab] = useState<"videos" | "favorites" | "liked">("videos");
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [feedTab, setFeedTab] = useState<"for-you" | "following" | "explorer">("for-you");
  const [searchQuery, setSearchQuery] = useState("");
  const [navPanel, setNavPanel] = useState<"upload" | "profile" | "wallet" | null>(null);
  const [donateModalVideoId, setDonateModalVideoId] = useState<string | null>(null);
  const [donateAmountInput, setDonateAmountInput] = useState("0.1");
  const [donateStatus, setDonateStatus] = useState<"idle" | "signing" | "submitting" | "success" | "error">("idle");
  const [donateStatusMessage, setDonateStatusMessage] = useState<string | null>(null);
  const [walletCopyStatus, setWalletCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const [walletStandardAvailable, setWalletStandardAvailable] = useState(false);
  const walletCoreRef = useRef<WalletCore | null>(null);

  const successSfx = useRef(
    new Howl({
      src: ["https://actions.google.com/sounds/v1/cartoon/pop.ogg"],
      volume: 0.2
    })
  );

  const {
    walletAddress,
    displayName,
    walletState,
    profile,
    feed,
    queue,
    error,
    setWalletAddress,
    setDisplayName,
    setWalletConnected,
    setWalletDisconnected,
    setProfile,
    setFeed,
    prependFeedItem,
    bumpFeedMetric,
    enqueueAction,
    resolveAction,
    failAction,
    setError
  } = useAirdropStore();

  const refreshFeed = async () => {
    try {
      const result = await getFeed();
      setFeed(result.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load feed");
    }
  };

  useEffect(() => {
    void (async () => {
      await refreshFeed();
    })();
  }, []);

  useEffect(() => {
    let resyncTimeout: number | null = null;

    try {
      const walletCore = new WalletCore();
      walletCoreRef.current = walletCore;
      setWalletStandardAvailable(getInstalledWallets(walletCore).length > 0);

      // Some wallet extensions inject after initial render.
      resyncTimeout = window.setTimeout(() => {
        setWalletStandardAvailable(getInstalledWallets(walletCore).length > 0);
      }, 300);
    } catch (err) {
      walletCoreRef.current = null;
      setWalletStandardAvailable(false);
      if (isExtensionInjectionConflict(err)) {
        setError(walletConflictFallbackMessage());
      } else {
        setError(err instanceof Error ? err.message : "Wallet adapter failed to initialize");
      }
    }

    return () => {
      if (resyncTimeout !== null) {
        window.clearTimeout(resyncTimeout);
      }
    };
  }, [setError]);

  const canInteract = walletState === "connected" && walletAddress.length > 0;

  const queueStats = useMemo(() => {
    const pending = queue.filter((item) => item.status === "pending").length;
    const failed = queue.filter((item) => item.status === "failed").length;
    return { pending, failed };
  }, [queue]);

  const syntheticCreatorDisplayMap = useMemo(
    () =>
      new Map(
        syntheticCreators.map((creator) => [normalizeWalletKey(creator.walletAddress), creator.displayName] as const)
      ),
    []
  );

  const syntheticFollowingMap = useMemo(
    () =>
      new Map(
        Object.entries(syntheticFollowGraphHints).map(([walletAddress, follows]) => [
          normalizeWalletKey(walletAddress),
          follows.map((followedWalletAddress) => normalizeWalletKey(followedWalletAddress))
        ])
      ),
    []
  );

  const followingFeed = useMemo(() => {
    if (!walletAddress) {
      return [];
    }
    const normalizedWallet = normalizeWalletKey(walletAddress);
    const followedWallets = syntheticFollowingMap.get(normalizedWallet);
    if (followedWallets && followedWallets.length > 0) {
      const followedWalletSet = new Set(followedWallets);
      const followedFeed = feed.filter((item) => followedWalletSet.has(normalizeWalletKey(item.ownerWalletAddress)));
      if (followedFeed.length > 0) {
        return followedFeed;
      }
    }

    return feed.filter((item) => normalizeWalletKey(item.ownerWalletAddress) !== normalizedWallet);
  }, [feed, syntheticFollowingMap, walletAddress]);

  const ownerDisplayNameByWallet = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of feed) {
      const key = normalizeWalletKey(item.ownerWalletAddress);
      if (!map.has(key)) {
        map.set(key, item.ownerDisplayName);
      }
    }
    return map;
  }, [feed]);

  const creatorSuggestions = useMemo(() => {
    const normalizedWallet = walletAddress ? normalizeWalletKey(walletAddress) : "";
    const prioritized = normalizedWallet ? syntheticFollowingMap.get(normalizedWallet) ?? [] : [];
    const orderedWallets = [...prioritized, ...syntheticCreators.map((creator) => normalizeWalletKey(creator.walletAddress))]
      .filter((wallet, index, array) => array.indexOf(wallet) === index)
      .filter((wallet) => wallet !== normalizedWallet)
      .slice(0, 6);

    return orderedWallets.map((wallet) => ({
      walletAddress: wallet,
      displayName:
        ownerDisplayNameByWallet.get(wallet) ?? syntheticCreatorDisplayMap.get(wallet) ?? formatWalletAddress(wallet)
    }));
  }, [ownerDisplayNameByWallet, syntheticCreatorDisplayMap, syntheticFollowingMap, walletAddress]);

  const explorerFeed = useMemo(
    () =>
      [...feed].sort((a, b) => {
        const scoreA = a.likes + a.comments + a.donations + a.downloads;
        const scoreB = b.likes + b.comments + b.donations + b.downloads;
        return scoreB - scoreA;
      }),
    [feed]
  );

  const visibleFeed = useMemo(() => {
    const baseFeed = feedTab === "for-you" ? feed : feedTab === "following" ? followingFeed : explorerFeed;
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return baseFeed;
    }

    return baseFeed.filter((item) => {
      return item.ownerDisplayName.toLowerCase().includes(query) || (item.caption ? item.caption.toLowerCase().includes(query) : false);
    });
  }, [explorerFeed, feed, feedTab, followingFeed, searchQuery]);
  const donateTarget = useMemo(() => {
    if (!donateModalVideoId) {
      return null;
    }
    return feed.find((item) => item.id === donateModalVideoId) ?? null;
  }, [donateModalVideoId, feed]);
  const donationInFlight = donateStatus === "signing" || donateStatus === "submitting";

  const setActiveFeedTab = (nextTab: "for-you" | "following" | "explorer") => {
    setFeedTab(nextTab);
    setActiveIndex(0);
    if (nextTab === "for-you") {
      setSearchQuery("");
      setNavPanel(null);
    }
  };

  useEffect(() => {
    if (visibleFeed.length === 0) {
      setActiveIndex(0);
      return;
    }

    if (activeIndex > visibleFeed.length - 1) {
      setActiveIndex(visibleFeed.length - 1);
    }
  }, [activeIndex, visibleFeed.length]);

  const activeItem = visibleFeed[activeIndex] ?? null;
  const profileAvatarPreview = profileAvatarInput.trim() || profile?.avatarUrl || "";
  const withAvatarProfile = <T extends { walletAddress: string; displayName: string }>(baseProfile: T, avatarUrl: string) => {
    if (!avatarUrl) {
      return baseProfile;
    }
    return { ...baseProfile, avatarUrl };
  };

  const recommendedItems = useMemo(
    () =>
      visibleFeed
        .filter((_, index) => index !== activeIndex)
        .slice(0, 6),
    [activeIndex, visibleFeed]
  );

  const recentCommentActions = useMemo(
    () => queue.filter((item) => item.type === "comment").slice(0, 4),
    [queue]
  );
  const uploadedVideos = useMemo(() => {
    if (!profile) {
      return [];
    }

    return feed.filter((item) => item.ownerWalletAddress === profile.walletAddress);
  }, [feed, profile]);
  const profileTotals = useMemo(() => {
    const likes = uploadedVideos.reduce((total, item) => total + item.likes, 0);
    return {
      following: followingFeed.length,
      followers: Math.max(0, uploadedVideos.length * 124),
      likes
    };
  }, [followingFeed.length, uploadedVideos]);

  const withWalletGate = async (action: () => Promise<void>) => {
    if (!canInteract) {
      setError("Connect Aptos wallet to interact.");
      return;
    }

    try {
      setError(null);
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    }
  };

  const connectWithAddress = async (rawAddress: string) => {
    let normalized = "";
    try {
      normalized = normalizeWalletAddress(rawAddress);
    } catch (err) {
      setError("Invalid Aptos wallet address");
      throw new Error("Invalid Aptos wallet address");
    }
    setWalletAddress(normalized);
    // Promote the local UI state immediately after address validation so wallet controls
    // do not stall behind backend/profile sync latency or deploy-time API routing issues.
    setWalletConnected(normalized);
    try {
      const connected = await connectWallet(normalized, displayName || undefined);
      if (connected.displayName.trim().length > 0) {
        setDisplayName(connected.displayName);
      }

      const currentProfile = await getProfile(normalized);
      let avatarUrl: string | undefined;
      let storedBio = "";
      const storedAvatar = window.localStorage.getItem(avatarStorageKey(normalized));
      avatarUrl = storedAvatar && storedAvatar.trim().length > 0 ? storedAvatar : undefined;
      storedBio = window.localStorage.getItem(bioStorageKey(normalized)) ?? "";
      setProfile(withAvatarProfile(currentProfile, avatarUrl ?? ""));
      setProfileDisplayNameInput(currentProfile.displayName);
      setProfileAvatarInput(avatarUrl ?? "");
      setProfileBio(storedBio);
      setError(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Wallet connected locally but backend profile sync failed";
      const storedAvatar = window.localStorage.getItem(avatarStorageKey(normalized));
      const avatarUrl = storedAvatar && storedAvatar.trim().length > 0 ? storedAvatar : "";
      const storedBio = window.localStorage.getItem(bioStorageKey(normalized)) ?? "";
      const fallbackProfile = withAvatarProfile(
        buildFallbackProfile(normalized, displayName),
        avatarUrl
      );
      setProfile(fallbackProfile);
      setProfileDisplayNameInput(fallbackProfile.displayName);
      setProfileAvatarInput(avatarUrl);
      setProfileBio(storedBio);
      if (err instanceof ApiError) {
        setError(`${message} Local demo mode is active until backend sync recovers.`);
        return;
      }
      throw new Error(message);
    }
  };

  const onConnect = async () => {
    try {
      setLoading(true);
      const walletCore = walletCoreRef.current;
      const installedWallets = walletCore ? getInstalledWallets(walletCore) : [];
      const manualAddress = walletAddress.trim();

      // Prefer deterministic manual connect when an address is entered.
      // This avoids hanging extension handshakes in CI/browser automation runs.
      if (manualAddress) {
        await connectWithAddress(manualAddress);
        return;
      }

      if (walletCore && installedWallets.length > 0) {
        try {
          const preferredWallet = installedWallets.find((wallet) => wallet.name === "Petra") ?? installedWallets[0];
          if (!preferredWallet) {
            throw new Error("No Aptos Wallet Standard wallet is available");
          }
          await walletCore.connect(preferredWallet.name);
          const connectedAddress = walletCore.account?.address.toString();

          if (!connectedAddress) {
            throw new Error("Wallet connected but did not return an address");
          }

          await connectWithAddress(connectedAddress);
          return;
        } catch (walletStandardError) {
          if (!manualAddress) {
            if (isExtensionInjectionConflict(walletStandardError)) {
              throw new Error(walletConflictFallbackMessage());
            }
            if (walletStandardError instanceof Error && walletStandardError.message.length > 0) {
              throw walletStandardError;
            }
            throw new Error("Wallet connection failed");
          }
        }
      }

      if (!manualAddress) {
        throw new Error("Enter an Aptos wallet address");
      }

      await connectWithAddress(manualAddress);
    } catch (err) {
      if (err instanceof Error && err.message.length > 0) {
        setError(err.message);
      } else {
        setError("Wallet connection failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const onDisconnect = async () => {
    setLoading(true);
    try {
      const walletCore = walletCoreRef.current;
      if (walletCore?.isConnected()) {
        await walletCore.disconnect();
      }
      setWalletDisconnected();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disconnect wallet");
    } finally {
      setLoading(false);
    }
  };

  const copyWalletAddress = async () => {
    if (!walletAddress) {
      return;
    }
    try {
      await navigator.clipboard.writeText(walletAddress);
      setWalletCopyStatus("copied");
      window.setTimeout(() => setWalletCopyStatus("idle"), 1200);
    } catch (err) {
      setWalletCopyStatus("failed");
      setError(err instanceof Error ? err.message : "Failed to copy wallet address");
    }
  };

  const isProfileWalletPanel = navPanel === "profile" || navPanel === "wallet";
  const showWalletConnectPanel = navPanel === "wallet";

  // Plan:
  // 1) Open a modal for donation amount entry and validate recipient + amount client-side.
  // 2) Submit an on-chain APT transfer through Wallet Standard, then sync API metrics.
  // 3) Surface signing/submitting/success/error states in the modal for clear UX.
  const onDonate = (videoId: string) => {
    if (!canInteract) {
      setError("Connect Aptos wallet to interact.");
      return;
    }
    setDonateModalVideoId(videoId);
    setDonateAmountInput("0.1");
    setDonateStatus("idle");
    setDonateStatusMessage(null);
  };

  const closeDonateModal = () => {
    if (donationInFlight) {
      return;
    }
    setDonateModalVideoId(null);
    setDonateStatus("idle");
    setDonateStatusMessage(null);
  };

  const onConfirmDonate = async () => {
    if (!donateTarget) {
      setDonateStatus("error");
      setDonateStatusMessage("Selected video is no longer available");
      return;
    }

    const walletCore = walletCoreRef.current;
    if (!walletCore?.isConnected()) {
      const message = "Connect Petra wallet before donating";
      setDonateStatus("error");
      setDonateStatusMessage(message);
      setError(message);
      return;
    }

    if (donateTarget.ownerWalletAddress.toLowerCase() === walletAddress.toLowerCase()) {
      const message = "You cannot donate to your own video";
      setDonateStatus("error");
      setDonateStatusMessage(message);
      setError(message);
      return;
    }

    let parsedAmount: { aptAmount: number; octas: bigint };
    try {
      parsedAmount = parseAptAmount(donateAmountInput);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid donation amount";
      setDonateStatus("error");
      setDonateStatusMessage(message);
      setError(message);
      return;
    }

    let actionId: string | null = null;
    try {
      setDonateStatus("signing");
      setDonateStatusMessage("Await wallet approval to sign transaction");
      setError(null);

      // SECURITY: feed data is untrusted; canonicalize recipient before building transfer payload.
      const recipientAddress = normalizeWalletAddress(donateTarget.ownerWalletAddress);
      const tx = buildAptTransferTransaction(recipientAddress, parsedAmount.octas);
      actionId = enqueueAction(donateTarget.id, "donate");

      const txResult = await walletCore.signAndSubmitTransaction(tx);

      setDonateStatus("submitting");
      setDonateStatusMessage("Transaction submitted, finalizing donation activity");
      await donateVideo(donateTarget.id, walletAddress, parsedAmount.aptAmount);
      bumpFeedMetric(donateTarget.id, "donate", parsedAmount.aptAmount);
      resolveAction(actionId);
      setDonateStatus("success");
      setDonateStatusMessage(`Donation sent. Tx ${txResult.hash.slice(0, 10)}...`);
      successSfx.current.play();
    } catch (err) {
      if (actionId) {
        failAction(actionId, err instanceof Error ? err.message : "Failed donation");
      }
      const message = err instanceof Error ? err.message : "Donation failed";
      setDonateStatus("error");
      setDonateStatusMessage(message);
      setError(message);
      return;
    }

    window.setTimeout(() => {
      setDonateModalVideoId(null);
      setDonateStatus("idle");
      setDonateStatusMessage(null);
    }, 1200);
  };

  const onUpload = async () => {
    await withWalletGate(async () => {
      if (!uploadUrl) {
        setError(uploadSource === "file" ? "Video file is required" : "Video URL is required");
        return;
      }

      if (uploadSource === "url") {
        let parsedUploadUrl: URL;
        try {
          parsedUploadUrl = new URL(uploadUrl);
        } catch (error) {
          setError("Video URL is invalid");
          return;
        }
        if (parsedUploadUrl.protocol !== "https:" && parsedUploadUrl.protocol !== "http:") {
          setError("Video URL must use http or https");
          return;
        }
      } else if (!uploadUrl.startsWith("data:video/")) {
        setError("Selected file is not a supported video");
        return;
      }

      setLoading(true);
      try {
        let uploaded;
        try {
          uploaded = await uploadVideo(
            uploadCaption
              ? {
                  walletAddress,
                  videoUrl: uploadUrl,
                  caption: uploadCaption
                }
              : {
                  walletAddress,
                  videoUrl: uploadUrl
                }
          );
        } catch (err) {
          if (!(err instanceof ApiError)) {
            throw err;
          }
          uploaded = {
            id: crypto.randomUUID(),
            ownerWalletAddress: walletAddress,
            caption: uploadCaption || null,
            videoUrl: uploadUrl,
            createdAt: Date.now()
          };
          setError(`${err.message} Uploaded locally in demo mode; backend sync is pending.`);
        }

        prependFeedItem({
          ...uploaded,
          ownerDisplayName: profile?.displayName ?? displayName ?? "You",
          likes: 0,
          comments: 0,
          donations: 0,
          downloads: 0
        });

        const currentProfile = await getProfile(walletAddress);
        const persistedAvatar = profileAvatarInput.trim() || profile?.avatarUrl || "";
        setProfile(withAvatarProfile(currentProfile, persistedAvatar));
        setUploadCaption("");
        setUploadUrl("");
        setSelectedUploadFileName("");
        setSelectedUploadPreview("");
        setActiveIndex(0);
        setLatestUploadedUrl(uploaded.videoUrl);
        setShelbyUploadStatus(isShelbyHostedVideo(uploaded.videoUrl) ? "verified" : "not-verified");
      } finally {
        setLoading(false);
      }
    });
  };

  const onUploadFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (!file.type.startsWith("video/")) {
      setError("Upload file must be a video");
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => setError("Failed to read video file");
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        setError("Failed to parse selected video file");
        return;
      }
      setUploadSource("file");
      setUploadUrl(reader.result);
      setSelectedUploadFileName(file.name);
      setSelectedUploadPreview(reader.result);
      setShelbyUploadStatus("unknown");
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const onProfileAvatarFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Avatar file must be an image");
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => setError("Failed to read avatar file");
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        setError("Failed to parse avatar file");
        return;
      }
      setProfileAvatarInput(reader.result);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const onSaveProfile = async () => {
    await withWalletGate(async () => {
      const nextDisplayName = profileDisplayNameInput.trim();
      if (!nextDisplayName) {
        setError("Display name is required");
        return;
      }

      const nextAvatar = profileAvatarInput.trim();
      const nextBio = profileBio.trim();
      setLoading(true);
      try {
        await connectWallet(walletAddress, nextDisplayName);

        try {
          if (nextAvatar.length > 0) {
            window.localStorage.setItem(avatarStorageKey(walletAddress), nextAvatar);
          } else {
            window.localStorage.removeItem(avatarStorageKey(walletAddress));
          }
          if (nextBio.length > 0) {
            window.localStorage.setItem(bioStorageKey(walletAddress), nextBio);
          } else {
            window.localStorage.removeItem(bioStorageKey(walletAddress));
          }
        } catch (err) {
          throw new Error(err instanceof Error ? err.message : "Failed to persist profile settings");
        }

        const refreshedProfile = await getProfile(walletAddress);
        setDisplayName(nextDisplayName);
        setProfile(withAvatarProfile(refreshedProfile, nextAvatar));
      } finally {
        setLoading(false);
      }
    });
  };

  const onLike = async (videoId: string) => {
    await withWalletGate(async () => {
      bumpFeedMetric(videoId, "like");
      const actionId = enqueueAction(videoId, "like");

      try {
        await likeVideo(videoId, walletAddress);
        resolveAction(actionId);
        successSfx.current.play();
      } catch (err) {
        failAction(actionId, err instanceof Error ? err.message : "Failed like");
        throw err;
      }
    });
  };

  const onComment = async (videoId: string) => {
    await withWalletGate(async () => {
      const content = commentInput[videoId]?.trim();
      if (!content) {
        setError("Comment cannot be empty");
        return;
      }

      bumpFeedMetric(videoId, "comment");
      const actionId = enqueueAction(videoId, "comment");

      try {
        await commentVideo(videoId, walletAddress, content);
        resolveAction(actionId);
        setCommentInput((state) => ({ ...state, [videoId]: "" }));
      } catch (err) {
        failAction(actionId, err instanceof Error ? err.message : "Failed comment");
        throw err;
      }
    });
  };

  const onDownload = async (videoId: string) => {
    await withWalletGate(async () => {
      bumpFeedMetric(videoId, "download");
      const actionId = enqueueAction(videoId, "download");

      try {
        const result = await downloadVideo(videoId, walletAddress);
        resolveAction(actionId);
        window.open(result.url, "_blank", "noopener,noreferrer");
      } catch (err) {
        failAction(actionId, err instanceof Error ? err.message : "Failed download");
        throw err;
      }
    });
  };

  const onShare = async (videoId: string, videoUrl: string) => {
    try {
      await navigator.clipboard.writeText(videoUrl);
      setShareStatusByVideoId((state) => ({ ...state, [videoId]: "copied" }));
      window.setTimeout(() => {
        setShareStatusByVideoId((state) => ({ ...state, [videoId]: "idle" }));
      }, 1400);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to copy share link");
    }
  };

  return (
    <main className="app-shell">
      <header className="main-header">
        <div className="header-left">
          <h1>60s</h1>
          <small>Short-form Video</small>
          <input
            className="header-search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search accounts and videos"
            aria-label="Search feed"
          />
        </div>
        <div className="header-actions">
          <button className="secondary-button" onClick={() => setNavPanel("upload")} disabled={!canInteract} title={!canInteract ? "Connect wallet to upload" : undefined}>
            Upload
          </button>
          <button className="wallet-button" onClick={canInteract ? onDisconnect : onConnect} disabled={loading}>
            {canInteract ? "Disconnect Wallet" : walletStandardAvailable ? "Connect Wallet" : "Connect Wallet (Manual)"}
          </button>
          {canInteract ? (
            <button className="wallet-pill" onClick={() => void copyWalletAddress()} title={walletAddress}>
              {formatWalletAddress(walletAddress)}
            </button>
          ) : null}
          <button className="profile-trigger" onClick={() => setNavPanel("profile")} aria-label="Profile">
            {(profile?.displayName ?? displayName ?? "U").slice(0, 1).toUpperCase()}
          </button>
        </div>
      </header>

      <div className="page-layout">
        <aside className="left-sidebar" data-purpose="navigation-sidebar">
          <nav className="side-nav" aria-label="Primary">
            <button className={feedTab === "for-you" ? "side-link side-link-active" : "side-link"} onClick={() => setActiveFeedTab("for-you")}>
              <span className="side-link-icon" aria-hidden="true">
                <SideNavIcon name="for-you" />
              </span>
              <span className="side-link-label">For You</span>
            </button>
            <button className={feedTab === "following" ? "side-link side-link-active" : "side-link"} onClick={() => setActiveFeedTab("following")}>
              <span className="side-link-icon" aria-hidden="true">
                <SideNavIcon name="following" />
              </span>
              <span className="side-link-label">Following</span>
            </button>
            <button className={feedTab === "explorer" ? "side-link side-link-active" : "side-link"} onClick={() => setActiveFeedTab("explorer")}>
              <span className="side-link-icon" aria-hidden="true">
                <SideNavIcon name="explore" />
              </span>
              <span className="side-link-label">Explore</span>
            </button>
            <button className="side-link" disabled title="Live is coming soon">
              <span className="side-link-icon" aria-hidden="true">
                <SideNavIcon name="live" />
              </span>
              <span className="side-link-label">Live</span>
            </button>
          </nav>

          <div className="side-stack">
            <button className="secondary-button" onClick={() => setNavPanel("upload")} disabled={!canInteract} title={!canInteract ? "Connect wallet to upload" : undefined}>
              Upload Clip
            </button>
            <button className="secondary-button" onClick={() => setNavPanel("wallet")}>
              Profile & Wallet
            </button>
          </div>

          <div className="side-meta">
            <p>Creator suggestions</p>
            {creatorSuggestions.length > 0 ? (
              <ul className="left-creator-list">
                {creatorSuggestions.map((creator) => (
                  <li key={creator.walletAddress}>
                    <span>{creator.displayName}</span>
                    <small>{formatWalletAddress(creator.walletAddress)}</small>
                  </li>
                ))}
              </ul>
            ) : (
              <small>Waiting for creator fixtures.</small>
            )}
          </div>

          <div className="side-meta">
            <p>Pending queue: {queueStats.pending}</p>
            <p>Failed queue: {queueStats.failed}</p>
            {error ? <p className="error-text">{error}</p> : null}
          </div>
        </aside>

        <section className="center-feed" aria-live="polite">
          {feedTab === "following" ? (
            <div className="feed-context">
              <h2>Following</h2>
              <small>{canInteract ? "Feed from creators you follow." : "Connect wallet to personalize following feed."}</small>
            </div>
          ) : null}
          {feedTab === "explorer" ? (
            <div className="feed-context">
              <h2>Explorer</h2>
              <small>Discovery ranking by total engagement.</small>
            </div>
          ) : null}
          {visibleFeed.length > 0 ? (
            feedTab === "explorer" ? (
              <div className="explorer-grid">
                {visibleFeed.map((item, index) => (
                  <article key={item.id} className="explorer-card">
                    <button className="explorer-preview" onClick={() => setActiveIndex(index)}>
                      <video src={item.videoUrl} muted playsInline preload="metadata" />
                      <span>#{index + 1}</span>
                    </button>
                    <div className="explorer-meta">
                      <strong>@{item.ownerDisplayName}</strong>
                      <small>{item.caption ?? "No caption"}</small>
                      <small>{item.likes + item.comments + item.donations + item.downloads} interactions</small>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="video-feed-container">
                {visibleFeed.map((item, index) => (
                  (() => {
                    const hashtags = extractHashtags(item.caption);
                    const isNftVideo = isNftCaption(item.caption);
                    return (
                      <article
                        key={item.id}
                        className={index === activeIndex ? "video-card video-card-active" : "video-card"}
                        onMouseEnter={() => setActiveIndex(index)}
                        onFocus={() => setActiveIndex(index)}
                        tabIndex={0}
                      >
                        <div className="video-frame">
                          <video
                            src={item.videoUrl}
                            controls
                            loop
                            muted={index !== activeIndex}
                            autoPlay={index === activeIndex}
                            playsInline
                            preload="metadata"
                            className="video-stage"
                          />
                          {isNftVideo ? <span className="nft-badge">NFT</span> : null}
                          <div className="video-overlay absolute bottom-0">
                            <p className="owner">@{item.ownerDisplayName}</p>
                            <p className="caption">{captionWithoutHashtags(item.caption)}</p>
                            {hashtags.length > 0 ? <p className="hashtags">{hashtags.join(" ")}</p> : null}
                            <small>{formatTime(item.createdAt)}</small>
                          </div>
                        </div>

                        <div className="action-rail">
                          <div className="action-avatar" aria-label={`${item.ownerDisplayName} avatar`} title={item.ownerDisplayName}>
                            {profileInitial(item.ownerDisplayName)}
                          </div>
                          <button onClick={() => void onLike(item.id)} disabled={!canInteract}>
                            <span className="action-icon" aria-hidden="true">
                              <ActionIcon name="like" />
                            </span>
                            <strong>{item.likes}</strong>
                            <span>Like</span>
                          </button>
                          <button onClick={() => void onComment(item.id)} disabled={!canInteract}>
                            <span className="action-icon" aria-hidden="true">
                              <ActionIcon name="comment" />
                            </span>
                            <strong>{item.comments}</strong>
                            <span>Comment</span>
                          </button>
                          <button onClick={() => void onShare(item.id, item.videoUrl)}>
                            <span className="action-icon" aria-hidden="true">
                              <ActionIcon name="share" />
                            </span>
                            <strong>{shareStatusByVideoId[item.id] === "copied" ? "Done" : "Copy"}</strong>
                            <span>Share</span>
                          </button>
                          <button className="donate-cta" onClick={() => void onDonate(item.id)} disabled={!canInteract}>
                            <span className="action-icon" aria-hidden="true">
                              <ActionIcon name="donate" />
                            </span>
                            <strong>{item.donations} S</strong>
                            <span>Donate</span>
                          </button>
                          <button onClick={() => void onDownload(item.id)} disabled={!canInteract}>
                            <span className="action-icon" aria-hidden="true">
                              <ActionIcon name="download" />
                            </span>
                            <strong>{item.downloads}</strong>
                            <span>Download</span>
                          </button>
                        </div>
                      </article>
                    );
                  })()
                ))}
              </div>
            )
          ) : (
            <article className="video-card empty-state">
              <p>
                {feedTab === "following"
                  ? "No videos in Following yet. Connect wallet and follow more creators."
                  : feedTab === "explorer"
                    ? "Explorer has no discoverable videos yet."
                    : "No videos yet. Connect wallet and upload the first clip."}
              </p>
            </article>
          )}

          {navPanel ? (
            <section className="utility-drawer" aria-label={`${navPanel} drawer`}>
              <header>
                <h2>{navPanel === "upload" ? "Upload" : "Profile & Wallet"}</h2>
                <button className="secondary-button" onClick={() => setNavPanel(null)}>
                  Close
                </button>
              </header>
              <div className="utility-drawer-content">

              {isProfileWalletPanel ? (
                <div className="panel profile-sheet">
                  {showWalletConnectPanel || !profile ? (
                    <>
                      <input
                        value={walletAddress}
                        onChange={(event) => setWalletAddress(event.target.value.trim())}
                        placeholder="0x... Aptos wallet"
                      />
                      <input
                        value={displayName}
                        onChange={(event) => setDisplayName(event.target.value)}
                        placeholder="Display name (optional)"
                      />
                      {canInteract ? (
                        <button onClick={onDisconnect} disabled={loading}>
                          Disconnect Wallet
                        </button>
                      ) : (
                        <button onClick={onConnect} disabled={loading}>
                          {walletStandardAvailable ? "Connect Aptos Wallet" : "Connect Aptos Wallet (Manual)"}
                        </button>
                      )}
                      <small>
                        {walletStandardAvailable
                          ? "Wallet Standard extension detected."
                          : "No Wallet Standard extension detected, manual address fallback enabled."}
                      </small>
                      <small>{canInteract ? "Wallet connected. You can disconnect or switch account." : "Connect wallet to load profile."}</small>
                    </>
                  ) : (
                    <div className="profile-grid">
                      <div className="profile-hero">
                        <div className="profile-header">
                          {profileAvatarPreview ? (
                            <img className="profile-avatar profile-avatar-large" src={profileAvatarPreview} alt={`${profile.displayName} avatar`} />
                          ) : (
                            <div className="profile-avatar profile-avatar-fallback profile-avatar-large" aria-hidden="true">
                              {profile.displayName.slice(0, 1).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <h3>{profile.displayName}</h3>
                            <small>{formatWalletAddress(profile.walletAddress)}</small>
                          </div>
                        </div>
                        <div>
                          <div className="profile-hero-actions">
                            <button className="secondary-button">Edit Profile</button>
                            <button className="secondary-button">Share</button>
                          </div>
                          <div className="profile-stats-row">
                            <p>
                              <strong>{profileTotals.following}</strong> Following
                            </p>
                            <p>
                              <strong>{profileTotals.followers}</strong> Followers
                            </p>
                            <p>
                              <strong>{profileTotals.likes}</strong> Likes
                            </p>
                          </div>
                          <small>{profileBio || "Building short-video experiences on 60s."}</small>
                        </div>
                      </div>
                      <div className="wallet-summary">
                        <p>Connected wallet</p>
                        <div className="wallet-address-row">
                          <strong>{formatWalletAddress(walletAddress)}</strong>
                          <button onClick={() => void copyWalletAddress()} disabled={!walletAddress}>
                            {walletCopyStatus === "copied" ? "Copied" : walletCopyStatus === "failed" ? "Copy failed" : "Copy"}
                          </button>
                        </div>
                        <small>{walletAddress}</small>
                      </div>
                      <div className="profile-balance-row">
                        <p>
                          ShelbyUSD
                          <strong>{profile.balances.shelbyUsd}</strong>
                        </p>
                        <p>
                          APT
                          <strong>{profile.balances.apt}</strong>
                        </p>
                        <p>
                          S
                          <strong>{profile.balances.shelbyToken}</strong>
                        </p>
                      </div>
                      <div className="profile-balance-legacy" aria-hidden="true">
                        <p>APT: {profile.balances.apt}</p>
                        <p>ShelbyUSD: {profile.balances.shelbyUsd}</p>
                        <p>S: {profile.balances.shelbyToken}</p>
                      </div>
                      <input
                        value={walletAddress}
                        onChange={(event) => setWalletAddress(event.target.value.trim())}
                        placeholder="0x... Aptos wallet"
                      />
                      <input
                        value={displayName}
                        onChange={(event) => setDisplayName(event.target.value)}
                        placeholder="Display name (optional)"
                      />
                      {canInteract ? (
                        <button onClick={onDisconnect} disabled={loading}>
                          Disconnect Wallet
                        </button>
                      ) : (
                        <button onClick={onConnect} disabled={loading}>
                          {walletStandardAvailable ? "Connect Aptos Wallet" : "Connect Aptos Wallet (Manual)"}
                        </button>
                      )}
                      <small>
                        {walletStandardAvailable
                          ? "Wallet Standard extension detected."
                          : "No Wallet Standard extension detected, manual address fallback enabled."}
                      </small>
                      <small>Wallet required for like, comment, donate and download.</small>
                      <label>
                        Display name
                        <input
                          value={profileDisplayNameInput}
                          onChange={(event) => setProfileDisplayNameInput(event.target.value)}
                          placeholder="Display name"
                        />
                      </label>
                      <label>
                        Avatar URL
                        <input
                          value={profileAvatarInput}
                          onChange={(event) => setProfileAvatarInput(event.target.value)}
                          placeholder="https://.../avatar.png"
                        />
                      </label>
                      <label>
                        Bio
                        <input value={profileBio} onChange={(event) => setProfileBio(event.target.value)} placeholder="Bio" />
                      </label>
                      <label>
                        Avatar file
                        <input type="file" accept="image/*" onChange={onProfileAvatarFileChange} />
                      </label>
                      <button onClick={() => void onSaveProfile()} disabled={loading || !canInteract}>
                        Save Profile
                      </button>
                      <div className="profile-tabs">
                        <button
                          className={profileTab === "videos" ? "profile-tab profile-tab-active" : "profile-tab"}
                          onClick={() => setProfileTab("videos")}
                        >
                          Videos
                        </button>
                        <button
                          className={profileTab === "favorites" ? "profile-tab profile-tab-active" : "profile-tab"}
                          onClick={() => setProfileTab("favorites")}
                        >
                          Favorites
                        </button>
                        <button
                          className={profileTab === "liked" ? "profile-tab profile-tab-active" : "profile-tab"}
                          onClick={() => setProfileTab("liked")}
                        >
                          Liked
                        </button>
                      </div>
                      {profileTab === "videos" ? (
                        <div>
                          <small>Uploads grid</small>
                          <div className="uploads-grid">
                            {uploadedVideos.length > 0 ? (
                              uploadedVideos.map((video) => (
                                <article key={video.id} className="upload-card">
                                  <video src={video.videoUrl} muted playsInline preload="metadata" />
                                  <p>{video.caption ?? "No caption"}</p>
                                </article>
                              ))
                            ) : (
                              <small>No uploads yet.</small>
                            )}
                          </div>
                          <small>Total uploads: {profile.uploadedVideos}</small>
                        </div>
                      ) : (
                        <small>{profileTab === "favorites" ? "Favorites coming soon." : "Liked videos coming soon."}</small>
                      )}
                    </div>
                  )}
                </div>
              ) : null}

              {navPanel === "upload" ? (
                <div className="panel">
                  <div className="upload-source-switch" role="tablist" aria-label="Upload source">
                    <button
                      className={uploadSource === "url" ? "upload-source-tab upload-source-tab-active" : "upload-source-tab"}
                      onClick={() => {
                        setUploadSource("url");
                        setSelectedUploadFileName("");
                        setSelectedUploadPreview("");
                        setUploadUrl("");
                      }}
                    >
                      URL
                    </button>
                    <button
                      className={uploadSource === "file" ? "upload-source-tab upload-source-tab-active" : "upload-source-tab"}
                      onClick={() => {
                        setUploadSource("file");
                        setUploadUrl("");
                        setShelbyUploadStatus("unknown");
                      }}
                    >
                      Device (. )
                    </button>
                  </div>
                  {uploadSource === "url" ? (
                    <input
                      value={uploadUrl}
                      onChange={(event) => {
                        setUploadUrl(event.target.value);
                        setShelbyUploadStatus("unknown");
                      }}
                      placeholder="https://.../clip.mp4"
                    />
                  ) : (
                    <>
                      <label>
                        Video file
                        <input type="file" accept="video/*" onChange={onUploadFileChange} />
                      </label>
                      {selectedUploadFileName ? <small>Selected: {selectedUploadFileName}</small> : <small>Select video from local folder (. ).</small>}
                      {selectedUploadPreview ? (
                        <video className="upload-preview" src={selectedUploadPreview} controls muted playsInline preload="metadata" />
                      ) : null}
                    </>
                  )}
                  <input
                    value={uploadCaption}
                    onChange={(event) => setUploadCaption(event.target.value)}
                    placeholder="Caption"
                  />
                  <button onClick={() => void onUpload()} disabled={loading || !canInteract}>
                    Upload to Feed
                  </button>
                  {latestUploadedUrl ? (
                    <>
                      <small>Latest uploaded URL: {latestUploadedUrl}</small>
                      <small>
                        Shelby upload check:{" "}
                        {shelbyUploadStatus === "verified"
                          ? "Verified on Shelby host"
                          : shelbyUploadStatus === "not-verified"
                            ? "Not on Shelby host yet"
                            : "Waiting for upload verification"}
                      </small>
                      <a
                        className="secondary-button inline-link-button"
                        href={latestUploadedUrl}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Download latest upload
                      </a>
                    </>
                  ) : (
                    <small>{uploadSource === "url" ? "Public URL clips supported." : "Local file upload is encoded then submitted."}</small>
                  )}
                </div>
              ) : null}
              </div>
            </section>
          ) : null}
        </section>

        <aside className="right-sidebar" data-purpose="discovery-sidebar">
          <div className="panel">
            <h2>Comments</h2>
            {activeItem ? (
              <>
                <input
                  value={commentInput[activeItem.id] ?? ""}
                  onChange={(event) =>
                    setCommentInput((state) => ({
                      ...state,
                      [activeItem.id]: event.target.value
                    }))
                  }
                  placeholder="Write a comment"
                />
                <button onClick={() => void onComment(activeItem.id)} disabled={!canInteract}>
                  Post Comment
                </button>
                {!canInteract ? <small>Connect wallet to post comments.</small> : null}
              </>
            ) : (
              <small>Select a video to comment.</small>
            )}
          </div>

          <div className="panel">
            <h2>Trending Topics</h2>
            <ul className="topic-list">
              <li>#EthereumMerge</li>
              <li>#Web3Design</li>
              <li>#SixtySecondChallenge</li>
              <li>#NFTArt</li>
            </ul>
          </div>

          <div className="panel">
            <h2>Recommended</h2>
            {recommendedItems.length === 0 ? (
              <small>More recommendations appear once additional clips are available.</small>
            ) : (
              <ul className="recommended-list">
                {recommendedItems.map((item) => {
                  const index = visibleFeed.findIndex((feedItem) => feedItem.id === item.id);
                  return (
                    <li key={item.id}>
                      <button className="recommended-item" onClick={() => setActiveIndex(index)}>
                        <span>{item.ownerDisplayName}</span>
                        <small>{item.caption ?? "No caption"}</small>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {recentCommentActions.length > 0 ? (
            <div className="panel activity">
              <h2>Recent Comment Activity</h2>
              <ul>
                {recentCommentActions.map((action) => (
                  <li key={action.id}>
                    <span>{action.status.toUpperCase()}</span>
                    <small>{formatTime(action.createdAt)}</small>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>
      {donateModalVideoId && donateTarget ? (
        <section className="donate-modal-backdrop" role="dialog" aria-modal="true" aria-label="Donate APT">
          <div className="donate-modal">
            <h2>Donate APT</h2>
            <p>
              Send APT to <strong>@{donateTarget.ownerDisplayName}</strong> ({formatWalletAddress(donateTarget.ownerWalletAddress)})
            </p>
            <label>
              APT amount
              <input
                value={donateAmountInput}
                onChange={(event) => setDonateAmountInput(event.target.value)}
                placeholder="0.1"
                inputMode="decimal"
                disabled={donationInFlight}
              />
            </label>
            <small>Transfer executes on Aptos chain via your connected wallet.</small>
            {donateStatusMessage ? (
              <p className={donateStatus === "error" ? "donate-status donate-status-error" : "donate-status"}>{donateStatusMessage}</p>
            ) : null}
            <div className="donate-modal-actions">
              <button className="secondary-button" onClick={closeDonateModal} disabled={donationInFlight}>
                Cancel
              </button>
              <button onClick={() => void onConfirmDonate()} disabled={donationInFlight}>
                {donateStatus === "signing" || donateStatus === "submitting" ? "Processing..." : "Confirm Donation"}
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
