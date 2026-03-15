module airdrop::claim {
    use aptos_framework::timestamp;
    use aptos_std::table::{Self, Table};
    use std::signer;
    use std::vector;

    /// Brief plan:
    /// 1) Keep campaign + eligibility state in table-backed resources for scalable lookups.
    /// 2) Gate all mutating admin operations behind explicit admin signer checks.
    /// 3) Enforce claim window and one-time claim semantics on-chain.

    const E_ALREADY_INITIALIZED: u64 = 1;
    const E_NOT_INITIALIZED: u64 = 2;
    const E_NOT_ADMIN: u64 = 3;
    const E_CAMPAIGN_ALREADY_EXISTS: u64 = 4;
    const E_CAMPAIGN_NOT_FOUND: u64 = 5;
    const E_INVALID_CAMPAIGN_WINDOW: u64 = 6;
    const E_INVALID_AMOUNT: u64 = 7;
    const E_NOT_ELIGIBLE: u64 = 8;
    const E_ALREADY_CLAIMED: u64 = 9;
    const E_CLAIM_WINDOW_CLOSED: u64 = 10;
    const E_CAMPAIGN_EXHAUSTED: u64 = 11;
    const E_BATCH_LENGTH_MISMATCH: u64 = 12;
    const E_BATCH_TOO_LARGE: u64 = 13;
    const E_INVALID_PUBLISHER: u64 = 14;

    const MAX_BATCH_SIZE: u64 = 1000;

    struct AdminConfig has key {
        admin: address,
    }

    struct Campaign has copy, drop, store {
        id: u64,
        metadata_uri: vector<u8>,
        total_amount: u64,
        claimed_amount: u64,
        starts_at_secs: u64,
        ends_at_secs: u64,
        enabled: bool,
    }

    struct CampaignStore has key {
        campaigns: Table<u64, Campaign>,
    }

    struct EligibilityKey has copy, drop, store {
        campaign_id: u64,
        account: address,
    }

    struct EligibilityRecord has copy, drop, store {
        amount: u64,
        claimed: bool,
    }

    struct EligibilityStore has key {
        records: Table<EligibilityKey, EligibilityRecord>,
    }

    /// Initializes the claim registry at the module address and sets the first admin.
    ///
    /// Security:
    /// - Must be called by the package publisher (`@airdrop`).
    /// - Can only run once.
    public entry fun initialize(publisher: &signer, admin: address) {
        assert!(signer::address_of(publisher) == @airdrop, E_INVALID_PUBLISHER);
        assert!(!exists<AdminConfig>(@airdrop), E_ALREADY_INITIALIZED);

        move_to(publisher, AdminConfig { admin });
        move_to(
            publisher,
            CampaignStore {
                campaigns: table::new<u64, Campaign>(),
            },
        );
        move_to(
            publisher,
            EligibilityStore {
                records: table::new<EligibilityKey, EligibilityRecord>(),
            },
        );
    }

    /// Updates the module admin.
    ///
    /// Security:
    /// - Current admin signer is required.
    public entry fun set_admin(admin_signer: &signer, new_admin: address) acquires AdminConfig {
        assert_initialized();
        assert_admin(admin_signer);

        let cfg = borrow_global_mut<AdminConfig>(@airdrop);
        cfg.admin = new_admin;
    }

    /// Creates a new campaign ID with a fixed claim window and total pool amount.
    ///
    /// Security:
    /// - Admin signer is required.
    /// - Input values are validated for amount and time window consistency.
    public entry fun create_campaign(
        admin_signer: &signer,
        campaign_id: u64,
        metadata_uri: vector<u8>,
        total_amount: u64,
        starts_at_secs: u64,
        ends_at_secs: u64,
    ) acquires AdminConfig, CampaignStore {
        assert_initialized();
        assert_admin(admin_signer);
        assert!(total_amount > 0, E_INVALID_AMOUNT);
        assert!(starts_at_secs <= ends_at_secs, E_INVALID_CAMPAIGN_WINDOW);

        let store = borrow_global_mut<CampaignStore>(@airdrop);
        assert!(
            !table::contains(&store.campaigns, campaign_id),
            E_CAMPAIGN_ALREADY_EXISTS,
        );

        table::add(
            &mut store.campaigns,
            campaign_id,
            Campaign {
                id: campaign_id,
                metadata_uri,
                total_amount,
                claimed_amount: 0,
                starts_at_secs,
                ends_at_secs,
                enabled: true,
            },
        );
    }

    /// Enables or disables an existing campaign.
    ///
    /// Security:
    /// - Admin signer is required.
    public entry fun set_campaign_enabled(
        admin_signer: &signer,
        campaign_id: u64,
        enabled: bool,
    ) acquires AdminConfig, CampaignStore {
        assert_initialized();
        assert_admin(admin_signer);

        let store = borrow_global_mut<CampaignStore>(@airdrop);
        assert!(table::contains(&store.campaigns, campaign_id), E_CAMPAIGN_NOT_FOUND);
        let campaign = table::borrow_mut(&mut store.campaigns, campaign_id);
        campaign.enabled = enabled;
    }

    /// Upserts a single eligibility amount for a user.
    ///
    /// Security:
    /// - Admin signer is required.
    /// - Amount must be non-zero.
    /// - Existing claimed records cannot be overwritten.
    public entry fun upsert_eligibility(
        admin_signer: &signer,
        campaign_id: u64,
        account: address,
        amount: u64,
    ) acquires AdminConfig, CampaignStore, EligibilityStore {
        assert_initialized();
        assert_admin(admin_signer);
        assert!(amount > 0, E_INVALID_AMOUNT);

        let campaign_store = borrow_global<CampaignStore>(@airdrop);
        assert!(
            table::contains(&campaign_store.campaigns, campaign_id),
            E_CAMPAIGN_NOT_FOUND,
        );

        let store = borrow_global_mut<EligibilityStore>(@airdrop);
        let key = EligibilityKey {
            campaign_id,
            account,
        };

        if (table::contains(&store.records, key)) {
            let existing = table::borrow_mut(
                &mut store.records,
                EligibilityKey {
                    campaign_id,
                    account,
                },
            );
            assert!(!existing.claimed, E_ALREADY_CLAIMED);
            existing.amount = amount;
        } else {
            table::add(
                &mut store.records,
                key,
                EligibilityRecord {
                    amount,
                    claimed: false,
                },
            );
        }
    }

    /// Upserts batched eligibility rows.
    ///
    /// Security:
    /// - Admin signer is required.
    /// - Batch is bounded to prevent resource exhaustion.
    /// - Vector lengths must match.
    public entry fun batch_upsert_eligibility(
        admin_signer: &signer,
        campaign_id: u64,
        accounts: vector<address>,
        amounts: vector<u64>,
    ) acquires AdminConfig, CampaignStore, EligibilityStore {
        assert_initialized();
        assert_admin(admin_signer);

        let count = vector::length(&accounts);
        assert!(count == vector::length(&amounts), E_BATCH_LENGTH_MISMATCH);
        assert!(count <= MAX_BATCH_SIZE, E_BATCH_TOO_LARGE);

        let i = 0;
        while (i < count) {
            let account = *vector::borrow(&accounts, i);
            let amount = *vector::borrow(&amounts, i);
            upsert_eligibility(admin_signer, campaign_id, account, amount);
            i = i + 1;
        };
    }

    /// Claims an allocation for the signer in a given campaign.
    ///
    /// Security:
    /// - Uses on-chain timestamp for window validation.
    /// - Enforces one-time claim per (campaign, account).
    /// - Prevents over-allocation beyond campaign cap.
    public entry fun claim(user: &signer, campaign_id: u64) acquires CampaignStore, EligibilityStore {
        assert_initialized();

        let claimant = signer::address_of(user);
        let now_secs = timestamp::now_seconds();

        let campaign_store = borrow_global_mut<CampaignStore>(@airdrop);
        assert!(
            table::contains(&campaign_store.campaigns, campaign_id),
            E_CAMPAIGN_NOT_FOUND,
        );
        let campaign = table::borrow_mut(&mut campaign_store.campaigns, campaign_id);
        assert!(campaign.enabled, E_CLAIM_WINDOW_CLOSED);
        assert!(
            now_secs >= campaign.starts_at_secs && now_secs <= campaign.ends_at_secs,
            E_CLAIM_WINDOW_CLOSED,
        );

        let store = borrow_global_mut<EligibilityStore>(@airdrop);
        let key = EligibilityKey {
            campaign_id,
            account: claimant,
        };
        assert!(table::contains(&store.records, key), E_NOT_ELIGIBLE);

        let record = table::borrow_mut(&mut store.records, key);
        assert!(!record.claimed, E_ALREADY_CLAIMED);
        assert!(
            record.amount <= campaign.total_amount - campaign.claimed_amount,
            E_CAMPAIGN_EXHAUSTED,
        );

        campaign.claimed_amount = campaign.claimed_amount + record.amount;
        record.claimed = true;
    }

    /// Returns campaign details for indexers/UI.
    public fun get_campaign(campaign_id: u64): Campaign acquires CampaignStore {
        assert_initialized();
        let store = borrow_global<CampaignStore>(@airdrop);
        assert!(table::contains(&store.campaigns, campaign_id), E_CAMPAIGN_NOT_FOUND);
        *table::borrow(&store.campaigns, campaign_id)
    }

    /// Returns claim status and amount for a (campaign, account) tuple.
    public fun get_eligibility(campaign_id: u64, account: address): EligibilityRecord acquires EligibilityStore {
        assert_initialized();
        let store = borrow_global<EligibilityStore>(@airdrop);
        let key = EligibilityKey {
            campaign_id,
            account,
        };
        assert!(table::contains(&store.records, key), E_NOT_ELIGIBLE);
        *table::borrow(&store.records, key)
    }

    /// Returns true when an account already claimed in the campaign.
    public fun is_claimed(campaign_id: u64, account: address): bool acquires EligibilityStore {
        assert_initialized();
        let store = borrow_global<EligibilityStore>(@airdrop);
        let key = EligibilityKey {
            campaign_id,
            account,
        };
        if (!table::contains(&store.records, key)) {
            return false
        };
        let record = table::borrow(
            &store.records,
            EligibilityKey {
                campaign_id,
                account,
            },
        );
        record.claimed
    }

    /// Returns claimed campaign amount.
    public fun campaign_claimed_amount(campaign_id: u64): u64 acquires CampaignStore {
        assert_initialized();
        let store = borrow_global<CampaignStore>(@airdrop);
        assert!(table::contains(&store.campaigns, campaign_id), E_CAMPAIGN_NOT_FOUND);
        let campaign = table::borrow(&store.campaigns, campaign_id);
        campaign.claimed_amount
    }

    /// Returns whether campaign is enabled.
    public fun campaign_enabled(campaign_id: u64): bool acquires CampaignStore {
        assert_initialized();
        let store = borrow_global<CampaignStore>(@airdrop);
        assert!(table::contains(&store.campaigns, campaign_id), E_CAMPAIGN_NOT_FOUND);
        let campaign = table::borrow(&store.campaigns, campaign_id);
        campaign.enabled
    }

    /// Returns configured admin address.
    public fun admin_address(): address acquires AdminConfig {
        assert_initialized();
        let cfg = borrow_global<AdminConfig>(@airdrop);
        cfg.admin
    }

    fun assert_initialized() {
        assert!(exists<AdminConfig>(@airdrop), E_NOT_INITIALIZED);
    }

    fun assert_admin(admin_signer: &signer) acquires AdminConfig {
        let cfg = borrow_global<AdminConfig>(@airdrop);
        assert!(signer::address_of(admin_signer) == cfg.admin, E_NOT_ADMIN);
    }
}
