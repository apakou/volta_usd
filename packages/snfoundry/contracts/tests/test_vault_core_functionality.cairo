use starknet::{ContractAddress, contract_address_const};
use snforge_std::{declare, ContractClassTrait, DeclareResultTrait, start_cheat_caller_address, stop_cheat_caller_address};
use contracts::VoltaVault::{IVoltaVaultDispatcher, IVoltaVaultDispatcherTrait};
use contracts::MockWBTC::{IMockWBTCDispatcher, IMockWBTCDispatcherTrait};
use contracts::vUSD::{IvUSDDispatcher, IvUSDDispatcherTrait};
use openzeppelin_token::erc20::{interface::{IERC20Dispatcher, IERC20DispatcherTrait}};

// Test constants
const OWNER: felt252 = 0x12345;
const USER: felt252 = 0x67890;
const USER2: felt252 = 0x111111;
const BTC_PRICE: felt252 = 67891000;  // $67,891.000 with 3 decimals
const WBTC_AMOUNT_LARGE: u256 = 100000000;  // 1 WBTC (8 decimals)
const WBTC_AMOUNT_SMALL: u256 = 50000000;   // 0.5 WBTC (8 decimals)

// Helper function to deploy full system for core functionality tests
fn deploy_core_test_system() -> (ContractAddress, ContractAddress, ContractAddress, ContractAddress) {
    let owner_address = contract_address_const::<OWNER>();
    
    // Deploy MockOracle
    let oracle_class = declare("MockOracle").unwrap().contract_class();
    let (oracle_address, _) = oracle_class.deploy(@array![BTC_PRICE]).unwrap();
    
    // Deploy MockWBTC
    let wbtc_class = declare("MockWBTC").unwrap().contract_class();
    let (wbtc_address, _) = wbtc_class.deploy(@array![]).unwrap();
    
    // Deploy vUSD
    let vusd_class = declare("vUSD").unwrap().contract_class();
    let (vusd_address, _) = vusd_class.deploy(@array![owner_address.into(), owner_address.into()]).unwrap();
    
    // Deploy VoltaVault
    let vault_class = declare("VoltaVault").unwrap().contract_class();
    let (vault_address, _) = vault_class.deploy(@array![
        owner_address.into(),
        vusd_address.into(), 
        wbtc_address.into(),
        oracle_address.into()
    ]).unwrap();
    
    // Set vault as minter for vUSD
    let vusd = IvUSDDispatcher { contract_address: vusd_address };
    start_cheat_caller_address(vusd_address, owner_address);
    vusd.set_minter(vault_address);
    stop_cheat_caller_address(vusd_address);
    
    (vault_address, vusd_address, wbtc_address, oracle_address)
}

// Helper to setup user with WBTC and approve vault
fn setup_user_wbtc_and_approve(wbtc_address: ContractAddress, user_address: ContractAddress, vault_address: ContractAddress, amount: u256) {
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
    assert!(collateral_after_first == WBTC_AMOUNT_SMALL, "First deposit should record correct collateral");
    
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
    assert!(vusd_after_second == expected_vusd_first + expected_vusd_second, "Total vUSD should be sum of deposits");
    assert!(wbtc_locked_after_second == WBTC_AMOUNT_SMALL + WBTC_AMOUNT_SMALL, "Total WBTC should be sum of deposits");
    assert!(collateral_after_second == WBTC_AMOUNT_SMALL + WBTC_AMOUNT_SMALL, "Total collateral should be sum of deposits");
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
    assert!(vault_wbtc_final == WBTC_AMOUNT_LARGE + WBTC_AMOUNT_SMALL, "Vault should hold both users' WBTC");
    assert!(vault_vusd_final == expected_vusd_user1 + expected_vusd_user2, "Vault should track total vUSD issued");
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
    assert!(vault_wbtc_balance == vault_total_locked, "Vault actual WBTC balance should match recorded amount");
    
    // Check that user collateral matches what was deposited
    let user_collateral = vault.get_user_collateral(user_address);
    assert!(user_collateral == WBTC_AMOUNT_LARGE, "User collateral should match deposit amount");
    
    // Check that total vUSD issued equals user's vUSD balance (single user case)
    let user_vusd_balance = vusd_erc20.balance_of(user_address);
    let vault_vusd_issued = vault.get_total_vusd_issued();
    assert!(user_vusd_balance == vault_vusd_issued, "User vUSD balance should match vault's issued amount");
    
    // Check that vault has no vUSD (it only issues, doesn't hold)
    let vault_vusd_balance = vusd_erc20.balance_of(vault_address);
    assert!(vault_vusd_balance == 0, "Vault should not hold vUSD tokens");
    
    // Verify calculation consistency
    let expected_vusd = vault.calculate_vusd_from_wbtc(WBTC_AMOUNT_LARGE);
    assert!(user_vusd_balance == expected_vusd, "Actual vUSD minted should match calculation");
}