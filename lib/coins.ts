export type AssetKind = "crypto" | "stock"

export type Coin = {
  id: string // CoinGecko id for crypto; ticker for stocks
  symbol: string // ticker, e.g. BTC or SPY
  name: string
  kind: AssetKind
}

// A wide, curated universe of major liquid crypto markets.
export const COINS: Coin[] = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin", kind: "crypto" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum", kind: "crypto" },
  { id: "solana", symbol: "SOL", name: "Solana", kind: "crypto" },
  { id: "binancecoin", symbol: "BNB", name: "BNB", kind: "crypto" },
  { id: "ripple", symbol: "XRP", name: "XRP", kind: "crypto" },
  { id: "cardano", symbol: "ADA", name: "Cardano", kind: "crypto" },
  { id: "dogecoin", symbol: "DOGE", name: "Dogecoin", kind: "crypto" },
  { id: "avalanche-2", symbol: "AVAX", name: "Avalanche", kind: "crypto" },
  { id: "chainlink", symbol: "LINK", name: "Chainlink", kind: "crypto" },
  { id: "polkadot", symbol: "DOT", name: "Polkadot", kind: "crypto" },
  { id: "tron", symbol: "TRX", name: "TRON", kind: "crypto" },
  { id: "matic-network", symbol: "POL", name: "Polygon", kind: "crypto" },
  { id: "litecoin", symbol: "LTC", name: "Litecoin", kind: "crypto" },
  { id: "near", symbol: "NEAR", name: "NEAR Protocol", kind: "crypto" },
  { id: "uniswap", symbol: "UNI", name: "Uniswap", kind: "crypto" },
  { id: "internet-computer", symbol: "ICP", name: "Internet Computer", kind: "crypto" },
  { id: "aptos", symbol: "APT", name: "Aptos", kind: "crypto" },
  { id: "stellar", symbol: "XLM", name: "Stellar", kind: "crypto" },
  { id: "cosmos", symbol: "ATOM", name: "Cosmos", kind: "crypto" },
  { id: "filecoin", symbol: "FIL", name: "Filecoin", kind: "crypto" },
  { id: "hedera-hashgraph", symbol: "HBAR", name: "Hedera", kind: "crypto" },
  { id: "arbitrum", symbol: "ARB", name: "Arbitrum", kind: "crypto" },
  { id: "optimism", symbol: "OP", name: "Optimism", kind: "crypto" },
  { id: "injective-protocol", symbol: "INJ", name: "Injective", kind: "crypto" },
  { id: "sui", symbol: "SUI", name: "Sui", kind: "crypto" },
  { id: "sei-network", symbol: "SEI", name: "Sei", kind: "crypto" },
  { id: "render-token", symbol: "RENDER", name: "Render", kind: "crypto" },
  { id: "the-graph", symbol: "GRT", name: "The Graph", kind: "crypto" },
  { id: "fantom", symbol: "FTM", name: "Fantom", kind: "crypto" },
  { id: "pepe", symbol: "PEPE", name: "Pepe", kind: "crypto" },
  // --- expanded crypto (Binance-validated, same robustness bar) ---
  { id: "aave", symbol: "AAVE", name: "Aave", kind: "crypto" },
  { id: "maker", symbol: "MKR", name: "Maker", kind: "crypto" },
  { id: "algorand", symbol: "ALGO", name: "Algorand", kind: "crypto" },
  { id: "vechain", symbol: "VET", name: "VeChain", kind: "crypto" },
  { id: "theta-token", symbol: "THETA", name: "Theta Network", kind: "crypto" },
  { id: "ethereum-classic", symbol: "ETC", name: "Ethereum Classic", kind: "crypto" },
  { id: "eos", symbol: "EOS", name: "EOS", kind: "crypto" },
  { id: "tezos", symbol: "XTZ", name: "Tezos", kind: "crypto" },
  { id: "axie-infinity", symbol: "AXS", name: "Axie Infinity", kind: "crypto" },
  { id: "the-sandbox", symbol: "SAND", name: "The Sandbox", kind: "crypto" },
  { id: "decentraland", symbol: "MANA", name: "Decentraland", kind: "crypto" },
  { id: "gala", symbol: "GALA", name: "Gala", kind: "crypto" },
  { id: "chiliz", symbol: "CHZ", name: "Chiliz", kind: "crypto" },
  { id: "curve-dao-token", symbol: "CRV", name: "Curve DAO", kind: "crypto" },
  { id: "thorchain", symbol: "RUNE", name: "THORChain", kind: "crypto" },
  { id: "immutable-x", symbol: "IMX", name: "Immutable", kind: "crypto" },
  { id: "shiba-inu", symbol: "SHIB", name: "Shiba Inu", kind: "crypto" },
]

// Major index ETFs and large-cap stocks (priced via Yahoo Finance, no key).
// For stocks the `id` is the ticker itself.
export const STOCKS: Coin[] = [
  { id: "SPX", symbol: "SPX", name: "S&P 500 Index", kind: "stock" },
  { id: "SPY", symbol: "SPY", name: "S&P 500 ETF", kind: "stock" },
  { id: "QQQ", symbol: "QQQ", name: "Nasdaq 100 ETF", kind: "stock" },
  { id: "IWM", symbol: "IWM", name: "Russell 2000 ETF", kind: "stock" },
  { id: "DIA", symbol: "DIA", name: "Dow Jones ETF", kind: "stock" },
  { id: "AAPL", symbol: "AAPL", name: "Apple", kind: "stock" },
  { id: "MSFT", symbol: "MSFT", name: "Microsoft", kind: "stock" },
  { id: "NVDA", symbol: "NVDA", name: "NVIDIA", kind: "stock" },
  { id: "TSLA", symbol: "TSLA", name: "Tesla", kind: "stock" },
  { id: "AMZN", symbol: "AMZN", name: "Amazon", kind: "stock" },
  { id: "META", symbol: "META", name: "Meta Platforms", kind: "stock" },
  { id: "GOOGL", symbol: "GOOGL", name: "Alphabet", kind: "stock" },
  // --- expanded equities (Alpaca-validated, same robustness bar) ---
  { id: "AMD", symbol: "AMD", name: "Advanced Micro Devices", kind: "stock" },
  { id: "NFLX", symbol: "NFLX", name: "Netflix", kind: "stock" },
  { id: "COIN", symbol: "COIN", name: "Coinbase", kind: "stock" },
  { id: "PLTR", symbol: "PLTR", name: "Palantir", kind: "stock" },
  { id: "JPM", symbol: "JPM", name: "JPMorgan Chase", kind: "stock" },
  { id: "BABA", symbol: "BABA", name: "Alibaba", kind: "stock" },
  { id: "SOFI", symbol: "SOFI", name: "SoFi", kind: "stock" },
  { id: "GME", symbol: "GME", name: "GameStop", kind: "stock" },
  { id: "AVGO", symbol: "AVGO", name: "Broadcom", kind: "stock" },
  { id: "CRM", symbol: "CRM", name: "Salesforce", kind: "stock" },
  { id: "ORCL", symbol: "ORCL", name: "Oracle", kind: "stock" },
  { id: "PYPL", symbol: "PYPL", name: "PayPal", kind: "stock" },
  { id: "SHOP", symbol: "SHOP", name: "Shopify", kind: "stock" },
  { id: "MU", symbol: "MU", name: "Micron", kind: "stock" },
  { id: "SMCI", symbol: "SMCI", name: "Super Micro", kind: "stock" },
  { id: "MSTR", symbol: "MSTR", name: "MicroStrategy", kind: "stock" },
  // --- expanded equities & ETFs (Alpaca-validated, same robustness bar) ---
  { id: "ADBE", symbol: "ADBE", name: "Adobe", kind: "stock" },
  { id: "AMAT", symbol: "AMAT", name: "Applied Materials", kind: "stock" },
  { id: "WMT", symbol: "WMT", name: "Walmart", kind: "stock" },
  { id: "HD", symbol: "HD", name: "Home Depot", kind: "stock" },
  { id: "COST", symbol: "COST", name: "Costco", kind: "stock" },
  { id: "XOM", symbol: "XOM", name: "ExxonMobil", kind: "stock" },
  { id: "CVX", symbol: "CVX", name: "Chevron", kind: "stock" },
  { id: "KO", symbol: "KO", name: "Coca-Cola", kind: "stock" },
  { id: "BAC", symbol: "BAC", name: "Bank of America", kind: "stock" },
  { id: "GS", symbol: "GS", name: "Goldman Sachs", kind: "stock" },
  { id: "ABNB", symbol: "ABNB", name: "Airbnb", kind: "stock" },
  { id: "CRWD", symbol: "CRWD", name: "CrowdStrike", kind: "stock" },
  { id: "DDOG", symbol: "DDOG", name: "Datadog", kind: "stock" },
  { id: "HOOD", symbol: "HOOD", name: "Robinhood", kind: "stock" },
  { id: "F", symbol: "F", name: "Ford", kind: "stock" },
  { id: "NKE", symbol: "NKE", name: "Nike", kind: "stock" },
  { id: "LLY", symbol: "LLY", name: "Eli Lilly", kind: "stock" },
  { id: "UNH", symbol: "UNH", name: "UnitedHealth", kind: "stock" },
  // Sector / thematic ETFs (Alpaca-validated)
  { id: "XLK", symbol: "XLK", name: "Technology Sector ETF", kind: "stock" },
  { id: "SMH", symbol: "SMH", name: "Semiconductor ETF", kind: "stock" },
  { id: "ARKK", symbol: "ARKK", name: "ARK Innovation ETF", kind: "stock" },
  { id: "GLD", symbol: "GLD", name: "Gold ETF", kind: "stock" },
  { id: "SLV", symbol: "SLV", name: "Silver ETF", kind: "stock" },
  { id: "XLV", symbol: "XLV", name: "Health Care Sector ETF", kind: "stock" },
  { id: "XBI", symbol: "XBI", name: "Biotech ETF", kind: "stock" },
]

// The full tradable universe across both asset classes.
export const ASSETS: Coin[] = [...COINS, ...STOCKS]

export const ASSET_BY_ID: Record<string, Coin> = Object.fromEntries(ASSETS.map((c) => [c.id, c]))

// Kept for back-compat with crypto-specific callers.
export const COIN_BY_ID: Record<string, Coin> = ASSET_BY_ID

// CoinGecko ids only (crypto). Used by the CoinGecko markets call.
export const COIN_IDS = COINS.map((c) => c.id)

// Stock tickers, used to route price lookups to Yahoo Finance.
export const STOCK_SYMBOLS = new Set(STOCKS.map((s) => s.symbol.toUpperCase()))
