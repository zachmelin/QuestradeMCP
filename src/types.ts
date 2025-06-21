export interface QuestradeConfig {
  apiUrl: string;
  accessToken: string;
  refreshToken: string;
}

export interface Account {
  type: string;
  number: string;
  status: string;
  isPrimary: boolean;
  isBilling: boolean;
  clientAccountType: string;
}

export interface Position {
  symbol: string;
  symbolId: number;
  openQuantity: number;
  closedQuantity: number;
  currentMarketValue: number;
  currentPrice: number;
  averageEntryPrice: number;
  closedPnl: number;
  openPnl: number;
  totalCost: number;
  isRealTime: boolean;
  isUnderReorg: boolean;
}

export interface Balance {
  currency: string;
  cash: number;
  marketValue: number;
  totalEquity: number;
  buyingPower: number;
  maintenanceExcess: number;
  isRealTime: boolean;
}

export interface Quote {
  symbol: string;
  symbolId: number;
  tier: string;
  bidPrice: number;
  bidSize: number;
  askPrice: number;
  askSize: number;
  lastTradePriceTrHrs: number;
  lastTradePrice: number;
  lastTradeSize: number;
  lastTradeTick: string;
  lastTradeTime: string;
  volume: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  delay: number;
  isHalted: boolean;
  high52w: number;
  low52w: number;
  VWAP: number;
}

export interface Symbol {
  symbol: string;
  symbolId: number;
  description: string;
  securityType: string;
  listingExchange: string;
  region: string;
  currency: string;
  isQuotable: boolean;
  isTradable: boolean;
}

export interface Order {
  id: number;
  symbol: string;
  symbolId: number;
  totalQuantity: number;
  openQuantity: number;
  filledQuantity: number;
  cancelledQuantity: number;
  side: 'Buy' | 'Sell';
  orderType: string;
  limitPrice?: number;
  stopPrice?: number;
  isAllOrNone: boolean;
  isAnonymous: boolean;
  icebergQuantity?: number;
  minQuantity?: number;
  avgExecPrice?: number;
  lastExecPrice?: number;
  source: string;
  timeInForce: string;
  gtdDate?: string;
  state: string;
  clientReasonStr?: string;
  chainId: number;
  creationTime: string;
  updateTime: string;
  notes?: string;
  primaryRoute: string;
  orderRoute: string;
  venueHoldingOrder?: string;
  comissionCharged?: number;
  exchangeOrderId?: string;
  isSignificantShareHolder: boolean;
  isInsider: boolean;
  isLimitOffsetInDollar: boolean;
  userId: number;
  placementCommission?: number;
  legs: any[];
  strategyType: string;
  triggerStopPrice?: number;
  orderGroupId: number;
  orderClass?: string;
  mainChainId: number;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  api_server: string;
}