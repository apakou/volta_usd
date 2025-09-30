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
const USER2: felt252 = 0x111111;
const BTC_PRICE: felt252 = 67891000; // $67,891.000 with 3 decimals
const WBTC_AMOUNT_LARGE: u256 = 100000000; // 1 WBTC (8 decimals)
const WBTC_AMOUNT_SMALL: u256 = 50000000; // 0.5 WBTC (8 decimals)

// Helper function to deploy full system for core functionality tests
fn deploy_core_test_system() -> (
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

#[test]
fn test_deposit_function_basic_operation() {
    let (vault_address, vusd_address, wbtc_address, _oracle_address) = deploy_core_test_system();
    let user_address = contract_address_const::<USER>();

    // Setup user with WBTC
    setup_user_wbtc_and_approve(wbtc_address, user_address, vault_address, WBTC_AMOUNT_LARGE);

    let vault = IVoltaVaultDispatcher { contract_address: vault_address };
    let vusd_erc20 = IERC20Dispatcher { contract_address: vusd_address };
    let wbtc_erc20 = IERC20Dispatcher { contract_address: wbtc_address };

    // Record initial states
    let initial_user_wbtc = wbtc_erc20.balance_of(user_address);
    let initial_user_vusd = vusd_erc20.balance_of(user_address);
    let initial_vault_wbtc = vault.get_total_wbtc_locked();
    let initial_vault_vusd = vault.get_total_vusd_issued();
    let initial_user_collateral = vault.get_user_collateral(user_address);

    // Verify initial states
    assert!(initial_user_wbtc == WBTC_AMOUNT_LARGE, "User should have initial WBTC");
    assert!(initial_user_vusd == 0, "User should have no vUSD initially");
    assert!(initial_vault_wbtc == 0, "Vault should have no WBTC locked initially");
    assert!(initial_vault_vusd == 0, "Vault should have no vUSD issued initially");
    assert!(initial_user_collateral == 0, "User should have no collateral initially");

    // Calculate expected vUSD amount
    let expected_vusd = vault.calculate_vusd_from_wbtc(WBTC_AMOUNT_LARGE);
    assert!(expected_vusd > 0, "Expected vUSD should be positive");

    // Execute deposit
    start_cheat_caller_address(vault_address, user_address);
    vault.deposit_wbtc_mint_vusd(WBTC_AMOUNT_LARGE);
    stop_cheat_caller_address(vault_address);

    // Record final states
    let final_user_wbtc = wbtc_erc20.balance_of(user_address);
    let final_user_vusd = vusd_erc20.balance_of(user_address);
    let final_vault_wbtc = vault.get_total_wbtc_locked();
    let final_vault_vusd = vault.get_total_vusd_issued();
    let final_user_collateral = vault.get_user_collateral(user_address);

    // Verify state changes
    assert!(final_user_wbtc == 0, "User WBTC should be transferred to vault");
    assert!(final_user_vusd == expected_vusd, "User should receive calculated vUSD");
    assert!(final_vault_wbtc == WBTC_AMOUNT_LARGE, "Vault should hold user's WBTC");
    assert!(final_vault_vusd == expected_vusd, "Vault should track issued vUSD");
    assert!(final_user_collateral == WBTC_AMOUNT_LARGE, "User collateral should be recorded");

    // Verify the transfer amounts match
    let wbtc_transferred = initial_user_wbtc - final_user_wbtc;
    let vusd_received = final_user_vusd - initial_user_vusd;
    let vault_wbtc_gained = final_vault_wbtc - initial_vault_wbtc;
    let vault_vusd_issued = final_vault_vusd - initial_vault_vusd;

    assert!(wbtc_transferred == WBTC_AMOUNT_LARGE, "Correct WBTC amount transferred");
    assert!(vusd_received == expected_vusd, "Correct vUSD amount received");
    assert!(vault_wbtc_gained == WBTC_AMOUNT_LARGE, "Vault gained correct WBTC");
    assert!(vault_vusd_issued == expected_vusd, "Vault issued correct vUSD");
}

#[test]
fn test_deposit_function_multiple_deposits() {
    let (vault_address, vusd_address, wbtc_address, _oracle_address) = deploy_core_test_system();
    let user_address = contract_address_const::<USER>();

    let vault = IVoltaVaultDispatcher { contract_address: vault_address };
    let vusd_erc20 = IERC20Dispatcher { contract_address: vusd_address };

    // First deposit
    setup_user_wbtc_and_approve(wbtc_address, user_address, vault_address, WBTC_AMOUNT_SMALL);

    let expected_vusd_first = vault.calculate_vusd_from_wbtc(WBTC_AMOUNT_SMALL);

    start_cheat_caller_address(vault_address, user_address);
    vault.deposit_wbtc_mint_vusd(WBTC_AMOUNT_SMALL);
    stop_cheat_caller_address(vault_address);

    let vusd_after_first = vusd_erc20.balance_of(user_address);
    let wbtc_locked_after_first = vault.get_total_wbtc_locked();
    let collateral_after_first = vault.get_user_collateral(user_address);

    assert!(vusd_after_first == expected_vusd_first, "First deposit should mint correct vUSD");
    assert!(wbtc_locked_after_first == WBTC_AMOUNT_SMALL, "First deposit should lock correct WBTC");
    assert!(
        collateral_after_first == WBTC_AMOUNT_SMALL,
        "First deposit should record correct collateral",
    );

    // Second deposit
    setup_user_wbtc_and_approve(wbtc_address, user_address, vault_address, WBTC_AMOUNT_SMALL);

    let expected_vusd_second = vault.calculate_vusd_from_wbtc(WBTC_AMOUNT_SMALL);

    start_cheat_caller_address(vault_address, user_address);
    vault.deposit_wbtc_mint_vusd(WBTC_AMOUNT_SMALL);
    stop_cheat_caller_address(vault_address);

    let vusd_after_second = vusd_erc20.balance_of(user_address);
    let wbtc_locked_after_second = vault.get_total_wbtc_locked();
    let collateral_after_second = vault.get_user_collateral(user_address);

    // Verify cumulative effects
    assert!(
        vusd_after_second == expected_vusd_first + expected_vusd_second,
        "Total vUSD should be sum of deposits",
    );
    assert!(
        wbtc_locked_after_second == WBTC_AMOUNT_SMALL + WBTC_AMOUNT_SMALL,
        "Total WBTC should be sum of deposits",
    );
    assert!(
        collateral_after_second == WBTC_AMOUNT_SMALL + WBTC_AMOUNT_SMALL,
        "Total collateral should be sum of deposits",
    );
}

#[test]
fn test_deposit_function_multiple_users() {
    let (vault_address, vusd_address, wbtc_address, _oracle_address) = deploy_core_test_system();
    let user1_address = contract_address_const::<USER>();
    let user2_address = contract_address_const::<USER2>();

    // Setup both users with different amounts
    setup_user_wbtc_and_approve(wbtc_address, user1_address, vault_address, WBTC_AMOUNT_LARGE);
    setup_user_wbtc_and_approve(wbtc_address, user2_address, vault_address, WBTC_AMOUNT_SMALL);

    let vault = IVoltaVaultDispatcher { contract_address: vault_address };
    let vusd_erc20 = IERC20Dispatcher { contract_address: vusd_address };

    // Calculate expected amounts
    let expected_vusd_user1 = vault.calculate_vusd_from_wbtc(WBTC_AMOUNT_LARGE);
    let expected_vusd_user2 = vault.calculate_vusd_from_wbtc(WBTC_AMOUNT_SMALL);

    // User 1 deposits
    start_cheat_caller_address(vault_address, user1_address);
    vault.deposit_wbtc_mint_vusd(WBTC_AMOUNT_LARGE);
    stop_cheat_caller_address(vault_address);

    // Check state after user 1
    let user1_vusd = vusd_erc20.balance_of(user1_address);
    let user1_collateral = vault.get_user_collateral(user1_address);
    let vault_wbtc_after_user1 = vault.get_total_wbtc_locked();
    let vault_vusd_after_user1 = vault.get_total_vusd_issued();

    assert!(user1_vusd == expected_vusd_user1, "User 1 should receive correct vUSD");
    assert!(user1_collateral == WBTC_AMOUNT_LARGE, "User 1 collateral should be tracked");
    assert!(vault_wbtc_after_user1 == WBTC_AMOUNT_LARGE, "Vault should have user 1's WBTC");
    assert!(vault_vusd_after_user1 == expected_vusd_user1, "Vault should track user 1's vUSD");

    // User 2 deposits
    start_cheat_caller_address(vault_address, user2_address);
    vault.deposit_wbtc_mint_vusd(WBTC_AMOUNT_SMALL);
    stop_cheat_caller_address(vault_address);

    // Check final state
    let user1_vusd_final = vusd_erc20.balance_of(user1_address);
    let user2_vusd_final = vusd_erc20.balance_of(user2_address);
    let user1_collateral_final = vault.get_user_collateral(user1_address);
    let user2_collateral_final = vault.get_user_collateral(user2_address);
    let vault_wbtc_final = vault.get_total_wbtc_locked();
    let vault_vusd_final = vault.get_total_vusd_issued();

    // User 1's state should be unchanged
    assert!(user1_vusd_final == expected_vusd_user1, "User 1 vUSD should be unchanged");
    assert!(user1_collateral_final == WBTC_AMOUNT_LARGE, "User 1 collateral should be unchanged");

    // User 2's state should be correct
    assert!(user2_vusd_final == expected_vusd_user2, "User 2 should receive correct vUSD");
    assert!(user2_collateral_final == WBTC_AMOUNT_SMALL, "User 2 collateral should be tracked");

    // Vault totals should be sum of both users
    assert!(
        vault_wbtc_final == WBTC_AMOUNT_LARGE + WBTC_AMOUNT_SMALL,
        "Vault should hold both users' WBTC",
    );
    assert!(
        vault_vusd_final == expected_vusd_user1 + expected_vusd_user2,
        "Vault should track total vUSD issued",
    );
}

#[test]
fn test_deposit_function_state_consistency() {
    let (vault_address, vusd_address, wbtc_address, _oracle_address) = deploy_core_test_system();
    let user_address = contract_address_const::<USER>();

    setup_user_wbtc_and_approve(wbtc_address, user_address, vault_address, WBTC_AMOUNT_LARGE);

    let vault = IVoltaVaultDispatcher { contract_address: vault_address };
    let vusd_erc20 = IERC20Dispatcher { contract_address: vusd_address };
    let wbtc_erc20 = IERC20Dispatcher { contract_address: wbtc_address };

    // Perform deposit
    start_cheat_caller_address(vault_address, user_address);
    vault.deposit_wbtc_mint_vusd(WBTC_AMOUNT_LARGE);
    stop_cheat_caller_address(vault_address);

    // Check state consistency - vault's WBTC balance should match what it thinks it has
    let vault_wbtc_balance = wbtc_erc20.balance_of(vault_address);
    let vault_total_locked = vault.get_total_wbtc_locked();
    assert!(
        vault_wbtc_balance == vault_total_locked,
        "Vault actual WBTC balance should match recorded amount",
    );

    // Check that user collateral matches what was deposited
    let user_collateral = vault.get_user_collateral(user_address);
    assert!(user_collateral == WBTC_AMOUNT_LARGE, "User collateral should match deposit amount");

    // Check that total vUSD issued equals user's vUSD balance (single user case)
    let user_vusd_balance = vusd_erc20.balance_of(user_address);
    let vault_vusd_issued = vault.get_total_vusd_issued();
    assert!(
        user_vusd_balance == vault_vusd_issued,
        "User vUSD balance should match vault's issued amount",
    );

    // Check that vault has no vUSD (it only issues, doesn't hold)
    let vault_vusd_balance = vusd_erc20.balance_of(vault_address);
    assert!(vault_vusd_balance == 0, "Vault should not hold vUSD tokens");

    // Verify calculation consistency
    let expected_vusd = vault.calculate_vusd_from_wbtc(WBTC_AMOUNT_LARGE);
    assert!(user_vusd_balance == expected_vusd, "Actual vUSD minted should match calculation");
}

// ========== WITHDRAWAL FUNCTION TESTS ==========

#[test]
fn test_withdrawal_function_basic_operation() {
    let (vault_address, vusd_address, wbtc_address, _oracle_address) = deploy_core_test_system();
    let user_address = contract_address_const::<USER>();

    // Setup: First deposit WBTC to have something to withdraw
    setup_user_wbtc_and_approve(wbtc_address, user_address, vault_address, WBTC_AMOUNT_LARGE);

    let vault = IVoltaVaultDispatcher { contract_address: vault_address };
    let vusd_erc20 = IERC20Dispatcher { contract_address: vusd_address };
    let wbtc_erc20 = IERC20Dispatcher { contract_address: wbtc_address };

    // Perform initial deposit
    start_cheat_caller_address(vault_address, user_address);
    vault.deposit_wbtc_mint_vusd(WBTC_AMOUNT_LARGE);
    stop_cheat_caller_address(vault_address);

    // Record states after deposit (before withdrawal)
    let user_vusd_after_deposit = vusd_erc20.balance_of(user_address);
    let user_wbtc_after_deposit = wbtc_erc20.balance_of(user_address);
    let vault_wbtc_after_deposit = vault.get_total_wbtc_locked();
    let _vault_vusd_after_deposit = vault.get_total_vusd_issued();
    let user_collateral_after_deposit = vault.get_user_collateral(user_address);

    assert!(user_vusd_after_deposit > 0, "User should have vUSD after deposit");
    assert!(user_wbtc_after_deposit == 0, "User should have no WBTC after deposit");
    assert!(vault_wbtc_after_deposit == WBTC_AMOUNT_LARGE, "Vault should have user's WBTC");
    assert!(
        user_collateral_after_deposit == WBTC_AMOUNT_LARGE, "User collateral should be recorded",
    );

    // Calculate withdrawal - withdraw half of the vUSD
    let burn_amount = user_vusd_after_deposit / 2;
    let expected_wbtc_returned = vault.calculate_wbtc_from_vusd(burn_amount);

    // User approves vault to burn their vUSD
    start_cheat_caller_address(vusd_address, user_address);
    vusd_erc20.approve(vault_address, burn_amount);
    stop_cheat_caller_address(vusd_address);

    // Execute withdrawal
    start_cheat_caller_address(vault_address, user_address);
    vault.burn_vusd_withdraw_wbtc(burn_amount);
    stop_cheat_caller_address(vault_address);

    // Record final states after withdrawal
    let final_user_vusd = vusd_erc20.balance_of(user_address);
    let final_user_wbtc = wbtc_erc20.balance_of(user_address);
    let final_vault_wbtc = vault.get_total_wbtc_locked();
    let final_vault_vusd = vault.get_total_vusd_issued();
    let final_user_collateral = vault.get_user_collateral(user_address);

    // Verify withdrawal state changes
    assert!(
        final_user_vusd == user_vusd_after_deposit - burn_amount,
        "User vUSD should be reduced by burn amount",
    );

    // Allow small precision differences due to calculations
    let wbtc_diff = if final_user_wbtc > expected_wbtc_returned {
        final_user_wbtc - expected_wbtc_returned
    } else {
        expected_wbtc_returned - final_user_wbtc
    };
    let max_diff = expected_wbtc_returned / 100; // 1% tolerance
    assert!(wbtc_diff <= max_diff, "User should receive calculated WBTC back");

    assert!(final_vault_wbtc < vault_wbtc_after_deposit, "Vault WBTC should be reduced");
    assert!(
        final_vault_vusd == user_vusd_after_deposit - burn_amount,
        "Vault issued vUSD should be reduced",
    );
    assert!(
        final_user_collateral < user_collateral_after_deposit, "User collateral should be reduced",
    );
}

#[test]
fn test_withdrawal_function_full_withdrawal() {
    let (vault_address, vusd_address, wbtc_address, _oracle_address) = deploy_core_test_system();
    let user_address = contract_address_const::<USER>();

    // Setup: Deposit WBTC first
    setup_user_wbtc_and_approve(wbtc_address, user_address, vault_address, WBTC_AMOUNT_SMALL);

    let vault = IVoltaVaultDispatcher { contract_address: vault_address };
    let vusd_erc20 = IERC20Dispatcher { contract_address: vusd_address };
    let wbtc_erc20 = IERC20Dispatcher { contract_address: wbtc_address };

    // Perform deposit
    start_cheat_caller_address(vault_address, user_address);
    vault.deposit_wbtc_mint_vusd(WBTC_AMOUNT_SMALL);
    stop_cheat_caller_address(vault_address);

    let user_vusd_balance = vusd_erc20.balance_of(user_address);

    // Withdraw everything
    let expected_wbtc_returned = vault.calculate_wbtc_from_vusd(user_vusd_balance);

    // User approves vault to burn all their vUSD
    start_cheat_caller_address(vusd_address, user_address);
    vusd_erc20.approve(vault_address, user_vusd_balance);
    stop_cheat_caller_address(vusd_address);

    // Execute full withdrawal
    start_cheat_caller_address(vault_address, user_address);
    vault.burn_vusd_withdraw_wbtc(user_vusd_balance);
    stop_cheat_caller_address(vault_address);

    // Verify complete withdrawal
    let final_user_vusd = vusd_erc20.balance_of(user_address);
    let final_user_wbtc = wbtc_erc20.balance_of(user_address);
    let final_vault_wbtc = vault.get_total_wbtc_locked();
    let final_vault_vusd = vault.get_total_vusd_issued();
    let final_user_collateral = vault.get_user_collateral(user_address);

    assert!(final_user_vusd == 0, "User should have no vUSD left after full withdrawal");

    // Allow precision tolerance for full withdrawal
    let wbtc_diff = if final_user_wbtc > expected_wbtc_returned {
        final_user_wbtc - expected_wbtc_returned
    } else {
        expected_wbtc_returned - final_user_wbtc
    };
    let max_diff = WBTC_AMOUNT_SMALL / 100; // 1% tolerance
    assert!(wbtc_diff <= max_diff, "User should receive back approximately original WBTC");

    // Allow small precision differences in vault states for full withdrawal
    assert!(
        final_vault_wbtc <= WBTC_AMOUNT_SMALL / 1000,
        "Vault should have minimal WBTC locked after full withdrawal",
    );
    assert!(final_vault_vusd == 0, "Vault should have no vUSD issued after full withdrawal");
    assert!(
        final_user_collateral <= WBTC_AMOUNT_SMALL / 1000,
        "User should have minimal collateral left after full withdrawal",
    );
}

#[test]
fn test_withdrawal_function_multiple_withdrawals() {
    let (vault_address, vusd_address, wbtc_address, _oracle_address) = deploy_core_test_system();
    let user_address = contract_address_const::<USER>();

    // Setup: Deposit WBTC first
    setup_user_wbtc_and_approve(wbtc_address, user_address, vault_address, WBTC_AMOUNT_LARGE);

    let vault = IVoltaVaultDispatcher { contract_address: vault_address };
    let vusd_erc20 = IERC20Dispatcher { contract_address: vusd_address };
    let wbtc_erc20 = IERC20Dispatcher { contract_address: wbtc_address };

    // Perform deposit
    start_cheat_caller_address(vault_address, user_address);
    vault.deposit_wbtc_mint_vusd(WBTC_AMOUNT_LARGE);
    stop_cheat_caller_address(vault_address);

    let initial_vusd = vusd_erc20.balance_of(user_address);

    // First withdrawal - 1/4 of vUSD
    let first_burn = initial_vusd / 4;
    let _expected_first_wbtc = vault.calculate_wbtc_from_vusd(first_burn);

    start_cheat_caller_address(vusd_address, user_address);
    vusd_erc20.approve(vault_address, first_burn);
    stop_cheat_caller_address(vusd_address);

    start_cheat_caller_address(vault_address, user_address);
    vault.burn_vusd_withdraw_wbtc(first_burn);
    stop_cheat_caller_address(vault_address);

    let vusd_after_first = vusd_erc20.balance_of(user_address);
    let wbtc_after_first = wbtc_erc20.balance_of(user_address);
    let vault_wbtc_after_first = vault.get_total_wbtc_locked();
    let collateral_after_first = vault.get_user_collateral(user_address);

    assert!(
        vusd_after_first == initial_vusd - first_burn,
        "vUSD should be reduced after first withdrawal",
    );
    assert!(wbtc_after_first > 0, "User should receive WBTC after first withdrawal");
    assert!(vault_wbtc_after_first < WBTC_AMOUNT_LARGE, "Vault WBTC should be reduced");
    assert!(collateral_after_first < WBTC_AMOUNT_LARGE, "User collateral should be reduced");

    // Second withdrawal - another 1/4 of original vUSD
    let second_burn = initial_vusd / 4;
    let _expected_second_wbtc = vault.calculate_wbtc_from_vusd(second_burn);

    start_cheat_caller_address(vusd_address, user_address);
    vusd_erc20.approve(vault_address, second_burn);
    stop_cheat_caller_address(vusd_address);

    start_cheat_caller_address(vault_address, user_address);
    vault.burn_vusd_withdraw_wbtc(second_burn);
    stop_cheat_caller_address(vault_address);

    let final_vusd = vusd_erc20.balance_of(user_address);
    let final_wbtc = wbtc_erc20.balance_of(user_address);
    let final_vault_wbtc = vault.get_total_wbtc_locked();
    let final_collateral = vault.get_user_collateral(user_address);

    // Verify cumulative effects
    assert!(
        final_vusd == initial_vusd - first_burn - second_burn,
        "Total vUSD burned should be sum of withdrawals",
    );
    assert!(final_wbtc > wbtc_after_first, "User should have more WBTC after second withdrawal");
    assert!(final_vault_wbtc < vault_wbtc_after_first, "Vault WBTC should be further reduced");
    assert!(final_collateral < collateral_after_first, "User collateral should be further reduced");
}

#[test]
fn test_withdrawal_function_multiple_users() {
    let (vault_address, vusd_address, wbtc_address, _oracle_address) = deploy_core_test_system();
    let user1_address = contract_address_const::<USER>();
    let user2_address = contract_address_const::<USER2>();

    // Setup: Both users deposit different amounts
    setup_user_wbtc_and_approve(wbtc_address, user1_address, vault_address, WBTC_AMOUNT_LARGE);
    setup_user_wbtc_and_approve(wbtc_address, user2_address, vault_address, WBTC_AMOUNT_SMALL);

    let vault = IVoltaVaultDispatcher { contract_address: vault_address };
    let vusd_erc20 = IERC20Dispatcher { contract_address: vusd_address };
    let wbtc_erc20 = IERC20Dispatcher { contract_address: wbtc_address };

    // Both users deposit
    start_cheat_caller_address(vault_address, user1_address);
    vault.deposit_wbtc_mint_vusd(WBTC_AMOUNT_LARGE);
    stop_cheat_caller_address(vault_address);

    start_cheat_caller_address(vault_address, user2_address);
    vault.deposit_wbtc_mint_vusd(WBTC_AMOUNT_SMALL);
    stop_cheat_caller_address(vault_address);

    let user1_vusd = vusd_erc20.balance_of(user1_address);
    let user2_vusd = vusd_erc20.balance_of(user2_address);
    let total_vault_wbtc_after_deposits = vault.get_total_wbtc_locked();
    let total_vault_vusd_after_deposits = vault.get_total_vusd_issued();

    // User 1 withdraws half their vUSD
    let user1_burn = user1_vusd / 2;

    start_cheat_caller_address(vusd_address, user1_address);
    vusd_erc20.approve(vault_address, user1_burn);
    stop_cheat_caller_address(vusd_address);

    start_cheat_caller_address(vault_address, user1_address);
    vault.burn_vusd_withdraw_wbtc(user1_burn);
    stop_cheat_caller_address(vault_address);

    // Check states after user 1 withdrawal
    let user1_vusd_after = vusd_erc20.balance_of(user1_address);
    let user1_wbtc_after = wbtc_erc20.balance_of(user1_address);
    let user2_vusd_after = vusd_erc20.balance_of(user2_address); // Should be unchanged
    let user2_wbtc_after = wbtc_erc20.balance_of(user2_address); // Should be unchanged
    let user1_collateral_after = vault.get_user_collateral(user1_address);
    let user2_collateral_after = vault.get_user_collateral(user2_address); // Should be unchanged
    let vault_wbtc_after_user1 = vault.get_total_wbtc_locked();
    let vault_vusd_after_user1 = vault.get_total_vusd_issued();

    // User 1's state should change
    assert!(user1_vusd_after == user1_vusd - user1_burn, "User 1 vUSD should be reduced");
    assert!(user1_wbtc_after > 0, "User 1 should receive WBTC back");
    assert!(user1_collateral_after < WBTC_AMOUNT_LARGE, "User 1 collateral should be reduced");

    // User 2's state should be unchanged
    assert!(user2_vusd_after == user2_vusd, "User 2 vUSD should be unchanged");
    assert!(user2_wbtc_after == 0, "User 2 should still have no WBTC");
    assert!(user2_collateral_after == WBTC_AMOUNT_SMALL, "User 2 collateral should be unchanged");

    // Vault totals should be reduced by user 1's withdrawal only
    assert!(
        vault_wbtc_after_user1 < total_vault_wbtc_after_deposits, "Vault WBTC should be reduced",
    );
    assert!(
        vault_vusd_after_user1 < total_vault_vusd_after_deposits, "Vault vUSD should be reduced",
    );
    assert!(
        vault_vusd_after_user1 == user1_vusd_after + user2_vusd_after,
        "Vault vUSD should equal sum of user balances",
    );
}

#[test]
fn test_withdrawal_function_reverse_calculation_accuracy() {
    let (vault_address, vusd_address, wbtc_address, _oracle_address) = deploy_core_test_system();
    let user_address = contract_address_const::<USER>();

    // Setup: Deposit WBTC first
    setup_user_wbtc_and_approve(wbtc_address, user_address, vault_address, WBTC_AMOUNT_LARGE);

    let vault = IVoltaVaultDispatcher { contract_address: vault_address };
    let vusd_erc20 = IERC20Dispatcher { contract_address: vusd_address };
    let wbtc_erc20 = IERC20Dispatcher { contract_address: wbtc_address };

    // Perform deposit
    start_cheat_caller_address(vault_address, user_address);
    vault.deposit_wbtc_mint_vusd(WBTC_AMOUNT_LARGE);
    stop_cheat_caller_address(vault_address);

    let minted_vusd = vusd_erc20.balance_of(user_address);

    // Test forward and reverse calculations
    let original_wbtc = WBTC_AMOUNT_LARGE;
    let calculated_vusd_from_wbtc = vault.calculate_vusd_from_wbtc(original_wbtc);
    let calculated_wbtc_from_vusd = vault.calculate_wbtc_from_vusd(minted_vusd);

    // The minted vUSD should match the calculation from WBTC
    assert!(
        minted_vusd == calculated_vusd_from_wbtc, "Minted vUSD should match forward calculation",
    );

    // The reverse calculation should be close to original (allowing for rounding)
    let wbtc_diff = if calculated_wbtc_from_vusd > original_wbtc {
        calculated_wbtc_from_vusd - original_wbtc
    } else {
        original_wbtc - calculated_wbtc_from_vusd
    };
    let max_diff = original_wbtc / 1000; // 0.1% tolerance for reverse calculation
    assert!(wbtc_diff <= max_diff, "Reverse calculation should be close to original WBTC");

    // Now perform actual withdrawal and verify
    start_cheat_caller_address(vusd_address, user_address);
    vusd_erc20.approve(vault_address, minted_vusd);
    stop_cheat_caller_address(vusd_address);

    start_cheat_caller_address(vault_address, user_address);
    vault.burn_vusd_withdraw_wbtc(minted_vusd);
    stop_cheat_caller_address(vault_address);

    let final_wbtc = wbtc_erc20.balance_of(user_address);

    // The actual withdrawn WBTC should match the reverse calculation
    let actual_diff = if final_wbtc > calculated_wbtc_from_vusd {
        final_wbtc - calculated_wbtc_from_vusd
    } else {
        calculated_wbtc_from_vusd - final_wbtc
    };
    let calc_tolerance = calculated_wbtc_from_vusd / 1000; // 0.1% tolerance
    assert!(actual_diff <= calc_tolerance, "Actual withdrawal should match reverse calculation");
}
