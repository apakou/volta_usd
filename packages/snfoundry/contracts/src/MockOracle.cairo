#[starknet::interface]
pub trait IMockOracle<TContractState> {
    fn get_data_median(self: @TContractState, data_type: felt252) -> u256;
    fn set_btc_price(ref self: TContractState, price: u256);
}

#[starknet::contract]
pub mod MockOracle {
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};
    use super::IMockOracle;

    #[storage]
    struct Storage {
        btc_price: u256,
    }

    #[constructor]
    fn constructor(ref self: ContractState, initial_btc_price: felt252) {
        self.btc_price.write(initial_btc_price.into());
    }

    #[abi(embed_v0)]
    impl MockOracleImpl of IMockOracle<ContractState> {
        fn get_data_median(self: @ContractState, data_type: felt252) -> u256 {
            // For testing, we'll ignore the data_type and just return BTC price
            self.btc_price.read()
        }

        fn set_btc_price(ref self: ContractState, price: u256) {
            self.btc_price.write(price);
        }
    }
}
