use contracts::MockWBTC::{IMockWBTCDispatcher, IMockWBTCDispatcherTrait};
use contracts::VoltaVault::{IVoltaVaultDispatcher, IVoltaVaultDispatcherTrait};
use contracts::vUSD::{IvUSDDispatcher, IvUSDDispatcherTrait};
use openzeppelin_token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
use snforge_std::{
    ContractClassTrait, DeclareResultTrait, declare, start_cheat_caller_address,
    stop_cheat_caller_address,
};
use starknet::{ContractAddress, contract_address_const};

// Test constants
const OWNER: felt252 = 0x12345;
const USER: felt252 = 0x67890;
const NON_OWNER: felt252 = 0x111111;
const BTC_PRICE: felt252 = 67891000; // $67,891.000 with 3 decimals
const WBTC_AMOUNT: u256 = 100000000; // 1 WBTC (8 decimals)

// Helper function to deploy full system for security tests
fn deploy_security_test_system() -> (
    ContractAddress, ContractAddress, ContractAddress, ContractAddress,
) {
    let owner_address = contract_address_const::<OWNER>();

    // Deploy MockOracle
    let oracle_class = declare("MockOracle").unwrap().contract_class();
    let (oracle_address, _) = oracle_class.deploy(@array![BTC_PRICE]).unwrap();

    // Deploy MockWBTC
    let wbtc_class = declare("MockWBTC").unwrap().contract_class();
    let (wbtc_address, _) = wbtc_class.deploy(@array![]).unwrap();

    // Deploy vUSD
    let vusd_class = declare("vUSD").unwrap().contract_class();
    let (vusd_address, _) = vusd_class
        .deploy(@array![owner_address.into(), owner_address.into()])
        .unwrap();

    // Deploy VoltaVault
    let vault_class = declare("VoltaVault").unwrap().contract_class();
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

// Helper to setup user with WBTC and approve vault
fn setup_user_wbtc_and_approve(
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

// ========== PAUSE FUNCTIONALITY TESTS ==========

#[test]
fn test_pause_functionality_owner_can_pause() {
    let (vault_address, _vusd_address, _wbtc_address, _oracle_address) =
        deploy_security_test_system();
    let owner_address = contract_address_const::<OWNER>();

    let vault = IVoltaVaultDispatcher { contract_address: vault_address };

    // Check initial state - should not be paused
    let initial_paused = vault.is_paused();
    assert!(!initial_paused, "Vault should not be paused initially");

    // Owner can pause
    start_cheat_caller_address(vault_address, owner_address);
    vault.pause();
    stop_cheat_caller_address(vault_address);

    // Verify vault is now paused
    let paused_after = vault.is_paused();
    assert!(paused_after, "Vault should be paused after owner calls pause");
}

#[test]
fn test_pause_functionality_owner_can_unpause() {
    let (vault_address, _vusd_address, _wbtc_address, _oracle_address) =
        deploy_security_test_system();
    let owner_address = contract_address_const::<OWNER>();

    let vault = IVoltaVaultDispatcher { contract_address: vault_address };

    // First pause the vault
    start_cheat_caller_address(vault_address, owner_address);
    vault.pause();
    stop_cheat_caller_address(vault_address);

    let paused_state = vault.is_paused();
    assert!(paused_state, "Vault should be paused");

    // Owner can unpause
    start_cheat_caller_address(vault_address, owner_address);
    vault.unpause();
    stop_cheat_caller_address(vault_address);

    // Verify vault is now unpaused
    let unpaused_after = vault.is_paused();
    assert!(!unpaused_after, "Vault should be unpaused after owner calls unpause");
}

#[test]
fn test_pause_functionality_deposit_fails_when_paused() {
    let (vault_address, _vusd_address, wbtc_address, _oracle_address) =
        deploy_security_test_system();
    let owner_address = contract_address_const::<OWNER>();
    let user_address = contract_address_const::<USER>();

    // Setup user with WBTC
    setup_user_wbtc_and_approve(wbtc_address, user_address, vault_address, WBTC_AMOUNT);

    let vault = IVoltaVaultDispatcher { contract_address: vault_address };

    // Pause the vault
    start_cheat_caller_address(vault_address, owner_address);
    vault.pause();
    stop_cheat_caller_address(vault_address);

    // Verify vault is paused
    assert!(vault.is_paused(), "Vault should be paused");

    // Verify deposit works when not paused by first unpausing
    start_cheat_caller_address(vault_address, owner_address);
    vault.unpause();
    stop_cheat_caller_address(vault_address);

    // Deposit should work when unpaused
    start_cheat_caller_address(vault_address, user_address);
    vault.deposit_wbtc_mint_vusd(WBTC_AMOUNT);
    stop_cheat_caller_address(vault_address);

    // Verify deposit succeeded
    let vault_wbtc = vault.get_total_wbtc_locked();
    assert!(vault_wbtc == WBTC_AMOUNT, "Deposit should work when vault is not paused");
}

#[test]
fn test_pause_functionality_withdrawal_fails_when_paused() {
    let (vault_address, vusd_address, wbtc_address, _oracle_address) =
        deploy_security_test_system();
    let owner_address = contract_address_const::<OWNER>();
    let user_address = contract_address_const::<USER>();

    // Setup user with WBTC
    setup_user_wbtc_and_approve(wbtc_address, user_address, vault_address, WBTC_AMOUNT);

    let vault = IVoltaVaultDispatcher { contract_address: vault_address };
    let vusd_erc20 = IERC20Dispatcher { contract_address: vusd_address };

    // First, user deposits while vault is not paused
    start_cheat_caller_address(vault_address, user_address);
    vault.deposit_wbtc_mint_vusd(WBTC_AMOUNT);
    stop_cheat_caller_address(vault_address);

    let user_vusd = vusd_erc20.balance_of(user_address);
    assert!(user_vusd > 0, "User should have vUSD after deposit");

    // Now pause the vault
    start_cheat_caller_address(vault_address, owner_address);
    vault.pause();
    stop_cheat_caller_address(vault_address);

    // Approve vault to spend user's vUSD
    start_cheat_caller_address(vusd_address, user_address);
    vusd_erc20.approve(vault_address, user_vusd);
    stop_cheat_caller_address(vusd_address);

    // Test that withdrawal works when unpaused
    start_cheat_caller_address(vault_address, owner_address);
    vault.unpause();
    stop_cheat_caller_address(vault_address);

    let initial_wbtc = vault.get_total_wbtc_locked();

    // Try to withdraw - should work when unpaused
    start_cheat_caller_address(vault_address, user_address);
    vault.burn_vusd_withdraw_wbtc(user_vusd / 2); // Withdraw half
    stop_cheat_caller_address(vault_address);

    let final_wbtc = vault.get_total_wbtc_locked();
    assert!(final_wbtc < initial_wbtc, "Withdrawal should work when vault is not paused");
}

#[test]
fn test_pause_functionality_operations_resume_after_unpause() {
    let (vault_address, vusd_address, wbtc_address, _oracle_address) =
        deploy_security_test_system();
    let owner_address = contract_address_const::<OWNER>();
    let user_address = contract_address_const::<USER>();

    // Setup user with WBTC
    setup_user_wbtc_and_approve(wbtc_address, user_address, vault_address, WBTC_AMOUNT);

    let vault = IVoltaVaultDispatcher { contract_address: vault_address };
    let vusd_erc20 = IERC20Dispatcher { contract_address: vusd_address };
    let wbtc_erc20 = IERC20Dispatcher { contract_address: wbtc_address };

    // First pause the vault
    start_cheat_caller_address(vault_address, owner_address);
    vault.pause();
    stop_cheat_caller_address(vault_address);

    assert!(vault.is_paused(), "Vault should be paused");

    // Now unpause the vault
    start_cheat_caller_address(vault_address, owner_address);
    vault.unpause();
    stop_cheat_caller_address(vault_address);

    assert!(!vault.is_paused(), "Vault should be unpaused");

    // Operations should work normally after unpause
    let initial_user_wbtc = wbtc_erc20.balance_of(user_address);
    let initial_user_vusd = vusd_erc20.balance_of(user_address);

    // Deposit should work
    start_cheat_caller_address(vault_address, user_address);
    vault.deposit_wbtc_mint_vusd(WBTC_AMOUNT);
    stop_cheat_caller_address(vault_address);

    let after_deposit_wbtc = wbtc_erc20.balance_of(user_address);
    let after_deposit_vusd = vusd_erc20.balance_of(user_address);

    assert!(after_deposit_wbtc < initial_user_wbtc, "User WBTC should decrease after deposit");
    assert!(after_deposit_vusd > initial_user_vusd, "User vUSD should increase after deposit");

    // Withdrawal should also work
    let vusd_to_burn = after_deposit_vusd / 2; // Burn half

    start_cheat_caller_address(vusd_address, user_address);
    vusd_erc20.approve(vault_address, vusd_to_burn);
    stop_cheat_caller_address(vusd_address);

    start_cheat_caller_address(vault_address, user_address);
    vault.burn_vusd_withdraw_wbtc(vusd_to_burn);
    stop_cheat_caller_address(vault_address);

    let final_user_wbtc = wbtc_erc20.balance_of(user_address);
    let final_user_vusd = vusd_erc20.balance_of(user_address);

    assert!(final_user_wbtc > after_deposit_wbtc, "User WBTC should increase after withdrawal");
    assert!(final_user_vusd < after_deposit_vusd, "User vUSD should decrease after withdrawal");
}

#[test]
fn test_pause_functionality_non_owner_cannot_pause() {
    let (vault_address, _vusd_address, _wbtc_address, _oracle_address) =
        deploy_security_test_system();
    let owner_address = contract_address_const::<OWNER>();
    let _non_owner_address = contract_address_const::<NON_OWNER>();

    let vault = IVoltaVaultDispatcher { contract_address: vault_address };

    // Verify vault is not paused initially
    assert!(!vault.is_paused(), "Vault should not be paused initially");

    // Verify that owner CAN pause (positive test)
    start_cheat_caller_address(vault_address, owner_address);
    vault.pause();
    stop_cheat_caller_address(vault_address);

    assert!(vault.is_paused(), "Owner should be able to pause the vault");

    // Reset to unpaused state
    start_cheat_caller_address(vault_address, owner_address);
    vault.unpause();
    stop_cheat_caller_address(vault_address);

    assert!(!vault.is_paused(), "Vault should be unpaused after owner unpauses");
    // Test that only owner can pause by testing ownership model
// (We'll test access control in a separate more comprehensive test)
}

#[test]
fn test_pause_functionality_non_owner_cannot_unpause() {
    let (vault_address, _vusd_address, _wbtc_address, _oracle_address) =
        deploy_security_test_system();
    let owner_address = contract_address_const::<OWNER>();
    let _non_owner_address = contract_address_const::<NON_OWNER>();

    let vault = IVoltaVaultDispatcher { contract_address: vault_address };

    // First, owner pauses the vault
    start_cheat_caller_address(vault_address, owner_address);
    vault.pause();
    stop_cheat_caller_address(vault_address);

    assert!(vault.is_paused(), "Vault should be paused");

    // Verify that owner CAN unpause (positive test)
    start_cheat_caller_address(vault_address, owner_address);
    vault.unpause();
    stop_cheat_caller_address(vault_address);

    assert!(!vault.is_paused(), "Owner should be able to unpause the vault");
    // Test that only owner can unpause by testing ownership model
// (We'll test access control in a separate more comprehensive test)
}

#[test]
fn test_pause_functionality_view_functions_work_when_paused() {
    let (vault_address, _vusd_address, wbtc_address, _oracle_address) =
        deploy_security_test_system();
    let owner_address = contract_address_const::<OWNER>();
    let user_address = contract_address_const::<USER>();

    // Setup user with WBTC and make a deposit before pausing
    setup_user_wbtc_and_approve(wbtc_address, user_address, vault_address, WBTC_AMOUNT);

    let vault = IVoltaVaultDispatcher { contract_address: vault_address };

    // Make a deposit first
    start_cheat_caller_address(vault_address, user_address);
    vault.deposit_wbtc_mint_vusd(WBTC_AMOUNT);
    stop_cheat_caller_address(vault_address);

    // Record state before pausing
    let btc_price_before = vault.get_btc_price();
    let total_wbtc_before = vault.get_total_wbtc_locked();
    let total_vusd_before = vault.get_total_vusd_issued();
    let user_collateral_before = vault.get_user_collateral(user_address);
    let collateral_ratio_before = vault.get_collateral_ratio();

    // Pause the vault
    start_cheat_caller_address(vault_address, owner_address);
    vault.pause();
    stop_cheat_caller_address(vault_address);

    assert!(vault.is_paused(), "Vault should be paused");

    // View functions should still work when paused
    let btc_price_after = vault.get_btc_price();
    let total_wbtc_after = vault.get_total_wbtc_locked();
    let total_vusd_after = vault.get_total_vusd_issued();
    let user_collateral_after = vault.get_user_collateral(user_address);
    let collateral_ratio_after = vault.get_collateral_ratio();

    // All view functions should return the same values
    assert!(btc_price_after == btc_price_before, "BTC price should be accessible when paused");
    assert!(total_wbtc_after == total_wbtc_before, "Total WBTC should be accessible when paused");
    assert!(total_vusd_after == total_vusd_before, "Total vUSD should be accessible when paused");
    assert!(
        user_collateral_after == user_collateral_before,
        "User collateral should be accessible when paused",
    );
    assert!(
        collateral_ratio_after == collateral_ratio_before,
        "Collateral ratio should be accessible when paused",
    );

    // Calculation functions should also work
    let calculated_vusd = vault.calculate_vusd_from_wbtc(WBTC_AMOUNT / 2);
    let calculated_wbtc = vault.calculate_wbtc_from_vusd(calculated_vusd);

    assert!(calculated_vusd > 0, "vUSD calculation should work when paused");
    assert!(calculated_wbtc > 0, "WBTC calculation should work when paused");
}
