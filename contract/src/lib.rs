//! # A Concordium V1 smart contract

mod cis2_client;
mod errors;
mod events;
mod state;

use cis2_client::Cis2Client;

use concordium_cis2::*;
use concordium_std::*;
use errors::*;
use events::*;
use state::*;

type ContractResult<A> = Result<A, ExchangeError>;

/// The parameter type for the contract function `wrap`.
/// It includes a receiver for receiving the wrapped CCD tokens.
#[derive(Serialize, SchemaType)]
struct InitParams {
    token_address: u64,
    token_id: TokenIdVec,
}

/// Init function that creates a new smart contract.
#[init(contract = "exchange", parameter = "InitParams")]
fn init<S: HasStateApi>(
    _ctx: &impl HasInitContext,
    _state_builder: &mut StateBuilder<S>,
) -> InitResult<State<S>> {
    let params: InitParams = _ctx.parameter_cursor().get()?;

    // Construct the initial contract state.
    let state = State::new(
        _state_builder,
        ContractAddress::new(params.token_address, 0),
        params.token_id,
    );

    Ok(state)
}

#[derive(Serialize, SchemaType)]
struct AddLiquidityParams {
    min_liquidity: u64,
    max_tokens: u64,
}

#[receive(
    contract = "exchange",
    name = "add_liquidity",
    parameter = "AddLiquidityParams",
    error = "ExchangeError",
    enable_logger,
    mutable,
    payable
)]
fn add_liquidity<S: HasStateApi>(
    ctx: &impl HasReceiveContext,
    host: &mut impl HasHost<State<S>, StateApiType = S>,
    amount: Amount,
    logger: &mut impl HasLogger,
) -> ContractResult<u64> {
    let params: AddLiquidityParams = ctx.parameter_cursor().get()?;

    let total_liquidity = host.state().total_supply;
    let sender = ctx.invoker();

    let (state, state_builder) = host.state_and_builder();
    let min_liquidity = params.min_liquidity;
    let max_tokens = params.max_tokens;
    let tokenAddress = state.token_address;

    if total_liquidity > 0 {
        ensure!(min_liquidity > 0, ExchangeError::ExchangeError);

        let ccdReserve: u64 =
            host.contract_balance(ctx.self_address()).unwrap().micro_ccd - amount.micro_ccd;
        let (state, state_builder) = host.state_and_builder();
        let token_id = state.token_id.clone();

        let contractBalance: TokenAmountU64 = Cis2Client::get_balance(
            host,
            token_id,
            &tokenAddress,
            Address::Contract(ctx.self_address()),
        )?;
        let (state, state_builder) = host.state_and_builder();

        let tokenReserve: u64 = contractBalance.into();
        let tokenAmount: u64 = amount.micro_ccd * tokenReserve / ccdReserve + 1;
        let liqudityMinted: u64 = amount.micro_ccd * total_liquidity / ccdReserve;
        ensure!(max_tokens >= tokenAmount, ExchangeError::ExchangeError);
        ensure!(
            liqudityMinted >= min_liquidity,
            ExchangeError::ExchangeError
        );

        let (state, state_builder) = host.state_and_builder();

        let tokenAddress = state.token_address;
        let entryPoint = OwnedEntrypointName::new_unchecked("receive_token".to_string());
        let token_id = state.token_id.clone();

        Cis2Client::transfer(
            host,
            token_id,
            tokenAddress,
            TokenAmountU64(tokenAmount),
            Address::Account(sender),
            concordium_cis2::Receiver::Contract(ctx.self_address(), entryPoint),
        )?;

        let (state, state_builder) = host.state_and_builder();
        state.mint(
            concordium_cis2::TokenAmountU64(liqudityMinted),
            &sender,
            state_builder,
        )?;
        let token_id = state.token_id.clone();

        // Log transfer event
        logger.log(&ExchangeEvent::LiquidityAdded(LiquidityAddedEvent {
            token_id,
            liquidity_minted: liqudityMinted,
            ccd_amount: amount.micro_ccd,
            token_amount: tokenAmount,
            sender,
        }))?;

        Ok(liqudityMinted)
    } else {
        let tokenAmount: TokenAmountU64 = concordium_cis2::TokenAmountU64(max_tokens);
        let initialLiquidity: u64 = amount.micro_ccd;
        let entryPoint = OwnedEntrypointName::new_unchecked("receive_token".to_string());
        let token_id = state.token_id.clone();

        Cis2Client::transfer(
            host,
            token_id,
            tokenAddress,
            tokenAmount,
            Address::Account(sender),
            concordium_cis2::Receiver::Contract(ctx.self_address(), entryPoint),
        )?;

        let (state, state_builder) = host.state_and_builder();
        state.mint(
            concordium_cis2::TokenAmountU64(initialLiquidity),
            &sender,
            state_builder,
        )?;
        let token_id = state.token_id.clone();

        logger.log(&ExchangeEvent::LiquidityAdded(LiquidityAddedEvent {
            token_id,
            liquidity_minted: initialLiquidity,
            ccd_amount: amount.micro_ccd,
            token_amount: tokenAmount.into(),
            sender,
        }))?;

        Ok(initialLiquidity)
    }
}

#[receive(contract = "exchange", name = "receive_token")]
fn receive_token<S: HasStateApi>(
    ctx: &impl HasReceiveContext,
    host: &impl HasHost<State<S>, StateApiType = S>,
) -> ContractResult<()> {
    Ok(())
}

#[derive(Serialize, SchemaType)]
struct RemoveLiquidityParams {
    amount: u64,
    min_ccd: u64,
    min_tokens: u64,
}

#[receive(
    contract = "exchange",
    name = "remove_liquidity",
    parameter = "RemoveLiquidityParams",
    error = "ExchangeError",
    enable_logger,
    mutable
)]
fn remove_liquidity<S: HasStateApi>(
    ctx: &impl HasReceiveContext,
    host: &mut impl HasHost<State<S>, StateApiType = S>,
    logger: &mut impl HasLogger,
) -> ContractResult<(u64, u64)> {
    let params: RemoveLiquidityParams = ctx.parameter_cursor().get()?;
    let amount = params.amount;
    ensure!(amount > 0, ExchangeError::ExchangeError);
    let total_liquidity = host.state().total_supply as u64;
    ensure!(total_liquidity > 0, ExchangeError::ExchangeError);
    let sender = ctx.invoker();
    let (state, state_builder) = host.state_and_builder();
    let tokenAddress = state.token_address;
    let token_id = state.token_id.clone();

    let contractBalance: TokenAmountU64 = Cis2Client::get_balance(
        host,
        token_id,
        &tokenAddress,
        Address::Contract(ctx.self_address()),
    )?;

    let tokenReserve: u64 = contractBalance.into();
    let ccdAmount: u64 =
        amount * host.contract_balance(ctx.self_address()).unwrap().micro_ccd / total_liquidity;
    let token_amount: u64 = amount * tokenReserve / total_liquidity;

    ensure!(ccdAmount > params.min_ccd, ExchangeError::ExchangeError);
    ensure!(
        token_amount > params.min_tokens,
        ExchangeError::ExchangeError
    );

    let (state, state_builder) = host.state_and_builder();
    state.burn(concordium_cis2::TokenAmountU64(amount), &sender)?;

    host.invoke_transfer(
        &sender,
        concordium_std::Amount {
            micro_ccd: ccdAmount,
        },
    )?;
    let (state, state_builder) = host.state_and_builder();

    let tokenAmount: TokenAmountU64 = concordium_cis2::TokenAmountU64(token_amount);
    let token_id = state.token_id.clone();

    Cis2Client::transfer(
        host,
        token_id,
        tokenAddress,
        tokenAmount,
        Address::Contract(ctx.self_address()),
        concordium_cis2::Receiver::Account(sender),
    )?;

    let (state, state_builder) = host.state_and_builder();
    let token_id = state.token_id.clone();

    // Log transfer event
    logger.log(&ExchangeEvent::LiquidityRemoved(LiquidityRemovedEvent {
        token_id,
        amount,
        ccd_amount: ccdAmount,
        token_amount,
        sender,
    }))?;

    Ok((ccdAmount, token_amount))
}

fn get_input_price(input_amount: u64, input_reserve: u64, output_reserve: u64) -> u64 {
    let input_amount_with_fee: u64 = input_amount * 997;
    let numerator: u64 = input_amount_with_fee * output_reserve;
    let denominator: u64 = (input_reserve * 1000) + input_amount_with_fee;
    return numerator / denominator;
}

#[derive(Serialize, SchemaType)]
struct CcdToTokenParams {
    min_tokens: u64,
}

#[receive(
    contract = "exchange",
    name = "ccd_to_token",
    parameter = "CcdToTokenParams",
    error = "ExchangeError",
    enable_logger,
    mutable,
    payable
)]
fn ccd_to_token<S: HasStateApi>(
    ctx: &impl HasReceiveContext,
    host: &mut impl HasHost<State<S>, StateApiType = S>,
    amount: Amount,
    logger: &mut impl HasLogger,
) -> ContractResult<u64> {
    let params: CcdToTokenParams = ctx.parameter_cursor().get()?;

    let sender = ctx.invoker();
    let tokenAddress = host.state().token_address;
    let (state, state_builder) = host.state_and_builder();
    let token_id = state.token_id.clone();

    let contractBalance: TokenAmountU64 = Cis2Client::get_balance(
        host,
        token_id,
        &tokenAddress,
        Address::Contract(ctx.self_address()),
    )?;

    let token_reserve: u64 = contractBalance.into();
    let input_reserve: u64 = host.contract_balance(ctx.self_address()).unwrap().micro_ccd;

    ensure!(
        input_reserve > 0 && token_reserve > 0,
        ExchangeError::ExchangeError
    );
    let tokens_bought: u64 = get_input_price(amount.micro_ccd, input_reserve, token_reserve);
    ensure!(
        tokens_bought > params.min_tokens,
        ExchangeError::ExchangeError
    );

    let tokenAmount: TokenAmountU64 = concordium_cis2::TokenAmountU64(tokens_bought);
    let (state, state_builder) = host.state_and_builder();
    let token_id = state.token_id.clone();
    Cis2Client::transfer(
        host,
        token_id,
        tokenAddress,
        tokenAmount,
        Address::Contract(ctx.self_address()),
        concordium_cis2::Receiver::Account(sender),
    )?;
    let (state, state_builder) = host.state_and_builder();
    let token_id = state.token_id.clone();
    // Log transfer event
    logger.log(&ExchangeEvent::CcdToToken(CcdToTokenEvent {
        token_id,
        tokens_bought,
        ccd_amount: amount.micro_ccd,
        sender,
    }))?;

    Ok(tokens_bought)
}

#[derive(Serialize, SchemaType)]
struct TokenToCcdParams {
    tokens_sold: u64,
    min_ccd: u64,
}

#[receive(
    contract = "exchange",
    name = "token_to_ccd",
    parameter = "TokenToCcdParams",
    error = "ExchangeError",
    enable_logger,
    mutable
)]
fn token_to_ccd<S: HasStateApi>(
    ctx: &impl HasReceiveContext,
    host: &mut impl HasHost<State<S>, StateApiType = S>,
    logger: &mut impl HasLogger,
) -> ContractResult<u64> {
    let params: TokenToCcdParams = ctx.parameter_cursor().get()?;

    let sender = ctx.invoker();
    let token_address = host.state().token_address;
    let (state, state_builder) = host.state_and_builder();
    let token_id = state.token_id.clone();

    let contract_balance: TokenAmountU64 = Cis2Client::get_balance(
        host,
        token_id,
        &token_address,
        Address::Contract(ctx.self_address()),
    )?;

    let token_reserve: u64 = contract_balance.into();
    let ccd_bought: u64 = get_input_price(
        params.tokens_sold,
        token_reserve,
        host.contract_balance(ctx.self_address()).unwrap().micro_ccd,
    );
    ensure!(ccd_bought > params.min_ccd, ExchangeError::ExchangeError);

    let token_amount: TokenAmountU64 = concordium_cis2::TokenAmountU64(params.tokens_sold);

    let entry_point = OwnedEntrypointName::new_unchecked("receive_token".to_string());
    let (state, state_builder) = host.state_and_builder();
    let token_id = state.token_id.clone();
    Cis2Client::transfer(
        host,
        token_id,
        token_address,
        token_amount,
        Address::Account(sender),
        concordium_cis2::Receiver::Contract(ctx.self_address(), entry_point),
    )?;

    host.invoke_transfer(
        &sender,
        concordium_std::Amount {
            micro_ccd: ccd_bought,
        },
    )?;

    let (state, state_builder) = host.state_and_builder();
    let token_id = state.token_id.clone();

    // Log transfer event
    logger.log(&ExchangeEvent::TokenToCcd(TokenToCcdEvent {
        token_id,
        ccd_bought,
        token_amount: token_amount.into(),
        sender,
    }))?;

    Ok(ccd_bought)
}

#[receive(
    contract = "exchange",
    name = "get_total_liquidity",
    return_value = "u64",
    error = "ExchangeError"
)]
fn get_total_liquidity<S: HasStateApi>(
    _ctx: &impl HasReceiveContext,
    host: &impl HasHost<State<S>, StateApiType = S>,
) -> ContractResult<u64> {
    Ok(host.state().total_supply)
}

#[derive(Serialize, SchemaType)]
struct CcdToTokenPriceParams {
    ccd_sold: u64,
}

#[receive(
    contract = "exchange",
    name = "ccd_to_token_price",
    parameter = "CcdToTokenPriceParams",
    return_value = "u64",
    error = "ExchangeError"
)]
fn ccd_to_token_price<S: HasStateApi>(
    ctx: &impl HasReceiveContext,
    host: &impl HasHost<State<S>, StateApiType = S>,
) -> ContractResult<u64> {
    let params: CcdToTokenPriceParams = ctx.parameter_cursor().get()?;
    ensure!(params.ccd_sold > 0, ExchangeError::ExchangeError);
    let token_address = host.state().token_address;

    let token_id = host.state().token_id.clone();

    let contract_balance: TokenAmountU64 = Cis2Client::get_balance(
        host,
        token_id,
        &token_address,
        Address::Contract(ctx.self_address()),
    )?;

    let token_reserve: u64 = contract_balance.into();

    let tokens_bought: u64 = get_input_price(
        params.ccd_sold,
        host.contract_balance(ctx.self_address()).unwrap().micro_ccd,
        token_reserve,
    );
    Ok(tokens_bought)
}

#[derive(Serialize, SchemaType)]
struct TokenToCcdPriceParams {
    tokens_sold: u64,
}

#[receive(
    contract = "exchange",
    name = "token_to_ccd_price",
    parameter = "TokenToCcdPriceParams",
    return_value = "u64",
    error = "ExchangeError"
)]
fn token_to_ccd_price<S: HasStateApi>(
    ctx: &impl HasReceiveContext,
    host: &impl HasHost<State<S>, StateApiType = S>,
) -> ContractResult<u64> {
    let params: TokenToCcdPriceParams = ctx.parameter_cursor().get()?;
    ensure!(params.tokens_sold > 0, ExchangeError::ExchangeError);
    let token_address = host.state().token_address;

    let token_id = host.state().token_id.clone();

    let contract_balance: TokenAmountU64 = Cis2Client::get_balance(
        host,
        token_id,
        &token_address,
        Address::Contract(ctx.self_address()),
    )?;

    let token_reserve: u64 = contract_balance.into();

    let ccd_bought: u64 = get_input_price(
        params.tokens_sold,
        token_reserve,
        host.contract_balance(ctx.self_address()).unwrap().micro_ccd,
    );
    Ok(ccd_bought)
}

#[derive(Serialize, SchemaType)]
struct TokenData {
    token_address: ContractAddress,
    token_id: TokenIdVec,
}

#[receive(
    contract = "exchange",
    name = "get_token_data",
    return_value = "TokenData",
    error = "ExchangeError"
)]
fn get_token_data<S: HasStateApi>(
    ctx: &impl HasReceiveContext,
    host: &impl HasHost<State<S>, StateApiType = S>,
) -> ContractResult<TokenData> {
    Ok(TokenData {
        token_address: host.state().token_address,
        token_id: host.state().token_id.clone(),
    })
}

#[receive(
    contract = "exchange",
    name = "get_token_reserve",
    return_value = "u64",
    error = "ExchangeError"
)]
fn get_token_reserve<S: HasStateApi>(
    ctx: &impl HasReceiveContext,
    host: &impl HasHost<State<S>, StateApiType = S>,
) -> ContractResult<u64> {
    let token_address = host.state().token_address;

    let token_id = host.state().token_id.clone();

    let contract_balance: TokenAmountU64 = Cis2Client::get_balance(
        host,
        token_id,
        &token_address,
        Address::Contract(ctx.self_address()),
    )?;
    Ok(contract_balance.into())
}

#[receive(
    contract = "exchange",
    name = "get_liquidity_balance",
    return_value = "u64",
    error = "ExchangeError"
)]
fn get_liquidity_balance<S: HasStateApi>(
    ctx: &impl HasReceiveContext,
    host: &impl HasHost<State<S>, StateApiType = S>,
) -> ContractResult<u64> {
    let sender = ctx.invoker();
    let liquidity_balace = host.state().balance(&sender)?;

    Ok(liquidity_balace)
}

#[receive(
    contract = "exchange",
    name = "is_operator_of_token",
    return_value = "bool",
    error = "ExchangeError"
)]
fn is_operator_of_token<S: HasStateApi>(
    ctx: &impl HasReceiveContext,
    host: &impl HasHost<State<S>, StateApiType = S>,
) -> ContractResult<bool> {
    let token_address = host.state().token_address;

    let sender = ctx.invoker();

    let is_operator: bool = Cis2Client::is_operator_of(
        host,
        sender,
        ctx.self_address(),
        &token_address,
    )?;

    Ok(is_operator)
}
