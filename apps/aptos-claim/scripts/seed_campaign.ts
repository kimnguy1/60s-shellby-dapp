import {
  Account,
  Aptos,
  AptosConfig,
  Ed25519PrivateKey,
  type InputEntryFunctionData,
  Network,
} from "@aptos-labs/ts-sdk";

function env(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function parseCsvAddresses(raw: string): string[] {
  return raw
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function parseCsvU64(raw: string): bigint[] {
  return raw
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => BigInt(x));
}

async function main() {
  const network = (process.env.APTOS_NETWORK as Network) || Network.TESTNET;
  const config = new AptosConfig({ network });
  const aptos = new Aptos(config);

  const admin = Account.fromPrivateKey({
    privateKey: new Ed25519PrivateKey(env("ADMIN_PRIVATE_KEY")),
    legacy: false,
  });

  const moduleAddress = env("MODULE_ADDRESS");
  const campaignId = BigInt(env("CAMPAIGN_ID"));
  const metadataUri = env("METADATA_URI");
  const totalAmount = BigInt(env("TOTAL_AMOUNT"));
  const startsAt = BigInt(env("STARTS_AT_SECS"));
  const endsAt = BigInt(env("ENDS_AT_SECS"));

  const eligibleAccounts = parseCsvAddresses(env("ELIGIBLE_ADDRESSES"));
  const eligibleAmounts = parseCsvU64(env("ELIGIBLE_AMOUNTS"));

  if (eligibleAccounts.length !== eligibleAmounts.length) {
    throw new Error("ELIGIBLE_ADDRESSES and ELIGIBLE_AMOUNTS length mismatch");
  }

  if (eligibleAccounts.length > 1000) {
    throw new Error("Batch too large. Max 1000 addresses per transaction.");
  }

  const createPayload: InputEntryFunctionData = {
    function: `${moduleAddress}::claim::create_campaign`,
    typeArguments: [],
    functionArguments: [
      campaignId,
      new TextEncoder().encode(metadataUri),
      totalAmount,
      startsAt,
      endsAt,
    ],
  };

  const createTxn = await aptos.transaction.build.simple({
    sender: admin.accountAddress,
    data: createPayload,
  });
  const createCommitted = await aptos.signAndSubmitTransaction({
    signer: admin,
    transaction: createTxn,
  });
  await aptos.waitForTransaction({ transactionHash: createCommitted.hash });

  const batchPayload: InputEntryFunctionData = {
    function: `${moduleAddress}::claim::batch_upsert_eligibility`,
    typeArguments: [],
    functionArguments: [
      campaignId,
      eligibleAccounts,
      eligibleAmounts,
    ],
  };

  const batchTxn = await aptos.transaction.build.simple({
    sender: admin.accountAddress,
    data: batchPayload,
  });
  const batchCommitted = await aptos.signAndSubmitTransaction({
    signer: admin,
    transaction: batchTxn,
  });
  await aptos.waitForTransaction({ transactionHash: batchCommitted.hash });

  console.log("Seed completed", {
    createTx: createCommitted.hash,
    seedTx: batchCommitted.hash,
    campaignId: campaignId.toString(),
    entries: eligibleAccounts.length,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
