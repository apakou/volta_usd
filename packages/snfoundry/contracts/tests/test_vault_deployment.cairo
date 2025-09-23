use starknet::contract_address_const;
use snforge_std::{declare, ContractClassTrait, DeclareResultTrait};
use contracts::MockOracle::{IMockOracleDispatcher, IMockOracleDispatcherTrait};
use contracts::VoltaVault::{IVoltaVaultDispatcher, IVoltaVaultDispatcherTrait};
use contracts::MockWBTC::{IMockWBTCDispatcher, IMockWBTCDispatcherTrait};
use openzeppelin_token::erc20::{interface::{IERC20Dispatcher, IERC20DispatcherTrait}};

const OWNER: felt252 = 0x12345;
const BTC_PRICE: felt252 = 67891000;  // $67,891.000 with 3 decimals

#[test]
fn test_vault_deployment() {
    let owner_address = contract_address_const::<OWNER>();
    
    // Step 1: Deploy MockOracle
    let oracle_class = declare("MockOracle").unwrap().contract_class();
    let (oracle_address, _) = oracle_class.deploy(@array![BTC_PRICE]).unwrap();
    
    // Test oracle works
    let oracle = IMockOracleDispatcher { contract_address: oracle_address };
    let price = oracle.get_data_median('BTC/USD');
    assert!(price > 0, "Oracle should return a price");
    
        // Step 2: Deploy vUSD
    let vusd_class = declare("vUSD").unwrap().contract_class();
    let (vusd_address, _) = vusd_class.deploy(@array![owner_address.into(), owner_address.into()]).unwrap();
    
    // Test vUSD deployment using basic ERC20 interface
    let vusd_erc20 = IERC20Dispatcher { contract_address: vusd_address };
    let vusd_total_supply = vusd_erc20.total_supply();
    assert!(vusd_total_supply == 0, "vUSD initial total supply should be 0");
    
    // Step 3: Deploy MockWBTC
    let wbtc_class = declare("MockWBTC").unwrap().contract_class();
    let (wbtc_address, _) = wbtc_class.deploy(@array![]).unwrap();
    
    // Test WBTC deployment
    let wbtc_erc20 = IERC20Dispatcher { contract_address: wbtc_address };
    let wbtc_total_supply = wbtc_erc20.total_supply();
    assert!(wbtc_total_supply == 0, "WBTC initial total supply should be 0");
    
    // Step 4: Deploy VoltaVault
    let vault_class = declare("VoltaVault").unwrap().contract_class();
    let (vault_address, _) = vault_class.deploy(@array![
        owner_address.into(),
        vusd_address.into(), 
        wbtc_address.into(),
        oracle_address.into()
    ]).unwrap();
    
    // Test VoltaVault deployment
    let vault = IVoltaVaultDispatcher { contract_address: vault_address };
    let collateral_ratio = vault.get_collateral_ratio();
    assert!(collateral_ratio == 1500, "Vault collateral ratio should be 1500 (150%)");
    
    let is_paused = vault.is_paused();
    assert!(is_paused == false, "Vault should not be paused initially");
    
    let btc_price = vault.get_btc_price();
    assert!(btc_price == BTC_PRICE.into(), "Vault should get BTC price from oracle");
}