type SyntheticCreatorFixture = {
  walletAddress: string;
  displayName: string;
  avatar: {
    style: "pixel" | "gradient" | "symbol";
    seed: string;
  };
};

type SyntheticVideoFixture = {
  id: string;
  ownerWalletAddress: string;
  caption: string;
  tags: string[];
  videoUrl: string;
  createdAt: number;
  engagement: {
    likes: number;
    comments: number;
    donations: number;
    downloads: number;
  };
};

type FixtureCheckResult = {
  name: string;
  pass: boolean;
  detail: string;
};

type SyntheticInteractionFixture = {
  videoId: string;
  walletAddress: string;
  type: "like" | "comment" | "donate" | "download";
  comment: string | null;
  amount: number | null;
  createdAt: number;
};

const VIDEO_URLS = [
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4"
] as const;

const BASE_CREATED_AT = 1_735_000_000_000;
const VIDEOS_PER_CREATOR = 4;
const DONATION_AMOUNTS = [2, 4, 7, 11] as const;
const COMMENT_LINES = [
  "smooth loop, keeping this in watchlist",
  "nice pacing and clean transition",
  "this one looks ready for spotlight",
  "great context for explorer tab demo",
  "following feed feels alive with this"
] as const;

const creatorPresets = [
  { handle: "atlas", name: "Atlas Shelby", style: "pixel" },
  { handle: "nova", name: "Nova Ledger", style: "gradient" },
  { handle: "drift", name: "Drift Kaito", style: "symbol" },
  { handle: "lumen", name: "Lumen Ana", style: "gradient" },
  { handle: "echo", name: "Echo Rin", style: "pixel" },
  { handle: "prism", name: "Prism Vee", style: "symbol" },
  { handle: "mira", name: "Mira Sol", style: "gradient" },
  { handle: "zen", name: "Zen Cor", style: "pixel" },
  { handle: "flux", name: "Flux Ari", style: "symbol" },
  { handle: "orbit", name: "Orbit Kai", style: "gradient" },
  { handle: "pulse", name: "Pulse Neo", style: "pixel" },
  { handle: "terra", name: "Terra Nix", style: "symbol" },
  { handle: "quill", name: "Quill Rae", style: "gradient" },
  { handle: "sage", name: "Sage Bloom", style: "pixel" },
  { handle: "vanta", name: "Vanta T", style: "symbol" }
] as const;

const captionTemplates = [
  "Daily builder sprint",
  "Explorer trend snapshot",
  "Following-only drop teaser",
  "Wallet quest recap",
  "Creator collab preview",
  "Midnight alpha notes",
  "Testnet to mainnet journey",
  "Airdrop diary segment"
] as const;

const tagPool = [
  "airdrop",
  "shelby",
  "explorer",
  "following",
  "defi",
  "community",
  "quest",
  "buildinpublic",
  "testnet",
  "onchain"
] as const;

function hexPad(value: number, size: number): string {
  return value.toString(16).padStart(size, "0");
}

function walletForIndex(index: number): string {
  return `0x${hexPad(index + 1, 64)}`;
}

export const SYNTHETIC_FIXTURE_SEED = "cas-demo-pack-v1";

export const syntheticCreators: SyntheticCreatorFixture[] = creatorPresets.map((preset, index) => ({
  walletAddress: walletForIndex(index),
  displayName: preset.name,
  avatar: {
    style: preset.style,
    seed: `${SYNTHETIC_FIXTURE_SEED}-${preset.handle}`
  }
}));

export const syntheticFollowGraphHints: Record<string, string[]> = syntheticCreators.reduce<Record<string, string[]>>(
  (acc, creator, index) => {
    const neighborA = syntheticCreators[(index + 1) % syntheticCreators.length]!;
    const neighborB = syntheticCreators[(index + 3) % syntheticCreators.length]!;
    const neighborC = syntheticCreators[(index + 6) % syntheticCreators.length]!;
    acc[creator.walletAddress] = [neighborA.walletAddress, neighborB.walletAddress, neighborC.walletAddress];
    return acc;
  },
  {}
);

export const syntheticVideos: SyntheticVideoFixture[] = syntheticCreators.flatMap((creator, creatorIndex) =>
  Array.from({ length: VIDEOS_PER_CREATOR }, (_, localIndex) => {
    const videoIndex = creatorIndex * VIDEOS_PER_CREATOR + localIndex;
    const firstTag = tagPool[(videoIndex + creatorIndex) % tagPool.length]!;
    const secondTag = tagPool[(videoIndex + localIndex + 2) % tagPool.length]!;
    const tags = [firstTag, secondTag];
    const captionPrefix = captionTemplates[(videoIndex + localIndex) % captionTemplates.length]!;
    return {
      id: `demo-video-${String(videoIndex + 1).padStart(3, "0")}`,
      ownerWalletAddress: creator.walletAddress,
      caption: `${captionPrefix} #${tags[0]} #${tags[1]}`,
      tags,
      videoUrl: VIDEO_URLS[videoIndex % VIDEO_URLS.length]!,
      createdAt: BASE_CREATED_AT + videoIndex * 60_000,
      engagement: {
        likes: 2 + (videoIndex % 5),
        comments: 1 + (videoIndex % 3),
        donations: videoIndex % 3,
        downloads: 3 + (videoIndex % 6)
      }
    };
  })
);

export function buildSyntheticInteractions(): SyntheticInteractionFixture[] {
  const rows: SyntheticInteractionFixture[] = [];

  for (let videoIndex = 0; videoIndex < syntheticVideos.length; videoIndex += 1) {
    const video = syntheticVideos[videoIndex]!;
    const participants = syntheticCreators
      .filter((creator) => creator.walletAddress !== video.ownerWalletAddress)
      .map((creator) => creator.walletAddress);

    for (let likeIndex = 0; likeIndex < video.engagement.likes; likeIndex += 1) {
      rows.push({
        videoId: video.id,
        walletAddress: participants[(videoIndex + likeIndex) % participants.length]!,
        type: "like",
        comment: null,
        amount: null,
        createdAt: video.createdAt + 5_000 + likeIndex
      });
    }

    for (let commentIndex = 0; commentIndex < video.engagement.comments; commentIndex += 1) {
      rows.push({
        videoId: video.id,
        walletAddress: participants[(videoIndex + commentIndex + 3) % participants.length]!,
        type: "comment",
        comment: COMMENT_LINES[(videoIndex + commentIndex) % COMMENT_LINES.length]!,
        amount: null,
        createdAt: video.createdAt + 10_000 + commentIndex
      });
    }

    for (let donationIndex = 0; donationIndex < video.engagement.donations; donationIndex += 1) {
      rows.push({
        videoId: video.id,
        walletAddress: participants[(videoIndex + donationIndex + 5) % participants.length]!,
        type: "donate",
        comment: null,
        amount: DONATION_AMOUNTS[(videoIndex + donationIndex) % DONATION_AMOUNTS.length]!,
        createdAt: video.createdAt + 15_000 + donationIndex
      });
    }

    for (let downloadIndex = 0; downloadIndex < video.engagement.downloads; downloadIndex += 1) {
      rows.push({
        videoId: video.id,
        walletAddress: participants[(videoIndex + downloadIndex + 7) % participants.length]!,
        type: "download",
        comment: null,
        amount: null,
        createdAt: video.createdAt + 20_000 + downloadIndex
      });
    }
  }

  return rows;
}

export function runSyntheticFixtureChecks(): {
  pass: boolean;
  checks: FixtureCheckResult[];
} {
  const creatorWalletSet = new Set(syntheticCreators.map((creator) => creator.walletAddress));
  const videoIdSet = new Set(syntheticVideos.map((video) => video.id));
  const followEdgeViolations: string[] = [];

  for (const [walletAddress, follows] of Object.entries(syntheticFollowGraphHints)) {
    for (const target of follows) {
      if (!creatorWalletSet.has(walletAddress) || !creatorWalletSet.has(target) || walletAddress === target) {
        followEdgeViolations.push(`${walletAddress}->${target}`);
      }
    }
  }

  const checks: FixtureCheckResult[] = [
    {
      name: "creator-count",
      pass: syntheticCreators.length >= 15,
      detail: `${syntheticCreators.length} creators`
    },
    {
      name: "video-count",
      pass: syntheticVideos.length >= 60,
      detail: `${syntheticVideos.length} videos`
    },
    {
      name: "creator-wallet-unique",
      pass: creatorWalletSet.size === syntheticCreators.length,
      detail: `unique ${creatorWalletSet.size}/${syntheticCreators.length}`
    },
    {
      name: "video-id-unique",
      pass: videoIdSet.size === syntheticVideos.length,
      detail: `unique ${videoIdSet.size}/${syntheticVideos.length}`
    },
    {
      name: "video-owner-valid",
      pass: syntheticVideos.every((video) => creatorWalletSet.has(video.ownerWalletAddress)),
      detail: "all videos map to known creator wallets"
    },
    {
      name: "required-fields-complete",
      pass: syntheticVideos.every((video) => Boolean(video.id && video.caption && video.videoUrl)),
      detail: "id/caption/videoUrl present"
    },
    {
      name: "follow-graph-valid",
      pass: followEdgeViolations.length === 0,
      detail: followEdgeViolations.length === 0 ? "all follow hints valid" : followEdgeViolations.join(", ")
    }
  ];

  return {
    pass: checks.every((check) => check.pass),
    checks
  };
}
