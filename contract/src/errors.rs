//! Provides error types which can be returned by Marketplace Contract.
//! Read more about errors which can be returned by a Concordium Contract [here](https://developer.concordium.software/en/mainnet/smart-contracts/guides/custom-errors.html)

use concordium_std::*;

#[derive(Serialize, Debug, PartialEq, Eq, Reject, SchemaType)]
pub enum ExchangeError {
    #[from(ParseError)]
    ParseParams,

    ParseResult,
    InvokeContractError,
    CalledByAContract,
    TokenNotListed,
    CollectionNotCis2,
    InvalidAmountPaid,
    InvokeTransferError,
    NoBalance,
    NotOperator,
    InvalidCommission,
    InvalidTokenQuantity,
    
    #[from(LogError)]
    LogError,

    #[from(TransferError)]
    TransferError,

    ExchangeError,
}
