use contracts::MockWBTC::{IMockWBTCDispatcher, IMockWBTCDispatcherTrait};
use contracts::VoltaVault::{IVoltaVaultDispatcher, IVoltaVaultDispatcherTrait};
use contracts::vUSD::{IvUSDDispatcher, IvUSDDispatcherTrait};
use openzeppelin_token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
use snforge_std::{
    ContractClassTrait, DeclareResultTrait, declare, start_cheat_caller_address,
    stop_cheat_caller_address,
};
use starknet::contract_address_const;

// Test constants
const OWNER: felt252 = 0x12345;
const USER: felt252 = 0x67890;
const BTC_PRICE: felt252 = 67891000; // $67,891.000 with 3 decimals
const WBTC_AMOUNT: u256 = 100000000; // 1 WBTC (8 decimals)

#[test]
fn test_vusd_minting_and_burning() {
    let owner_address = contract_address_const::<OWNER>();
    let user_address = contract_address_const::<USER>();

    // Deploy vUSD
    let vusd_class = declare("vUSD").unwrap().contract_class();
    let (vusd_address, _) = vusd_class
        .deploy(@array![owner_address.into(), owner_address.into()])
        .unwrap();

    // Get dispatchers
    let vusd = IvUSDDispatcher { contract_address: vusd_address };
    let vusd_erc20 = IERC20Dispatcher { contract_address: vusd_address };

    // Test initial state
    let initial_balance = vusd_erc20.balance_of(user_address);
    assert!(initial_balance == 0, "User should have 0 vUSD initially");

    let initial_supply = vusd_erc20.total_supply();
    assert!(initial_supply == 0, "Total supply should be 0 initially");

    // Test minting (as owner/minter)
    let mint_amount = 1000_000000000000000000; // 1000 vUSD
    start_cheat_caller_address(vusd_address, owner_address);
    vusd.mint(user_address, mint_amount);
    stop_cheat_caller_address(vusd_address);

    // Verify minting
    let balance_after_mint = vusd_erc20.balance_of(user_address);
    assert!(balance_after_mint == mint_amount, "User should have minted vUSD");

    let supply_after_mint = vusd_erc20.total_supply();
    assert!(supply_after_mint == mint_amount, "Total supply should increase");

    // Test burning (as owner/minter)
    let burn_amount = 500_000000000000000000; // 500 vUSD
    start_cheat_caller_address(vusd_address, owner_address);
    vusd.burn(user_address, burn_amount);
    stop_cheat_caller_address(vusd_address);

    // Verify burning
    let balance_after_burn = vusd_erc20.balance_of(user_address);
    assert!(balance_after_burn == mint_amount - burn_amount, "User balance should decrease");

    let supply_after_burn = vusd_erc20.total_supply();
    assert!(supply_after_burn == mint_amount - burn_amount, "Total supply should decrease");
}

#[test]
fn test_wbtc_minting() {
    let user_address = contract_address_const::<USER>();

    // Deploy MockWBTC
    let wbtc_class = declare("MockWBTC").unwrap().contract_class();
    let (wbtc_address, _) = wbtc_class.deploy(@array![]).unwrap();

    // Get dispatchers
    let wbtc = IMockWBTCDispatcher { contract_address: wbtc_address };
    let wbtc_erc20 = IERC20Dispatcher { contract_address: wbtc_address };

    // Test initial state
    let initial_balance = wbtc_erc20.balance_of(user_address);
    assert!(initial_balance == 0, "User should have 0 WBTC initially");

    // Test minting WBTC
    wbtc.mint(user_address, WBTC_AMOUNT);

    // Verify minting
    let balance_after_mint = wbtc_erc20.balance_of(user_address);
    assert!(balance_after_mint == WBTC_AMOUNT, "User should have minted WBTC");

    let total_supply = wbtc_erc20.total_supply();
    assert!(total_supply == WBTC_AMOUNT, "Total WBTC supply should increase");
}

#[test]
fn test_vault_collateral_calculations() {
    let owner_address = contract_address_const::<OWNER>();

    // Deploy MockOracle
    let oracle_class = declare("MockOracle").unwrap().contract_class();
    let (oracle_address, _) = oracle_class.deploy(@array![BTC_PRICE]).unwrap();

    // Deploy vUSD
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

    // Get vault dispatcher
    let vault = IVoltaVaultDispatcher { contract_address: vault_address };

    // Test price retrieval
    let btc_price = vault.get_btc_price();
    assert!(btc_price == BTC_PRICE.into(), "Vault should get correct BTC price");

    // Test collateral ratio
    let collateral_ratio = vault.get_collateral_ratio();
    assert!(collateral_ratio == 1500, "Collateral ratio should be 150%");

    // Test max vUSD calculation for WBTC amount
    let max_vusd = vault.calculate_max_vusd_mint(WBTC_AMOUNT);

    // The calculation in the contract is:
    // numerator = wbtc_amount * btc_price * 1000000000000000000 (18 decimals for vUSD)
    // denominator = collateral_ratio * 100000000 (8 decimals for WBTC)
    // result = numerator / denominator
    let numerator = WBTC_AMOUNT * BTC_PRICE.into() * 1000000000000000000_u256;
    let denominator = 1500_u256 * 100000000_u256;
    let expected_max_vusd = numerator / denominator;

    assert!(max_vusd == expected_max_vusd, "Max vUSD calculation should be correct");

    // Test vUSD calculation from WBTC
    let vusd_from_wbtc = vault.calculate_vusd_from_wbtc(WBTC_AMOUNT);
    assert!(vusd_from_wbtc == expected_max_vusd, "vUSD from WBTC should match max calculation");

    // Test WBTC calculation from vUSD (reverse) - may have minor precision loss
    let wbtc_from_vusd = vault.calculate_wbtc_from_vusd(expected_max_vusd);
    // Due to integer division, we allow small difference (less than 1% difference)
    let diff = if wbtc_from_vusd > WBTC_AMOUNT {
        wbtc_from_vusd - WBTC_AMOUNT
    } else {
        WBTC_AMOUNT - wbtc_from_vusd
    };
    let max_allowed_diff = WBTC_AMOUNT / 100; // 1% tolerance
    assert!(diff <= max_allowed_diff, "WBTC from vUSD should be approximately reversible");
}

#[test]
fn test_vault_initial_state() {
    let owner_address = contract_address_const::<OWNER>();
    let user_address = contract_address_const::<USER>();

    // Deploy MockOracle
    let oracle_class = declare("MockOracle").unwrap().contract_class();
    let (oracle_address, _) = oracle_class.deploy(@array![BTC_PRICE]).unwrap();

    // Deploy vUSD
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

    // Get vault dispatcher
    let vault = IVoltaVaultDispatcher { contract_address: vault_address };

    // Test initial totals
    let total_wbtc = vault.get_total_wbtc_locked();
    assert!(total_wbtc == 0, "Initially no WBTC should be locked");

    let total_vusd = vault.get_total_vusd_issued();
    assert!(total_vusd == 0, "Initially no vUSD should be issued");

    // Test initial user collateral
    let user_collateral = vault.get_user_collateral(user_address);
    assert!(user_collateral == 0, "User should have no collateral initially");

    // Test pause state
    let is_paused = vault.is_paused();
    assert!(is_paused == false, "Vault should not be paused initially");
}
