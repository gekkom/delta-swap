#![cfg_attr(not(feature = "std"), no_std)]
use concordium_cis2::*;
use concordium_std::{collections::BTreeMap, *};

// The following constants are used to tag the different events.
pub const LIQUIDITY_ADD_EVENT_TAG: u8 = u8::MAX;
pub const LIQUIDITY_REMOVE_EVENT_TAG: u8 = u8::MAX - 1;
pub const CCD_TO_TOKEN_EVENT_TAG: u8 = u8::MAX - 2;
pub const TOKEN_TO_CCD_EVENT_TAG: u8 = u8::MAX - 3;

// The following structs are used to represent the different events.
#[derive(Debug)]
pub enum ExchangeEvent {
    LiquidityAdded(LiquidityAddedEvent),
    LiquidityRemoved(LiquidityRemovedEvent),
    CcdToToken(CcdToTokenEvent),
    TokenToCcd(TokenToCcdEvent),
}

#[derive(Debug, Serialize, SchemaType)]
pub struct LiquidityAddedEvent {
    pub token_id: TokenIdVec,
    pub liquidity_minted: u64,
    pub ccd_amount: u64,
    pub token_amount: u64,
    pub sender: AccountAddress,
}

#[derive(Debug, Serialize, SchemaType)]
pub struct LiquidityRemovedEvent {
    pub token_id: TokenIdVec,
    pub amount: u64,
    pub ccd_amount: u64,
    pub token_amount: u64,
    pub sender: AccountAddress,
}

#[derive(Debug, Serialize, SchemaType)]
pub struct CcdToTokenEvent {
    pub token_id: TokenIdVec,
    pub tokens_bought: u64,
    pub ccd_amount: u64,
    pub sender: AccountAddress,
}

#[derive(Debug, Serialize, SchemaType)]
pub struct TokenToCcdEvent {
    pub token_id: TokenIdVec,
    pub ccd_bought: u64,
    pub token_amount: u64,
    pub sender: AccountAddress,
}

// The following impls are used to serialize the different events.
impl schema::SchemaType for ExchangeEvent {
    fn get_type() -> schema::Type {
        let mut event_map = BTreeMap::new();
        event_map.insert(
            LIQUIDITY_ADD_EVENT_TAG,
            (
                "Liquidity Add".to_string(),
                schema::Fields::Named(vec![
                    (String::from("token_id"), TokenIdVec::get_type()),
                    (String::from("liquidity_minted"), u64::get_type()),
                    (String::from("ccd_amount"), u64::get_type()),
                    (String::from("token_amount"), u64::get_type()),
                    (String::from("sender"), AccountAddress::get_type()),
                ]),
            ),
        );
        event_map.insert(
            LIQUIDITY_REMOVE_EVENT_TAG,
            (
                "Liquidity Remove".to_string(),
                schema::Fields::Named(vec![
                    (String::from("token_id"), TokenIdVec::get_type()),
                    (String::from("amount"), u64::get_type()),
                    (String::from("ccd_amount"), u64::get_type()),
                    (String::from("token_amount"), u64::get_type()),
                    (String::from("sender"), AccountAddress::get_type()),
                ]),
            ),
        );
        event_map.insert(
            CCD_TO_TOKEN_EVENT_TAG,
            (
                "CCD To Token".to_string(),
                schema::Fields::Named(vec![
                    (String::from("token_id"), TokenIdVec::get_type()),
                    (String::from("tokens_bought"), u64::get_type()),
                    (String::from("ccd_amount"), u64::get_type()),
                    (String::from("sender"), AccountAddress::get_type()),
                ]),
            ),
        );
        event_map.insert(
            TOKEN_TO_CCD_EVENT_TAG,
            (
                "Token To CCD".to_string(),
                schema::Fields::Named(vec![
                    (String::from("token_id"), TokenIdVec::get_type()),
                    (String::from("ccd_bought"), u64::get_type()),
                    (String::from("token_amount"), u64::get_type()),
                    (String::from("sender"), AccountAddress::get_type()),
                ]),
            ),
        );
        schema::Type::TaggedEnum(event_map)
    }
}

impl Serial for ExchangeEvent {
    fn serial<W: Write>(&self, out: &mut W) -> Result<(), W::Err> {
        match self {
            ExchangeEvent::LiquidityAdded(event) => {
                out.write_u8(LIQUIDITY_ADD_EVENT_TAG)?;
                event.serial(out)
            }
            ExchangeEvent::LiquidityRemoved(event) => {
                out.write_u8(LIQUIDITY_REMOVE_EVENT_TAG)?;
                event.serial(out)
            }
            ExchangeEvent::CcdToToken(event) => {
                out.write_u8(CCD_TO_TOKEN_EVENT_TAG)?;
                event.serial(out)
            }
            ExchangeEvent::TokenToCcd(event) => {
                out.write_u8(TOKEN_TO_CCD_EVENT_TAG)?;
                event.serial(out)
            }
        }
    }
}

// The following impls are used to deserialize the different events.
impl Deserial for ExchangeEvent {
    fn deserial<R: Read>(source: &mut R) -> ParseResult<Self> {
        let tag = source.read_u8()?;
        match tag {
            LIQUIDITY_ADD_EVENT_TAG => {
                LiquidityAddedEvent::deserial(source).map(ExchangeEvent::LiquidityAdded)
            }
            LIQUIDITY_REMOVE_EVENT_TAG => {
                LiquidityRemovedEvent::deserial(source).map(ExchangeEvent::LiquidityRemoved)
            }
            CCD_TO_TOKEN_EVENT_TAG => {
                CcdToTokenEvent::deserial(source).map(ExchangeEvent::CcdToToken)
            }
            TOKEN_TO_CCD_EVENT_TAG => {
                TokenToCcdEvent::deserial(source).map(ExchangeEvent::TokenToCcd)
            }

            _ => Err(ParseError::default()),
        }
    }
}
