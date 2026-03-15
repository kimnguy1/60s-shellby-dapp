# Aptos Mock Spec for 60s MVP

## 1. Scope

This document defines the mock blockchain/token boundary used by the `60s` MVP until real Aptos on-chain contracts are introduced.

Phase 1 is mock-only and deterministic for local integration.

Security warning: no mainnet deployment, no private key material, and no claim that this is a production settlement engine.

## 2. Domain Model

### Wallet + Profile

- One Aptos wallet address maps to one profile.
- `displayName` is deterministic: `user_<address[2..8]>`.
- Address format validated as lowercase hex: `0x[a-f0-9]{4,64}`.

### Token Balances

- Supported tokens: `APT`, `SHELBY_USD`, `S`.
- Initial balances are deterministic from address hash.
- Balances are tracked in-memory in the API process.

### Donate Settlement Queue (Mock)

- Donate is `S`-denominated only.
- Sender balance is debited immediately.
- Settlement starts as `pending` and auto-transitions to `confirmed` after a fixed delay.
- Receiver is credited only when status becomes `confirmed`.
- Idempotency key is mandatory and deduplicated per sender wallet.

## 3. API Contract

Base path: `/api/mock/aptos`

### `GET /wallets/:walletAddress/profile`

Returns profile + balances.

Example response:

```json
{
  "walletAddress": "0xabc123",
  "displayName": "user_abc123",
  "balances": {
    "APT": 14.7,
    "SHELBY_USD": 293.2,
    "S": 61.5
  }
}
```

### `GET /wallets/:walletAddress/balances`

Returns balances only.

### `POST /s/buy/quote`

Request:

```json
{
  "payToken": "APT",
  "payAmount": 2.5
}
```

Response:

```json
{
  "payToken": "APT",
  "payAmount": 2.5,
  "rate": 12.5,
  "feeBps": 50,
  "grossS": 31.25,
  "feeS": 0.1563,
  "netS": 31.0937
}
```

### `POST /s/buy/execute`

Request:

```json
{
  "walletAddress": "0xabc123",
  "payToken": "SHELBY_USD",
  "payAmount": 15
}
```

Response:

```json
{
  "txHash": "0xbuy_00000001",
  "status": "confirmed",
  "quote": {
    "payToken": "SHELBY_USD",
    "payAmount": 15,
    "rate": 1,
    "feeBps": 50,
    "grossS": 15,
    "feeS": 0.075,
    "netS": 14.925
  },
  "balances": {
    "APT": 14.7,
    "SHELBY_USD": 278.2,
    "S": 76.425
  }
}
```

### `POST /s/donate`

Request:

```json
{
  "fromWallet": "0xabc123",
  "toWallet": "0xdef456",
  "amountS": 3,
  "idempotencyKey": "donate-20260314-001"
}
```

Response (initial):

```json
{
  "settlementId": "set_00000002",
  "fromWallet": "0xabc123",
  "toWallet": "0xdef456",
  "amountS": 3,
  "idempotencyKey": "donate-20260314-001",
  "status": "pending",
  "createdAt": 1760000000000,
  "updatedAt": 1760000000000
}
```

Idempotency behavior:
- Same `fromWallet + idempotencyKey` returns the same settlement record.
- No duplicate debit occurs.

### `GET /s/donate/:settlementId`

Returns current settlement state. After confirmation delay, status becomes `confirmed`.

## 4. Deterministic Rules

- Wallet bootstrap balances derive from stable hash of address.
- Exchange rates are constant in phase 1:
  - `APT -> S` rate: `12.5`
  - `SHELBY_USD -> S` rate: `1.0`
- Buy fee: `50 bps`.
- Donation confirmation delay: `1200 ms`.
- IDs are generated from process-local deterministic sequence (not cryptographic hashes).

## 5. Security and Non-Goals

- Input validation is enforced at route boundary.
- No signer/private-key operations in this mock layer.
- Not a source of truth for real custody or settlement.
- Reentrancy is not applicable here (single-threaded in-memory service), but phase-2 contracts must still implement strict checks.

## 6. Phase 2 Migration Tasks (Mock -> Real On-chain)

1. Move module: fungible `S` token resource and mint/burn policy.
2. Move module: donate settlement event model and finalization logic.
3. Aptos TS SDK service: submit entry-function payloads via wallet signer.
4. Indexer/event ingestion service replacing in-memory settlement polling.
5. Balance reads from on-chain resources or indexer tables instead of mock hash-seeded state.
6. Idempotency persistence in database + on-chain transaction mapping.
