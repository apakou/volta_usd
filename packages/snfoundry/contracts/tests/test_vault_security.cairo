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
const BTC_PRICE: felt252 = 67891000; // $67,891.000 with 3 decimals

// Helper function to deploy full system for security tests
fn deploy_security_test_system() -> (
    ContractAddress, ContractAddress, ContractAddress, ContractAddress,
) {
    let owner_address = contract_address_const::<OWNER>();

    // Deploy MockOracle
    let oracle_class = declare("MockOracle").unwrap().contract_class();
    let (oracle_address, _) = oracle_class.deploy(@array![BTC_PRICE]).unwrap();

    // Deploy vUSD with owner as minter initially
    let vusd_class = declare("vUSD").unwrap().contract_class();
    let (vusd_address, _) = vusd_class
        .deploy(@array![owner_address.into(), owner_address.into()])
        .unwrap();

    // Deploy MockWBTC
    let wbtc_class = declare("MockWBTC").unwrap().contract_class();
    let (wbtc_address, _) = wbtc_class.deploy(@array![]).unwrap();

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

    (vault_address, vusd_address, wbtc_address, oracle_address)
}

#[test]
fn test_vusd_minter_management() {
    let (_vault_address, vusd_address, _wbtc_address, _oracle_address) =
        deploy_security_test_system();
    let owner_address = contract_address_const::<OWNER>();
    let user_address = contract_address_const::<USER>();

    let vusd = IvUSDDispatcher { contract_address: vusd_address };

    // Check initial minter
    let initial_minter = vusd.get_minter();
    assert!(initial_minter == owner_address, "Owner should be initial minter");

    // Change minter as owner
    start_cheat_caller_address(vusd_address, owner_address);
    vusd.set_minter(user_address);
    stop_cheat_caller_address(vusd_address);

    // Verify minter changed
    let new_minter = vusd.get_minter();
    assert!(new_minter == user_address, "Minter should be updated");

    // Test that new minter can mint
    start_cheat_caller_address(vusd_address, user_address);
    vusd.mint(user_address, 1000_000000000000000000);
    stop_cheat_caller_address(vusd_address);

    let vusd_erc20 = IERC20Dispatcher { contract_address: vusd_address };
    let balance = vusd_erc20.balance_of(user_address);
    assert!(balance == 1000_000000000000000000, "New minter should be able to mint");
}

#[test]
fn test_vault_pause_functionality() {
    let (vault_address, _vusd_address, _wbtc_address, _oracle_address) =
        deploy_security_test_system();
    let owner_address = contract_address_const::<OWNER>();

    let vault = IVoltaVaultDispatcher { contract_address: vault_address };

    // Initial state should be unpaused
    let initial_paused = vault.is_paused();
    assert!(initial_paused == false, "Vault should be unpaused initially");

    // Pause as owner
    start_cheat_caller_address(vault_address, owner_address);
    vault.pause();

    // Check paused state
    let paused_state = vault.is_paused();
    assert!(paused_state == true, "Vault should be paused after pause()");

    // Unpause as owner
    vault.unpause();

    // Check unpaused state
    let unpaused_state = vault.is_paused();
    assert!(unpaused_state == false, "Vault should be unpaused after unpause()");

    stop_cheat_caller_address(vault_address);
}

#[test]
fn test_vault_admin_functions_work_for_owner() {
    let (vault_address, _vusd_address, _wbtc_address, _oracle_address) =
        deploy_security_test_system();
    let owner_address = contract_address_const::<OWNER>();

    let vault = IVoltaVaultDispatcher { contract_address: vault_address };

    start_cheat_caller_address(vault_address, owner_address);

    // Test setting collateral ratio
    let initial_ratio = vault.get_collateral_ratio();
    assert!(initial_ratio == 1500, "Initial collateral ratio should be 1500");

    vault.set_collateral_ratio(2000);
    let new_ratio = vault.get_collateral_ratio();
    assert!(new_ratio == 2000, "Collateral ratio should be updated");

    // Test setting max price deviation
    vault.set_max_price_deviation(1000);

    // Test setting min collateral amount
    vault.set_min_collateral_amount(5000000);

    stop_cheat_caller_address(vault_address);
}

#[test]
fn test_vault_emergency_functions() {
    let (vault_address, _vusd_address, _wbtc_address, _oracle_address) =
        deploy_security_test_system();
    let owner_address = contract_address_const::<OWNER>();

    let vault = IVoltaVaultDispatcher { contract_address: vault_address };

    start_cheat_caller_address(vault_address, owner_address);

    // Test emergency pause
    vault.emergency_pause();
    let paused_state = vault.is_paused();
    assert!(paused_state == true, "Vault should be paused after emergency_pause()");

    // Test emergency unpause
    vault.emergency_unpause();
    let unpaused_state = vault.is_paused();
    assert!(unpaused_state == false, "Vault should be unpaused after emergency_unpause()");

    stop_cheat_caller_address(vault_address);
}

#[test]
fn test_vusd_minting_permissions() {
    let (_vault_address, vusd_address, _wbtc_address, _oracle_address) =
        deploy_security_test_system();
    let owner_address = contract_address_const::<OWNER>();
    let user_address = contract_address_const::<USER>();

    let vusd = IvUSDDispatcher { contract_address: vusd_address };
    let vusd_erc20 = IERC20Dispatcher { contract_address: vusd_address };

    // Test that only minter can mint
    start_cheat_caller_address(vusd_address, owner_address);
    vusd.mint(user_address, 1000_000000000000000000);
    stop_cheat_caller_address(vusd_address);

    let balance = vusd_erc20.balance_of(user_address);
    assert!(balance == 1000_000000000000000000, "Minter should be able to mint");

    // Test that minter can burn
    start_cheat_caller_address(vusd_address, owner_address);
    vusd.burn(user_address, 500_000000000000000000);
    stop_cheat_caller_address(vusd_address);

    let balance_after_burn = vusd_erc20.balance_of(user_address);
    assert!(balance_after_burn == 500_000000000000000000, "Minter should be able to burn");
}
