use starknet::ContractAddress;

#[starknet::interface]
pub trait IVoltaVault<TContractState> {
    // Core exchange functions
    fn deposit_btc_mint_vusd(ref self: TContractState, btc_amount: u256);
    fn burn_vusd_withdraw_btc(ref self: TContractState, vusd_amount: u256);
    
    // View functions
    fn get_collateral_ratio(self: @TContractState) -> u256;
    fn get_user_collateral(self: @TContractState, user: ContractAddress) -> u256;
    fn calculate_max_vusd_mint(self: @TContractState, btc_amount: u256) -> u256;
    
    // Admin functions
    fn set_collateral_ratio(ref self: TContractState, new_ratio: u256);
    fn emergency_pause(ref self: TContractState);
    fn liquidate_position(ref self: TContractState, user: ContractAddress);
}

#[starknet::interface]
trait IPriceOracle<TContractState> {
    fn get_btc_price(self: @TContractState) -> u256;
    fn get_last_update(self: @TContractState) -> u64; 
}

#[starknet::contract]
pub mod VoltaVault {
    use starknet::ContractAddress;
    use openzeppelin_access::ownable::OwnableComponent;
    use openzeppelin_security::reentrancyguard::ReentrancyGuardComponent;

    #[derive(Drop, starknet::Event)]
    struct BTCDeposited {
        user: ContractAddress,
        btc_amount: u256,
        vusd_minted: u256,
        btc_price: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct VUSDRedeemed {
        user: ContractAddress,
        vusd_burned: u256,
        btc_withdrawn: u256,
        btc_price: u256,
    }

    #[storage]
    struct Storage {
        vusd_token: ContractAddress,
        price_oracle: ContractAddress,
        total_btc_collateral: u256,
        total_vusd_issued: u256,
        collateral_ratio: u256,
        user_deposits: LegacyMap<ContractAddress, u256>,
    }
}