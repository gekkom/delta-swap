//! CIS2 client is the intermediatory layer between marketplace contract and CIS2 contract.
//!
//! # Description
//! It allows Marketplace contract to abstract away logic of calling CIS2 contract for the following methods
//! - `supports_cis2` : Calls [`supports`](https://proposals.concordium.software/CIS/cis-0.html#supports)
//! - `is_operator_of` : Calls [`operatorOf`](https://proposals.concordium.software/CIS/cis-2.html#operatorof)
//! - `get_balance` : Calls [`balanceOf`](https://proposals.concordium.software/CIS/cis-2.html#balanceof)
//! - `transfer` : Calls [`transfer`](https://proposals.concordium.software/CIS/cis-2.html#transfer)

use std::vec;

use concordium_cis2::{
    AdditionalData, BalanceOfQueryResponse, IsTokenAmount, IsTokenId, OperatorOfQuery,
    OperatorOfQueryParams, OperatorOfQueryResponse, Receiver, StandardIdentifierOwned,
    SupportResult, SupportsQueryParams, SupportsQueryResponse, TokenIdVec, Transfer,
    TransferParams,
};
use concordium_std::*;

use crate::{errors::ExchangeError, state::State};

pub const SUPPORTS_ENTRYPOINT_NAME: &str = "supports";
pub const OPERATOR_OF_ENTRYPOINT_NAME: &str = "operatorOf";
pub const BALANCE_OF_ENTRYPOINT_NAME: &str = "balanceOf";
pub const TRANSFER_ENTRYPOINT_NAME: &str = "transfer";

pub struct Cis2Client;

#[derive(Debug, Serialize)]
pub struct BalanceOfQuery {
    /// The ID of the token for which to query the balance of.
    pub token_id: TokenIdVec,
    /// The address for which to query the balance of.
    pub address: Address,
}

/// The parameter type for the contract function `balanceOf`.
// Note: For the serialization to be derived according to the CIS2
// specification, the order of the fields cannot be changed.
#[derive(Debug, Serialize)]
pub struct BalanceOfQueryParams {
    /// List of balance queries.
    #[concordium(size_length = 2)]
    pub queries: Vec<BalanceOfQuery>,
}

impl Cis2Client {
    pub(crate) fn supports_cis2<
        S: HasStateApi,
        T: IsTokenId + Clone + Copy,
        A: IsTokenAmount + Clone + Copy + ops::Sub<Output = A>,
    >(
        host: &mut impl HasHost<State<S>, StateApiType = S>,
        nft_contract_address: &ContractAddress,
    ) -> Result<bool, ExchangeError> {
        let params = SupportsQueryParams {
            queries: vec![StandardIdentifierOwned::new_unchecked("CIS-2".to_string())],
        };
        let parsed_res: SupportsQueryResponse = Cis2Client::invoke_contract_read_only(
            host,
            nft_contract_address,
            SUPPORTS_ENTRYPOINT_NAME,
            &params,
        )?;
        let supports_cis2: bool = {
            let f = parsed_res
                .results
                .first()
                .ok_or(ExchangeError::InvokeContractError)?;
            match f {
                SupportResult::NoSupport => false,
                SupportResult::Support => true,
                SupportResult::SupportBy(_) => false,
            }
        };

        Ok(supports_cis2)
    }

    pub(crate) fn is_operator_of<
        S: HasStateApi,
    >(
        host: &impl HasHost<State<S>, StateApiType = S>,
        owner: AccountAddress,
        current_contract_address: ContractAddress,
        contract_address: &ContractAddress,
    ) -> Result<bool, ExchangeError> {
        let params = &OperatorOfQueryParams {
            queries: vec![OperatorOfQuery {
                owner: Address::Account(owner),
                address: Address::Contract(current_contract_address),
            }],
        };

        let is_operator: OperatorOfQueryResponse = Cis2Client::invoke_contract_read_only(
            host,
            contract_address,
            OPERATOR_OF_ENTRYPOINT_NAME,
            params,
        )?;

        Ok(*is_operator.as_ref().clone().first().unwrap_abort())
    }

    pub(crate) fn get_balance<
        S,
        A: std::default::Default + IsTokenAmount + Clone + Copy + ops::Sub<Output = A>,
    >(
        host: &impl HasHost<State<S>, StateApiType = S>,
        token_id: TokenIdVec,
        contract_address: &ContractAddress,
        owner: Address,
    ) -> Result<A, ExchangeError>
    where
        S: HasStateApi,
    {
        let params = BalanceOfQueryParams {
            queries: vec![BalanceOfQuery {
                token_id,
                address: owner,
            }],
        };

        let parsed_res: BalanceOfQueryResponse<A> = Cis2Client::invoke_contract_read_only(
            host,
            contract_address,
            BALANCE_OF_ENTRYPOINT_NAME,
            &params,
        )?;

        let ret = parsed_res.0.first().map_or(A::default(), |f| *f);

        Result::Ok(ret)
    }

    pub(crate) fn transfer<
        S,
        A: IsTokenAmount + Clone + Copy + ops::Sub<Output = A>,
    >(
        host: &mut impl HasHost<State<S>, StateApiType = S>,
        token_id: TokenIdVec,
        contract_address: ContractAddress,
        amount: A,
        from: Address,
        to: Receiver,
    ) -> Result<bool, ExchangeError>
    where
        S: HasStateApi,
        A: IsTokenAmount,
    {
        let params = TransferParams(vec![Transfer {
            token_id,
            amount,
            from: from,
            data: AdditionalData::empty(),
            to,
        }]);

        Cis2Client::invoke_contract_read_only(
            host,
            &contract_address,
            TRANSFER_ENTRYPOINT_NAME,
            &params,
        )?;

        Result::Ok(true)
    }

    fn invoke_contract_read_only<S: HasStateApi, R: Deserial, P: Serial>(
        host: &impl HasHost<State<S>, StateApiType = S>,
        contract_address: &ContractAddress,
        entrypoint_name: &str,
        params: &P,
    ) -> Result<R, ExchangeError> {
        let invoke_contract_result = host
            .invoke_contract_read_only(
                contract_address,
                params,
                EntrypointName::new(entrypoint_name).unwrap_abort(),
                Amount::from_ccd(0),
            )
            .map_err(|_e| ExchangeError::InvokeContractError)?;
        let mut invoke_contract_res = match invoke_contract_result {
            Some(s) => s,
            None => return Result::Err(ExchangeError::InvokeContractError),
        };
        let parsed_res =
            R::deserial(&mut invoke_contract_res).map_err(|_e| ExchangeError::ParseResult)?;

        Ok(parsed_res)
    }
}