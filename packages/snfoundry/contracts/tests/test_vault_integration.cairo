use contracts::MockWBTC::{IMockWBTCDispatcher, IMockWBTCDispatcherTrait};
use contracts::VoltaVault::{IVoltaVaultDispatcher, IVoltaVaultDispatcherTrait};
use contracts::vUSD::{IvUSDDispatcher, IvUSDDispatcherTrait};
use openzeppelin_token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
use snforge_std::{
    ContractClassTrait, DeclareResultTrait, declare, start_cheat_caller_address,
    stop_cheat_caller_address,
};
#[feature("deprecated-starknet-consts")]
use starknet::{ContractAddress, contract_address_const};

// Test constants
const OWNER: felt252 = 0x12345;
const USER: felt252 = 0x67890;
const BTC_PRICE: felt252 = 67891000; // $67,891.000 with 3 decimals
const WBTC_AMOUNT: u256 = 100000000; // 1 WBTC (8 decimals)

// Helper function to deploy full system for integration tests
fn deploy_integration_test_system() -> (
    ContractAddress, ContractAddress, ContractAddress, ContractAddress,
) {
    let owner_address = contract_address_const::<OWNER>();

    // Deploy MockOracle
    let oracle_class = declare("MockOracle").unwrap().contract_class();
    let (oracle_address, _) = oracle_class.deploy(@array![BTC_PRICE]).unwrap();

    // Deploy MockWBTC
    let wbtc_class = declare("MockWBTC").unwrap().contract_class();
    let (wbtc_address, _) = wbtc_class.deploy(@array![]).unwrap();

    // Deploy VoltaVault first (it will be the minter)
    let vault_class = declare("VoltaVault").unwrap().contract_class();

    // Deploy vUSD with vault as minter (we'll set this after vault deployment)
    let vusd_class = declare("vUSD").unwrap().contract_class();
    let (vusd_address, _) = vusd_class
        .deploy(@array![owner_address.into(), owner_address.into()])
        .unwrap();

    // Deploy VoltaVault with all dependencies
    let (vault_address, _) = vault_class
        .deploy(
            @array![
                owner_address.into(),
                vusd_address.into(),
                wbtc_address.into(),
                oracle_address.into(),
            ],
        )
        .unwrap();

    // Set vault as minter for vUSD
    let vusd = IvUSDDispatcher { contract_address: vusd_address };
    start_cheat_caller_address(vusd_address, owner_address);
    vusd.set_minter(vault_address);
    stop_cheat_caller_address(vusd_address);

    (vault_address, vusd_address, wbtc_address, oracle_address)
}

// Helper to mint WBTC to user and approve vault
fn setup_user_wbtc(
    wbtc_address: ContractAddress,
    user_address: ContractAddress,
    vault_address: ContractAddress,
    amount: u256,
) {
    let wbtc = IMockWBTCDispatcher { contract_address: wbtc_address };
    let wbtc_erc20 = IERC20Dispatcher { contract_address: wbtc_address };

    // Mint WBTC to user
    wbtc.mint(user_address, amount);

    // User approves vault to spend WBTC
    start_cheat_caller_address(wbtc_address, user_address);
    wbtc_erc20.approve(vault_address, amount);
    stop_cheat_caller_address(wbtc_address);
}

#[test]
fn test_complete_deposit_mint_workflow() {
    let (vault_address, vusd_address, wbtc_address, _oracle_address) =
        deploy_integration_test_system();
    let user_address = contract_address_const::<USER>();

    // Setup user with WBTC
    setup_user_wbtc(wbtc_address, user_address, vault_address, WBTC_AMOUNT);

    let vault = IVoltaVaultDispatcher { contract_address: vault_address };
    let vusd_erc20 = IERC20Dispatcher { contract_address: vusd_address };
    let wbtc_erc20 = IERC20Dispatcher { contract_address: wbtc_address };

    // Check initial states
    let initial_user_wbtc = wbtc_erc20.balance_of(user_address);
    let initial_user_vusd = vusd_erc20.balance_of(user_address);
    let initial_vault_wbtc = vault.get_total_wbtc_locked();
    let initial_vault_vusd = vault.get_total_vusd_issued();

    assert!(initial_user_wbtc == WBTC_AMOUNT, "User should have WBTC");
    assert!(initial_user_vusd == 0, "User should have no vUSD initially");
    assert!(initial_vault_wbtc == 0, "Vault should have no WBTC locked initially");
    assert!(initial_vault_vusd == 0, "Vault should have no vUSD issued initially");

    // Calculate expected vUSD amount
    let expected_vusd = vault.calculate_vusd_from_wbtc(WBTC_AMOUNT);

    // Execute deposit WBTC and mint vUSD
    start_cheat_caller_address(vault_address, user_address);
    vault.deposit_wbtc_mint_vusd(WBTC_AMOUNT);
    stop_cheat_caller_address(vault_address);

    // Verify final states
    let final_user_wbtc = wbtc_erc20.balance_of(user_address);
    let final_user_vusd = vusd_erc20.balance_of(user_address);
    let final_vault_wbtc = vault.get_total_wbtc_locked();
    let final_vault_vusd = vault.get_total_vusd_issued();
    let user_collateral = vault.get_user_collateral(user_address);

    assert!(final_user_wbtc == 0, "User should have transferred all WBTC");
    assert!(final_user_vusd == expected_vusd, "User should receive calculated vUSD");
    assert!(final_vault_wbtc == WBTC_AMOUNT, "Vault should have locked user's WBTC");
    assert!(final_vault_vusd == expected_vusd, "Vault should track issued vUSD");
    assert!(user_collateral == WBTC_AMOUNT, "User collateral should be tracked");
}

#[test]
fn test_complete_burn_withdraw_workflow() {
    let (vault_address, vusd_address, wbtc_address, _oracle_address) =
        deploy_integration_test_system();
    let user_address = contract_address_const::<USER>();

    // Setup: First complete a deposit to have something to withdraw
    setup_user_wbtc(wbtc_address, user_address, vault_address, WBTC_AMOUNT);

    let vault = IVoltaVaultDispatcher { contract_address: vault_address };
    let vusd_erc20 = IERC20Dispatcher { contract_address: vusd_address };
    let wbtc_erc20 = IERC20Dispatcher { contract_address: wbtc_address };

    // Deposit WBTC and mint vUSD first
    start_cheat_caller_address(vault_address, user_address);
    vault.deposit_wbtc_mint_vusd(WBTC_AMOUNT);
    stop_cheat_caller_address(vault_address);

    // Check states after deposit
    let vusd_amount = vusd_erc20.balance_of(user_address);
    let wbtc_locked = vault.get_total_wbtc_locked();
    let vusd_issued = vault.get_total_vusd_issued();

    assert!(vusd_amount > 0, "User should have vUSD after deposit");
    assert!(wbtc_locked == WBTC_AMOUNT, "Vault should have WBTC locked");
    assert!(vusd_issued == vusd_amount, "Vault should track issued vUSD");

    // Now test burn vUSD and withdraw WBTC - withdraw half
    let burn_amount = vusd_amount / 2;
    let expected_wbtc_withdrawn = vault.calculate_wbtc_from_vusd(burn_amount);

    // User approves vault to burn their vUSD
    start_cheat_caller_address(vusd_address, user_address);
    vusd_erc20.approve(vault_address, burn_amount);
    stop_cheat_caller_address(vusd_address);

    // Execute burn vUSD and withdraw WBTC
    start_cheat_caller_address(vault_address, user_address);
    vault.burn_vusd_withdraw_wbtc(burn_amount);
    stop_cheat_caller_address(vault_address);

    // Verify final states
    let final_user_wbtc = wbtc_erc20.balance_of(user_address);
    let final_user_vusd = vusd_erc20.balance_of(user_address);
    let final_vault_wbtc = vault.get_total_wbtc_locked();
    let final_vault_vusd = vault.get_total_vusd_issued();
    let user_collateral = vault.get_user_collateral(user_address);

    // Allow small precision differences due to calculations
    let wbtc_diff = if final_user_wbtc > expected_wbtc_withdrawn {
        final_user_wbtc - expected_wbtc_withdrawn
    } else {
        expected_wbtc_withdrawn - final_user_wbtc
    };
    let max_diff = expected_wbtc_withdrawn / 100; // 1% tolerance

    assert!(wbtc_diff <= max_diff, "User should receive calculated WBTC back");
    assert!(final_user_vusd == vusd_amount - burn_amount, "User vUSD should be reduced");
    assert!(final_vault_wbtc < WBTC_AMOUNT, "Vault WBTC should be reduced");
    assert!(final_vault_vusd == vusd_amount - burn_amount, "Vault issued vUSD should be reduced");
    assert!(user_collateral < WBTC_AMOUNT, "User collateral should be reduced");
}

#[test]
fn test_multiple_user_interactions() {
    let (vault_address, vusd_address, wbtc_address, _oracle_address) =
        deploy_integration_test_system();
    let user1_address = contract_address_const::<USER>();
    let user2_address = contract_address_const::<0x111111>();

    // Setup both users with WBTC
    setup_user_wbtc(wbtc_address, user1_address, vault_address, WBTC_AMOUNT);
    setup_user_wbtc(wbtc_address, user2_address, vault_address, WBTC_AMOUNT);

    let vault = IVoltaVaultDispatcher { contract_address: vault_address };
    let vusd_erc20 = IERC20Dispatcher { contract_address: vusd_address };

    // User 1 deposits
    start_cheat_caller_address(vault_address, user1_address);
    vault.deposit_wbtc_mint_vusd(WBTC_AMOUNT);
    stop_cheat_caller_address(vault_address);

    // User 2 deposits
    start_cheat_caller_address(vault_address, user2_address);
    vault.deposit_wbtc_mint_vusd(WBTC_AMOUNT);
    stop_cheat_caller_address(vault_address);

    // Check vault totals
    let total_wbtc_locked = vault.get_total_wbtc_locked();
    let total_vusd_issued = vault.get_total_vusd_issued();
    let user1_vusd = vusd_erc20.balance_of(user1_address);
    let user2_vusd = vusd_erc20.balance_of(user2_address);

    assert!(total_wbtc_locked == WBTC_AMOUNT * 2, "Vault should have WBTC from both users");
    assert!(
        total_vusd_issued == user1_vusd + user2_vusd, "Total vUSD should match individual amounts",
    );

    // Check individual collateral tracking
    let user1_collateral = vault.get_user_collateral(user1_address);
    let user2_collateral = vault.get_user_collateral(user2_address);

    assert!(user1_collateral == WBTC_AMOUNT, "User 1 collateral should be tracked");
    assert!(user2_collateral == WBTC_AMOUNT, "User 2 collateral should be tracked");
}

#[test]
fn test_collateral_ratio_enforcement() {
    let (vault_address, vusd_address, wbtc_address, _oracle_address) =
        deploy_integration_test_system();
    let user_address = contract_address_const::<USER>();

    // Setup user with WBTC
    setup_user_wbtc(wbtc_address, user_address, vault_address, WBTC_AMOUNT);

    let vault = IVoltaVaultDispatcher { contract_address: vault_address };

    // Check collateral ratio is enforced in calculations
    let collateral_ratio = vault.get_collateral_ratio();
    assert!(collateral_ratio == 1500, "Collateral ratio should be 150%");

    // Calculate max vUSD that can be minted
    let max_vusd = vault.calculate_max_vusd_mint(WBTC_AMOUNT);
    let expected_max = vault.calculate_vusd_from_wbtc(WBTC_AMOUNT);

    assert!(max_vusd == expected_max, "Max vUSD should match calculation");

    // Perform deposit and verify the amounts respect collateral ratio
    start_cheat_caller_address(vault_address, user_address);
    vault.deposit_wbtc_mint_vusd(WBTC_AMOUNT);
    stop_cheat_caller_address(vault_address);

    // The actual minted amount should respect collateral ratio
    let vusd_erc20 = IERC20Dispatcher { contract_address: vusd_address };
    let actual_vusd = vusd_erc20.balance_of(user_address);

    // Verify the vault is maintaining proper over-collateralization
    let btc_price = vault.get_btc_price();
    let collateral_value = WBTC_AMOUNT * btc_price / 100000000; // Convert to same decimals
    let vusd_value = actual_vusd / 1000000000000000000; // Convert from 18 decimals
    let actual_ratio = (collateral_value * 10000)
        / vusd_value; // Multiply by 10000 to get basis points

    assert!(actual_ratio >= 1500, "Actual collateral ratio should be at least 150%");
}

#[test]
fn test_integration_with_price_changes() {
    let (vault_address, vusd_address, wbtc_address, _oracle_address) =
        deploy_integration_test_system();
    let user_address = contract_address_const::<USER>();

    // Setup user with WBTC
    setup_user_wbtc(wbtc_address, user_address, vault_address, WBTC_AMOUNT);

    let vault = IVoltaVaultDispatcher { contract_address: vault_address };

    // Initial price check
    let initial_price = vault.get_btc_price();
    assert!(initial_price == BTC_PRICE.into(), "Initial BTC price should be set");

    // Perform deposit at initial price
    let initial_max_vusd = vault.calculate_max_vusd_mint(WBTC_AMOUNT);

    start_cheat_caller_address(vault_address, user_address);
    vault.deposit_wbtc_mint_vusd(WBTC_AMOUNT);
    stop_cheat_caller_address(vault_address);

    let vusd_erc20 = IERC20Dispatcher { contract_address: vusd_address };
    let minted_vusd = vusd_erc20.balance_of(user_address);
    assert!(minted_vusd == initial_max_vusd, "Should mint calculated amount at initial price");

    // Check that price is being used correctly in calculations
    // The minted vUSD should be based on the BTC price from oracle
    let expected_vusd = (WBTC_AMOUNT * BTC_PRICE.into() * 1000000000000000000) / (1500 * 100000000);
    assert!(minted_vusd == expected_vusd, "Minted vUSD should match price-based calculation");
}
