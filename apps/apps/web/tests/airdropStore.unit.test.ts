import { afterEach, describe, expect, test } from "bun:test";
import { useAirdropStore } from "../src/store/airdropStore";

afterEach(() => {
  useAirdropStore.setState({
    walletAddress: "",
    displayName: "",
    walletState: "disconnected",
    profile: null,
    feed: [],
    queue: [],
    error: null
  });
});

describe("useAirdropStore", () => {
  test("starts disconnected with empty identity", () => {
    const state = useAirdropStore.getState();

    expect(state.walletState).toBe("disconnected");
    expect(state.walletAddress).toBe("");
    expect(state.displayName).toBe("");
  });

  test("setWalletConnected marks wallet as connected and clears error", () => {
    useAirdropStore.getState().setError("old");
    useAirdropStore.getState().setWalletConnected("0x1234");

    const state = useAirdropStore.getState();
    expect(state.walletState).toBe("connected");
    expect(state.walletAddress).toBe("0x1234");
    expect(state.error).toBeNull();
  });

  test("setWalletDisconnected clears wallet identity and profile", () => {
    useAirdropStore.setState({
      walletAddress: "0x1234",
      walletState: "connected",
      profile: {
        walletAddress: "0x1234",
        displayName: "qa",
        balances: { apt: "1", shelbyUsd: "2", shelbyToken: "3" },
        uploadedVideos: 1
      },
      error: "old"
    });

    useAirdropStore.getState().setWalletDisconnected();
    const state = useAirdropStore.getState();

    expect(state.walletState).toBe("disconnected");
    expect(state.walletAddress).toBe("");
    expect(state.profile).toBeNull();
    expect(state.error).toBeNull();
  });

  test("prependFeedItem and bumpFeedMetric update metrics for target video", () => {
    useAirdropStore.getState().prependFeedItem({
      id: "v1",
      ownerWalletAddress: "0x1234",
      ownerDisplayName: "qa",
      caption: null,
      videoUrl: "https://example.com/a.mp4",
      createdAt: 1,
      likes: 0,
      comments: 0,
      donations: 0,
      downloads: 0
    });

    useAirdropStore.getState().bumpFeedMetric("v1", "like");
    useAirdropStore.getState().bumpFeedMetric("v1", "comment");
    useAirdropStore.getState().bumpFeedMetric("v1", "donate", 5);
    useAirdropStore.getState().bumpFeedMetric("v1", "download");

    const item = useAirdropStore.getState().feed[0];
    expect(item).toMatchObject({ likes: 1, comments: 1, donations: 5, downloads: 1 });
  });

  test("queue lifecycle: enqueueAction -> resolveAction -> failAction", () => {
    const actionId = useAirdropStore.getState().enqueueAction("v1", "like");
    useAirdropStore.getState().resolveAction(actionId);
    useAirdropStore.getState().failAction(actionId, "network");

    const action = useAirdropStore.getState().queue.find((entry) => entry.id === actionId);
    expect(action).toMatchObject({ status: "failed", error: "network" });
  });

  test("edge case: queue size is capped to 20 newest actions", () => {
    for (let i = 0; i < 25; i += 1) {
      useAirdropStore.getState().enqueueAction(`v${i}`, "like");
    }

    const state = useAirdropStore.getState();
    expect(state.queue.length).toBe(20);
  });

  test("edge case: bumpFeedMetric is a no-op when video id does not exist", () => {
    useAirdropStore.getState().prependFeedItem({
      id: "v1",
      ownerWalletAddress: "0x1234",
      ownerDisplayName: "qa",
      caption: null,
      videoUrl: "https://example.com/a.mp4",
      createdAt: 1,
      likes: 2,
      comments: 3,
      donations: 4,
      downloads: 5
    });

    useAirdropStore.getState().bumpFeedMetric("missing-id", "like");

    expect(useAirdropStore.getState().feed[0]).toMatchObject({
      id: "v1",
      likes: 2,
      comments: 3,
      donations: 4,
      downloads: 5
    });
  });
});
