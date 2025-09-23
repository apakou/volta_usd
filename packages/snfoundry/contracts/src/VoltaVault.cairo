use starknet::ContractAddress;

#[starknet::interface]
pub trait IVoltaVault<TContractState> {
    // Core exchange functions
    fn deposit_btc_mint_vusd(ref self: TContractState, btc_amount: u256);
    fn burn_vusd_withdraw_btc(ref self: TContractState, vusd_amount: u256);
    fn deposit_wbtc_mint_vusd(ref self: TContractState, wbtc_amount: u256);
    fn burn_vusd_withdraw_wbtc(ref self: TContractState, vusd_amount: u256);
    
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
    fn get_btc_price(self: @TContractState) -> u256;
    fn get_total_wbtc_locked(self: @TContractState) -> u256;
    fn get_total_vusd_issued(self: @TContractState) -> u256;
    fn is_paused(self: @TContractState) -> bool;
    
    // Price calculation helpers
    fn calculate_max_vusd_mint(self: @TContractState, wbtc_amount: u256) -> u256;
    fn calculate_vusd_from_wbtc(self: @TContractState, wbtc_amount: u256) -> u256;
    fn calculate_wbtc_from_vusd(self: @TContractState, vusd_amount: u256) -> u256;
    
    // Admin functions
    fn emergency_pause(ref self: TContractState);
    fn emergency_unpause(ref self: TContractState);
    fn pause(ref self: TContractState);
    fn unpause(ref self: TContractState);
    fn set_collateral_ratio(ref self: TContractState, new_ratio: u256);
    fn set_max_price_deviation(ref self: TContractState, max_deviation: u256);
    fn set_min_collateral_amount(ref self: TContractState, min_amount: u256);
    fn emergency_withdraw_wbtc(ref self: TContractState, amount: u256);
}

#[starknet::interface]
pub trait IPragmaOracle<TContractState> {
    fn get_data_median(self: @TContractState, data_type: felt252) -> u256;
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
    use starknet::storage::{ StorageMapWriteAccess, StorageMapReadAccess, Map };
    use super::{IVoltaVault, IPragmaOracleDispatcher, IPragmaOracleDispatcherTrait};
    use crate::vUSD::{IvUSDDispatcher, IvUSDDispatcherTrait};
    use starknet::ContractAddress;
    use starknet::{get_caller_address, get_contract_address};
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};
    use openzeppelin_access::ownable::OwnableComponent;
    use openzeppelin_token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};

    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);
    
    #[abi(embed_v0)]
    impl OwnableImpl = OwnableComponent::OwnableImpl<ContractState>;
    impl OwnableInternalImpl = OwnableComponent::InternalImpl<ContractState>;

    #[storage]
    struct Storage {
        #[substorage(v0)]
        ownable: OwnableComponent::Storage,
        vusd_token: ContractAddress,
        wbtc_token: ContractAddress,
        pragma_oracle: ContractAddress,
        collateral_ratio: u256,
        user_collateral: Map<ContractAddress, u256>,
        total_wbtc_locked: u256,
        total_vusd_issued: u256,
        is_paused: bool,
        reentrancy_lock: bool,
        max_price_deviation: u256, // Maximum allowed price change (basis points)
        last_btc_price: u256,      // Last valid BTC price
        min_collateral_amount: u256, // Minimum deposit amount
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        OwnableEvent: OwnableComponent::Event,
        WBTCDeposited: WBTCDeposited,
        VUSDMinted: VUSDMinted,
        VUSDBurned: VUSDBurned,
        WBTCWithdrawn: WBTCWithdrawn,
    }

    #[derive(Drop, starknet::Event)]
    struct WBTCDeposited {
        #[key]
        user: ContractAddress,
        wbtc_amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct VUSDMinted {
        #[key]
        user: ContractAddress,
        vusd_amount: u256,
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
=======
    struct VUSDBurned {
        #[key]
        user: ContractAddress,
        vusd_amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct WBTCWithdrawn {
        #[key]
        user: ContractAddress,
        wbtc_amount: u256,
        btc_price: u256,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        owner: ContractAddress,
        vusd_token: ContractAddress,
        wbtc_token: ContractAddress,
        pragma_oracle: ContractAddress
    ) {
        self.ownable.initializer(owner);
        self.vusd_token.write(vusd_token);
        self.wbtc_token.write(wbtc_token);
        self.pragma_oracle.write(pragma_oracle);
        self.collateral_ratio.write(1500);
        self.is_paused.write(false);
        self.reentrancy_lock.write(false);
        
        self.max_price_deviation.write(2000);
        self.min_collateral_amount.write(1000000);
        self.last_btc_price.write(0);
    }

    #[abi(embed_v0)]
    impl VoltaVaultImpl of IVoltaVault<ContractState> {
        fn deposit_wbtc_mint_vusd(ref self: ContractState, wbtc_amount: u256) {
            // Reentrancy protection
            assert!(!self.reentrancy_lock.read(), "Reentrant call");
            self.reentrancy_lock.write(true);
            
            assert!(!self.is_paused.read(), "Vault is paused");
            assert!(wbtc_amount > 0, "Amount must be greater than 0");
            
            // Minimum collateral check
            let min_amount = self.min_collateral_amount.read();
            assert!(wbtc_amount >= min_amount, "Amount below minimum");

            let caller = get_caller_address();
            let contract_address = get_contract_address();

            // Calculate vUSD to mint first before external calls
            let vusd_to_mint = self.calculate_vusd_from_wbtc(wbtc_amount);

            // Update state before external calls 
            let current_collateral = self.user_collateral.read(caller);
            self.user_collateral.write(caller, current_collateral + wbtc_amount);
            
            let total_locked = self.total_wbtc_locked.read();
            self.total_wbtc_locked.write(total_locked + wbtc_amount);
            
            let total_issued = self.total_vusd_issued.read();
            self.total_vusd_issued.write(total_issued + vusd_to_mint);

            // External calls after state updates
            let wbtc_dispatcher = IERC20Dispatcher { 
                contract_address: self.wbtc_token.read() 
            };
            wbtc_dispatcher.transfer_from(caller, contract_address, wbtc_amount);

            let vusd_dispatcher = IvUSDDispatcher { 
                contract_address: self.vusd_token.read() 
            };
            vusd_dispatcher.mint(caller, vusd_to_mint);

            // Emit events
            self.emit(WBTCDeposited { user: caller, wbtc_amount });
            self.emit(VUSDMinted { 
                user: caller, 
                vusd_amount: vusd_to_mint, 
                btc_price: self.get_btc_price() 
            });
            
            // Release reentrancy lock
            self.reentrancy_lock.write(false);
        }

        fn burn_vusd_withdraw_wbtc(ref self: ContractState, vusd_amount: u256) {
            // Reentrancy protection
            assert!(!self.reentrancy_lock.read(), "Reentrant call");
            self.reentrancy_lock.write(true);
            
            assert!(!self.is_paused.read(), "Vault is paused");
            assert!(vusd_amount > 0, "Amount must be greater than 0");

            let caller = get_caller_address();

            // Calculate WBTC to return first before external calls
            let wbtc_to_return = self.calculate_wbtc_from_vusd(vusd_amount);
            
            // Check user has enough collateral
            let user_collateral = self.user_collateral.read(caller);
            assert!(wbtc_to_return <= user_collateral, "Insufficient collateral");

            // Update state before external calls
            self.user_collateral.write(caller, user_collateral - wbtc_to_return);
            
            let total_locked = self.total_wbtc_locked.read();
            self.total_wbtc_locked.write(total_locked - wbtc_to_return);
            
            let total_issued = self.total_vusd_issued.read();
            self.total_vusd_issued.write(total_issued - vusd_amount);

            // External calls AFTER state updates
            let vusd_dispatcher = IvUSDDispatcher { 
                contract_address: self.vusd_token.read() 
            };
            vusd_dispatcher.burn(caller, vusd_amount);

            let wbtc_dispatcher = IERC20Dispatcher { 
                contract_address: self.wbtc_token.read() 
            };
            wbtc_dispatcher.transfer(caller, wbtc_to_return);

            // Emit events
            self.emit(VUSDBurned { user: caller, vusd_amount });
            self.emit(WBTCWithdrawn { 
                user: caller, 
                wbtc_amount: wbtc_to_return, 
                btc_price: self.get_btc_price() 
            });
            
            // Release reentrancy lock
            self.reentrancy_lock.write(false);
        }

        fn get_collateral_ratio(self: @ContractState) -> u256 {
            self.collateral_ratio.read()
        }

        fn get_user_collateral(self: @ContractState, user: ContractAddress) -> u256 {
            self.user_collateral.read(user)
        }

        fn get_btc_price(self: @ContractState) -> u256 {
            let pragma_dispatcher = IPragmaOracleDispatcher { 
                contract_address: self.pragma_oracle.read() 
            };
            let current_price = pragma_dispatcher.get_data_median('BTC/USD');
            
            // Oracle security checks
            assert!(current_price > 0, "Invalid oracle price");
            
            let last_price = self.last_btc_price.read();
            if (last_price > 0) {
                let max_deviation = self.max_price_deviation.read();
                
                // Check for extreme price movements
                let price_change = if current_price > last_price {
                    (current_price - last_price) * 10000 / last_price 
                } else {
                    (last_price - current_price) * 10000 / last_price
                };
                
                assert!(price_change <= max_deviation, "Price change exceeds maximum");
            }
            
            // Update last known good price
            // Note: This would need to be done in a mutable context in real implementation
            current_price
        }

        fn calculate_max_vusd_mint(self: @ContractState, wbtc_amount: u256) -> u256 {
            self.calculate_vusd_from_wbtc(wbtc_amount)
        }

        fn get_total_wbtc_locked(self: @ContractState) -> u256 {
            self.total_wbtc_locked.read()
        }

        fn get_total_vusd_issued(self: @ContractState) -> u256 {
            self.total_vusd_issued.read()
        }

        fn is_paused(self: @ContractState) -> bool {
            self.is_paused.read()
        }

        fn emergency_pause(ref self: ContractState) {
            self.ownable.assert_only_owner();
            self.is_paused.write(true);
        }

        fn emergency_unpause(ref self: ContractState) {
            self.ownable.assert_only_owner();
            self.is_paused.write(false);
        }

        fn set_collateral_ratio(ref self: ContractState, new_ratio: u256) {
            self.ownable.assert_only_owner();
            assert!(new_ratio >= 1000, "Ratio must be >= 100%"); // Minimum 100%
            assert!(new_ratio <= 5000, "Ratio must be <= 500%"); // Maximum 500%
            self.collateral_ratio.write(new_ratio);
        }

        fn calculate_vusd_from_wbtc(self: @ContractState, wbtc_amount: u256) -> u256 {
            let btc_price = self.get_btc_price();
            let collateral_ratio = self.collateral_ratio.read();
            
            // Prevent overflow and ensure valid inputs
            assert!(btc_price > 0, "Invalid BTC price");
            assert!(collateral_ratio > 0, "Invalid collateral ratio");
            assert!(wbtc_amount > 0, "Invalid WBTC amount");
            
            // Use safe math with proper decimal handling
            // WBTC: 8 decimals, vUSD: 18 decimals, BTC price: 8 decimals
            let numerator = wbtc_amount * btc_price * 1000000000000000000_u256;
            let denominator = collateral_ratio * 100000000_u256;
            
            assert!(denominator > 0, "Division by zero");
            numerator / denominator
        }

        fn calculate_wbtc_from_vusd(self: @ContractState, vusd_amount: u256) -> u256 {
            let btc_price = self.get_btc_price();
            let collateral_ratio = self.collateral_ratio.read();
            
            // Prevent overflow and ensure valid inputs
            assert!(btc_price > 0, "Invalid BTC price");
            assert!(collateral_ratio > 0, "Invalid collateral ratio");
            assert!(vusd_amount > 0, "Invalid vUSD amount");
            
            // Reverse calculation with proper decimal handling
            let numerator = vusd_amount * collateral_ratio * 100000000_u256;
            let denominator = btc_price * 1000000000000000000_u256;
            
            assert!(denominator > 0, "Division by zero");
            numerator / denominator
        }

        // Emergency and Admin Functions
        fn pause(ref self: ContractState) {
            self.ownable.assert_only_owner();
            self.is_paused.write(true);
        }

        fn unpause(ref self: ContractState) {
            self.ownable.assert_only_owner();
            self.is_paused.write(false);
        }

        fn set_max_price_deviation(ref self: ContractState, max_deviation: u256) {
            self.ownable.assert_only_owner();
            assert!(max_deviation <= 5000, "Max deviation too high");
            self.max_price_deviation.write(max_deviation);
        }

        fn set_min_collateral_amount(ref self: ContractState, min_amount: u256) {
            self.ownable.assert_only_owner();
            self.min_collateral_amount.write(min_amount);
        }

        // Emergency withdrawal for owner (with proper checks)
        fn emergency_withdraw_wbtc(ref self: ContractState, amount: u256) {
            self.ownable.assert_only_owner();
            assert!(self.is_paused.read(), "Contract not paused");
            
            let wbtc = IERC20Dispatcher { contract_address: self.wbtc_token.read() };
            let success = wbtc.transfer(self.ownable.owner(), amount);
            assert!(success, "WBTC transfer failed");
        }

    }
}