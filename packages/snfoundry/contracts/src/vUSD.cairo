use starknet::ContractAddress;

#[starknet::interface]
pub trait IvUSD<TContractState> {
    fn mint(ref self: TContractState, recipient: ContractAddress, amount: u256);
    fn burn(ref self: TContractState, account: ContractAddress, amount: u256);
    fn get_minter(self: @TContractState) -> ContractAddress;
    fn set_minter(ref self: TContractState, new_minter: ContractAddress);
}

#[starknet::contract]
pub mod vUSD {
    use OwnableComponent::InternalTrait;
    use super::IvUSD;
    use starknet::ContractAddress;
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};
    use openzeppelin_access::ownable::OwnableComponent;
    use openzeppelin_token::erc20::ERC20Component;

    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);
    component!(path: ERC20Component, storage: erc20, event: ERC20Event);

    #[abi(embed_v0)]
    impl ERC20Impl = ERC20Component::ERC20Impl<ContractState>;
    #[abi(embed_v0)]
    impl ERC20CamelOnlyImpl = ERC20Component::ERC20CamelOnlyImpl<ContractState>;
    #[abi(embed_v0)]
    impl OwnableImpl = OwnableComponent::OwnableImpl<ContractState>;
    impl InternalImpl = OwnableComponent::InternalImpl<ContractState>;
    impl ERC20InternalImpl = ERC20Component::InternalImpl<ContractState>;

    impl ERC20HooksImpl of ERC20Component::ERC20HooksTrait<ContractState> {
        fn before_update(
            ref self: ERC20Component::ComponentState<ContractState>,
            from: ContractAddress,
            recipient: ContractAddress,
            amount: u256
        ) {}

        fn after_update(
            ref self: ERC20Component::ComponentState<ContractState>,
            from: ContractAddress,
            recipient: ContractAddress,
            amount: u256
        ) {}
    }

    

    #[storage]
    struct Storage {
        #[substorage(v0)]
        erc20: ERC20Component::Storage,
        #[substorage(v0)]
        ownable: OwnableComponent::Storage,
        minter: ContractAddress,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        ERC20Event: ERC20Component::Event,
        #[flat]
        OwnableEvent: OwnableComponent::Event,
        MinterChanged: MinterChanged,
    }

    #[derive(Drop, starknet::Event)]
    struct MinterChanged {
        #[key]
        old_minter: ContractAddress,
        #[key]
        new_minter: ContractAddress,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        owner: ContractAddress,
        minter: ContractAddress
    ) {
        self.erc20.initializer("Volta USD", "vUSD");
        self.ownable.initializer(owner);
        self.minter.write(minter);
    }

    #[abi(embed_v0)]
    #[external(v0)]
    impl vUSDImpl of IvUSD<ContractState> {
        fn mint(ref self: ContractState, recipient: ContractAddress, amount: u256) {
            let caller = starknet::get_caller_address();
            assert!(caller == self.minter.read(), "Only the minter can mint vUSD");
            self.erc20.mint(recipient, amount);
        }

        fn burn(ref self: ContractState, account: ContractAddress, amount: u256) {
            let caller = starknet::get_caller_address();
            assert!(caller == self.minter.read(), "Only the minter can burn vUSD");
            self.erc20.burn(account, amount);
        }

        fn get_minter(self: @ContractState) -> ContractAddress {
            self.minter.read()
        }

        fn set_minter(ref self: ContractState, new_minter: ContractAddress) {
            self.ownable.assert_only_owner();
            let old_minter = self.minter.read();
            self.minter.write(new_minter);
            
            self.emit(MinterChanged { old_minter, new_minter });
        }
    }
}
