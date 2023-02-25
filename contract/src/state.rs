//! Defines the State (persisted data) for the contract.

#![cfg_attr(not(feature = "std"), no_std)]

use concordium_cis2::{TokenAmountU64, TokenIdVec};
use concordium_std::*;

use crate::errors::ExchangeError;

pub type ContractResult<A> = Result<A, ExchangeError>;

// The state for each address.
#[derive(Serial, Deserial, Clone)]
pub struct AddressState {
    /// The tokens owned by this address.
    pub balance: TokenAmountU64,
    /// The address is currently enabled as operators for this address.
    pub operator: AccountAddress,
}

/// Smart contract state.
#[derive(Serial, DeserialWithState, StateClone)]
#[concordium(state_parameter = "S")]
pub struct State<S: HasStateApi> {
    pub token_address: ContractAddress,
    pub token_id: TokenIdVec,

    pub liquidity_token: StateMap<AccountAddress, AddressState, S>,
    pub total_supply: u64,
}

impl<S: HasStateApi> State<S> {
    pub fn new(
        state_builder: &mut StateBuilder<S>,
        token_address: ContractAddress,
        token_id: TokenIdVec,
    ) -> Self {
        State {
            token_address,
            token_id,
            liquidity_token: state_builder.new_map(),
            total_supply: 0u64.into(),
        }
    }

    pub fn balance(&self, address: &AccountAddress) -> ContractResult<u64> {
        Ok(self
            .liquidity_token
            .get(address)
            .map(|s| s.balance)
            .unwrap_or_else(|| 0u64.into()).into())
    }

    /*fn transfer(
        &mut self,
        token_id: &TokenIdU64,
        amount: TokenAmountU256,
        from: &Address,
        to: &Address,
        state_builder: &mut StateBuilder<S>,
    ) -> ContractResult<()> {
        ensure_eq!(token_id, &TOKEN_ID_WCCD, ExchangeError::InvalidTokenId);
        if amount == 0u64.into() {
            return Ok(());
        }
        {
            let mut from_state = self
                .token
                .get_mut(from)
                .ok_or(ExchangeError::YourError)?;
            ensure!(
                from_state.balance >= amount,
                ExchangeError::InsufficientFunds
            );
            from_state.balance -= amount;
        }
        let mut to_state = self.token.entry(*to).or_insert_with(|| AddressState {
            balance: 0u64.into(),
            operators: state_builder.new_set(),
        });
        to_state.balance += amount;

        Ok(())
    }*/

    pub fn mint(
        &mut self,
        amount: TokenAmountU64,
        owner: &AccountAddress,
        state_builder: &mut StateBuilder<S>,
    ) -> ContractResult<()> {
        let mut owner_state = self
            .liquidity_token
            .entry(*owner)
            .or_insert_with(|| AddressState {
                balance: 0u64.into(),
                operator: *owner,
            });

        owner_state.balance += amount;

        self.total_supply = (TokenAmountU64(self.total_supply) + amount).into();

        Ok(())
    }

    pub fn burn(&mut self, amount: TokenAmountU64, owner: &AccountAddress) -> ContractResult<()> {
        if amount == 0u64.into() {
            return Ok(());
        }

        let mut from_state = self
            .liquidity_token
            .get_mut(owner)
            .ok_or(ExchangeError::ExchangeError)?;
        ensure!(from_state.balance >= amount, ExchangeError::ExchangeError);
        from_state.balance -= amount;

        self.total_supply = (TokenAmountU64(self.total_supply) - amount).into();

        Ok(())
    }
}
