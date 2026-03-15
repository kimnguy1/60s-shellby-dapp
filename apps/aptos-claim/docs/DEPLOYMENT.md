# Aptos Claim Module Deployment (Testnet)

## Security note

Current module enforces claim accounting on-chain but does **not** transfer fungible assets yet.
Integrate treasury/Fungible Asset transfer flow before production token distribution.

## 1) Configure named address

Use deployer address as `airdrop` named address:

```bash
aptos config set-default-profile --profile testnet
aptos account list --profile testnet
```

## 2) Compile and test

```bash
cd apps/aptos-claim
aptos move compile --named-addresses airdrop=<DEPLOYER_ADDRESS>
aptos move test --named-addresses airdrop=<DEPLOYER_ADDRESS>
```

## 3) Publish to testnet

```bash
aptos move publish \
  --profile testnet \
  --named-addresses airdrop=<DEPLOYER_ADDRESS> \
  --assume-yes
```

## 4) Initialize module storage

```bash
aptos move run \
  --profile testnet \
  --function-id <DEPLOYER_ADDRESS>::claim::initialize \
  --args address:<ADMIN_ADDRESS>
```

## 5) Record deployment metadata

Fill this section after deployment:

- Network: `aptos-testnet`
- Module address: `<DEPLOYER_ADDRESS>`
- Package hash: `<TXN_HASH_OR_PACKAGE_HASH>`
- Initialize txn: `<TXN_HASH>`

## 6) Seed first campaign

```bash
npm install
cp .env.example .env
npm run seed
```
