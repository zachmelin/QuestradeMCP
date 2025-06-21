import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  QuestradeConfig, 
  Account, 
  Position, 
  Balance, 
  Quote, 
  Symbol, 
  Order, 
  TokenResponse 
} from './types.js';
import { TokenManager } from './token-manager.js';

export class QuestradeClient {
  private http: AxiosInstance;
  private config: QuestradeConfig;
  private tokenManager: TokenManager;

  constructor(config: QuestradeConfig, tokenManager: TokenManager) {
    this.config = config;
    this.tokenManager = tokenManager;
    this.http = axios.create({
      baseURL: config.apiUrl,
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async refreshToken(): Promise<TokenResponse> {
    try {
      const data = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.config.refreshToken
      });

      const response = await axios.post('https://login.questrade.com/oauth2/token', data, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      const tokenData = response.data;
      this.config.accessToken = tokenData.access_token;
      this.config.refreshToken = tokenData.refresh_token;
      this.config.apiUrl = tokenData.api_server;
      
      this.http.defaults.baseURL = this.config.apiUrl;
      this.http.defaults.headers['Authorization'] = `Bearer ${this.config.accessToken}`;
      
      await this.tokenManager.saveTokens(
        tokenData.refresh_token,
        tokenData.access_token,
        tokenData.api_server
      );
      
      return tokenData;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorDetails = error.response?.data || error.message;
        throw new Error(`Token refresh failed: ${JSON.stringify(errorDetails)}`);
      }
      throw error;
    }
  }

  async getAccounts(): Promise<Account[]> {
    const response: AxiosResponse<{ accounts: Account[] }> = await this.http.get('/v1/accounts');
    return response.data.accounts;
  }

  async getPositions(accountNumber: string): Promise<Position[]> {
    const response: AxiosResponse<{ positions: Position[] }> = await this.http.get(
      `/v1/accounts/${accountNumber}/positions`
    );
    return response.data.positions;
  }

  async getBalances(accountNumber: string): Promise<Balance[]> {
    const response: AxiosResponse<{ perCurrencyBalances: Balance[], combinedBalances: Balance[], sodPerCurrencyBalances: Balance[], sodCombinedBalances: Balance[] }> = await this.http.get(
      `/v1/accounts/${accountNumber}/balances`
    );
    return response.data.combinedBalances;
  }

  async getQuotes(symbolIds: number[]): Promise<Quote[]> {
    const ids = symbolIds.join(',');
    const response: AxiosResponse<{ quotes: Quote[] }> = await this.http.get(
      `/v1/markets/quotes/${ids}`
    );
    return response.data.quotes;
  }

  async searchSymbols(prefix: string, offset: number = 0): Promise<Symbol[]> {
    const response: AxiosResponse<{ symbols: Symbol[] }> = await this.http.get(
      `/v1/symbols/search?prefix=${encodeURIComponent(prefix)}&offset=${offset}`
    );
    return response.data.symbols;
  }

  async getSymbol(symbolId: number): Promise<Symbol[]> {
    const response: AxiosResponse<{ symbols: Symbol[] }> = await this.http.get(
      `/v1/symbols/${symbolId}`
    );
    return response.data.symbols;
  }

  async getOrders(accountNumber: string, startTime?: string, endTime?: string, stateFilter?: string): Promise<Order[]> {
    let url = `/v1/accounts/${accountNumber}/orders`;
    const params = new URLSearchParams();
    
    if (startTime) params.append('startTime', startTime);
    if (endTime) params.append('endTime', endTime);
    if (stateFilter) params.append('stateFilter', stateFilter);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response: AxiosResponse<{ orders: Order[] }> = await this.http.get(url);
    return response.data.orders;
  }

  async getCandles(symbolId: number, startTime: string, endTime: string, interval: string): Promise<any[]> {
    const response = await this.http.get(
      `/v1/markets/candles/${symbolId}?startTime=${startTime}&endTime=${endTime}&interval=${interval}`
    );
    return response.data.candles;
  }
}