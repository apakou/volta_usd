use snforge_std::{declare, ContractClassTrait, DeclareResultTrait};
use contracts::vUSD::{IvUSDDispatcher, IvUSDDispatcherTrait};
use openzeppelin_token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
use starknet::{ContractAddress, contract_address_const};

fn OWNER() -> ContractAddress {
    contract_address_const::<'OWNER'>()
}

fn MINTER() -> ContractAddress {
    contract_address_const::<'MINTER'>()
}

fn RECIPIENT() -> ContractAddress {
    contract_address_const::<'RECIPIENT'>()
}

fn deploy_vusd_contract(owner: ContractAddress, minter: ContractAddress) -> ContractAddress {
    let contract = declare("vUSD").unwrap().contract_class();
    let (contract_address, _) = contract.deploy(@array![owner.into(), minter.into()]).unwrap();
    contract_address
}

#[test]
fn test_deployment_success() {
    let contract_address = deploy_vusd_contract(OWNER(), MINTER());
    assert(contract_address.into() != 0, 'Contract not deployed');
}

#[test]
fn test_deployment_erc20_metadata() {
    let contract_address = deploy_vusd_contract(OWNER(), MINTER());
    let erc20_dispatcher = IERC20Dispatcher { contract_address };
    
    let total_supply = erc20_dispatcher.total_supply();
    assert(total_supply == 0, 'Initial supply should be 0');
    
    let balance = erc20_dispatcher.balance_of(OWNER());
    assert(balance == 0, 'Owner balance should be 0');
}

#[test]
fn test_deployment_initial_state() {
    let contract_address = deploy_vusd_contract(OWNER(), MINTER());
    let erc20_dispatcher = IERC20Dispatcher { contract_address };
    
    let total_supply = erc20_dispatcher.total_supply();
    assert(total_supply == 0, 'Initial supply should be 0');
    
    let owner_balance = erc20_dispatcher.balance_of(OWNER());
    assert(owner_balance == 0, 'Owner balance should be 0');
}

#[test]
fn test_deployment_minter_setup() {
    let contract_address = deploy_vusd_contract(OWNER(), MINTER());
    let vusd_dispatcher = IvUSDDispatcher { contract_address };
    
    let configured_minter = vusd_dispatcher.get_minter();
    assert(configured_minter == MINTER(), 'Minter not set correctly');
}

#[test]
fn test_deployment_with_different_addresses() {
    let alt_owner = RECIPIENT();
    let alt_minter = contract_address_const::<'ALT_MINTER'>();
    
    let contract_address = deploy_vusd_contract(alt_owner, alt_minter);
    let vusd_dispatcher = IvUSDDispatcher { contract_address };
    
    let configured_minter = vusd_dispatcher.get_minter();
    assert(configured_minter == alt_minter, 'Alt minter not set correctly');
}

#[test]
fn test_deployment_interface_functionality() {
    let contract_address = deploy_vusd_contract(OWNER(), MINTER());
    let erc20_dispatcher = IERC20Dispatcher { contract_address };
    let vusd_dispatcher = IvUSDDispatcher { contract_address };
    
    let minter = vusd_dispatcher.get_minter();
    assert(minter == MINTER(), 'vUSD interface failed');
    
    let total_supply = erc20_dispatcher.total_supply();
    assert(total_supply == 0, 'ERC20 interface failed');
    
    assert(contract_address.into() != 0, 'Contract should be deployed');
}