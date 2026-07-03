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
