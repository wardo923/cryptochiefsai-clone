export type Coin = {
  id: string // CoinGecko id
  symbol: string // ticker, e.g. BTC
  name: string
}

// A wide, curated universe of major liquid markets.
export const COINS: Coin[] = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum" },
  { id: "solana", symbol: "SOL", name: "Solana" },
  { id: "binancecoin", symbol: "BNB", name: "BNB" },
  { id: "ripple", symbol: "XRP", name: "XRP" },
  { id: "cardano", symbol: "ADA", name: "Cardano" },
  { id: "dogecoin", symbol: "DOGE", name: "Dogecoin" },
  { id: "avalanche-2", symbol: "AVAX", name: "Avalanche" },
  { id: "chainlink", symbol: "LINK", name: "Chainlink" },
  { id: "polkadot", symbol: "DOT", name: "Polkadot" },
  { id: "tron", symbol: "TRX", name: "TRON" },
  { id: "matic-network", symbol: "POL", name: "Polygon" },
  { id: "litecoin", symbol: "LTC", name: "Litecoin" },
  { id: "near", symbol: "NEAR", name: "NEAR Protocol" },
  { id: "uniswap", symbol: "UNI", name: "Uniswap" },
  { id: "internet-computer", symbol: "ICP", name: "Internet Computer" },
  { id: "aptos", symbol: "APT", name: "Aptos" },
  { id: "stellar", symbol: "XLM", name: "Stellar" },
  { id: "cosmos", symbol: "ATOM", name: "Cosmos" },
  { id: "filecoin", symbol: "FIL", name: "Filecoin" },
  { id: "hedera-hashgraph", symbol: "HBAR", name: "Hedera" },
  { id: "arbitrum", symbol: "ARB", name: "Arbitrum" },
  { id: "optimism", symbol: "OP", name: "Optimism" },
  { id: "injective-protocol", symbol: "INJ", name: "Injective" },
  { id: "sui", symbol: "SUI", name: "Sui" },
  { id: "sei-network", symbol: "SEI", name: "Sei" },
  { id: "render-token", symbol: "RENDER", name: "Render" },
  { id: "the-graph", symbol: "GRT", name: "The Graph" },
  { id: "fantom", symbol: "FTM", name: "Fantom" },
  { id: "pepe", symbol: "PEPE", name: "Pepe" },
]

export const COIN_BY_ID: Record<string, Coin> = Object.fromEntries(COINS.map((c) => [c.id, c]))

export const COIN_IDS = COINS.map((c) => c.id)
