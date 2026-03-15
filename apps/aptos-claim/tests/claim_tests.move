module airdrop::claim_tests {
    use airdrop::claim;
    use std::signer;

    const CAMPAIGN_ID: u64 = 1;

    #[test(airdrop = @0xA11CE, admin = @0xB0B, user = @0xC0DE)]
    fun claim_happy_path(airdrop: &signer, admin: &signer, user: &signer) {
        claim::initialize(airdrop, signer::address_of(admin));
        claim::create_campaign(
            admin,
            CAMPAIGN_ID,
            b"ipfs://campaign-1",
            1_000,
            0,
            18_446_744_073_709_551_615,
        );
        claim::upsert_eligibility(admin, CAMPAIGN_ID, signer::address_of(user), 250);

        claim::claim(user, CAMPAIGN_ID);

        assert!(claim::is_claimed(CAMPAIGN_ID, signer::address_of(user)), 100);
        assert!(claim::campaign_claimed_amount(CAMPAIGN_ID) == 250, 101);
    }

    #[test(airdrop = @0xA11CE, admin = @0xB0B, user = @0xC0DE)]
    #[expected_failure]
    fun double_claim_rejected(airdrop: &signer, admin: &signer, user: &signer) {
        claim::initialize(airdrop, signer::address_of(admin));
        claim::create_campaign(
            admin,
            CAMPAIGN_ID,
            b"ipfs://campaign-2",
            1_000,
            0,
            18_446_744_073_709_551_615,
        );
        claim::upsert_eligibility(admin, CAMPAIGN_ID, signer::address_of(user), 100);

        claim::claim(user, CAMPAIGN_ID);
        claim::claim(user, CAMPAIGN_ID);
    }

    #[test(airdrop = @0xA11CE, admin = @0xB0B, attacker = @0xBAD)]
    #[expected_failure]
    fun non_admin_cannot_create_campaign(airdrop: &signer, admin: &signer, attacker: &signer) {
        claim::initialize(airdrop, signer::address_of(admin));
        claim::create_campaign(
            attacker,
            CAMPAIGN_ID,
            b"ipfs://campaign-3",
            1_000,
            0,
            18_446_744_073_709_551_615,
        );
    }

    #[test(airdrop = @0xA11CE, admin = @0xB0B, user = @0xC0DE)]
    #[expected_failure]
    fun batch_length_mismatch_fails(airdrop: &signer, admin: &signer, user: &signer) {
        claim::initialize(airdrop, signer::address_of(admin));
        claim::create_campaign(
            admin,
            CAMPAIGN_ID,
            b"ipfs://campaign-4",
            1_000,
            0,
            18_446_744_073_709_551_615,
        );

        claim::batch_upsert_eligibility(
            admin,
            CAMPAIGN_ID,
            vector[signer::address_of(user)],
            vector[100, 200],
        );
    }
}
