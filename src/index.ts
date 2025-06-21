#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { QuestradeClient } from './questrade-client.js';
import { QuestradeConfig } from './types.js';
import { TokenManager } from './token-manager.js';
import * as dotenv from 'dotenv';

dotenv.config();

class QuestradeServer {
  private server: Server;
  private client: QuestradeClient | null = null;
  private tokenManager: TokenManager;

  constructor() {
    this.tokenManager = new TokenManager();
    this.server = new Server(
      {
        name: 'questrade-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupResourceHandlers();
    this.setupPromptHandlers();
    this.setupErrorHandling();
  }

  private async initializeClient(): Promise<QuestradeClient> {
    if (this.client) {
      return this.client;
    }

    const tokens = await this.tokenManager.loadTokens();
    
    if (!tokens.refreshToken) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'Missing refresh token. Either set QUESTRADE_REFRESH_TOKEN environment variable or ensure token file exists. Get your token from Questrade API Centre -> Generate new token'
      );
    }

    const config: QuestradeConfig = {
      apiUrl: tokens.apiUrl || 'https://api01.iq.questrade.com',
      accessToken: tokens.accessToken || '',
      refreshToken: tokens.refreshToken,
    };

    this.client = new QuestradeClient(config, this.tokenManager);
    
    if (!config.accessToken) {
      await this.client.refreshToken();
    }

    return this.client;
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get_accounts',
            description: 'Get all Questrade accounts',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'get_positions',
            description: 'Get positions for a specific account',
            inputSchema: {
              type: 'object',
              properties: {
                accountNumber: {
                  type: 'string',
                  description: 'Account number to get positions for',
                },
              },
              required: ['accountNumber'],
            },
          },
          {
            name: 'get_balances',
            description: 'Get balances for a specific account',
            inputSchema: {
              type: 'object',
              properties: {
                accountNumber: {
                  type: 'string',
                  description: 'Account number to get balances for',
                },
              },
              required: ['accountNumber'],
            },
          },
          {
            name: 'get_quotes',
            description: 'Get market quotes for specific symbols',
            inputSchema: {
              type: 'object',
              properties: {
                symbolIds: {
                  type: 'array',
                  items: { type: 'number' },
                  description: 'Array of symbol IDs to get quotes for',
                },
              },
              required: ['symbolIds'],
            },
          },
          {
            name: 'search_symbols',
            description: 'Search for symbols by prefix',
            inputSchema: {
              type: 'object',
              properties: {
                prefix: {
                  type: 'string',
                  description: 'Symbol prefix to search for (e.g., "AAPL")',
                },
                offset: {
                  type: 'number',
                  description: 'Offset for pagination (default: 0)',
                  default: 0,
                },
              },
              required: ['prefix'],
            },
          },
          {
            name: 'get_symbol',
            description: 'Get detailed information for a specific symbol',
            inputSchema: {
              type: 'object',
              properties: {
                symbolId: {
                  type: 'number',
                  description: 'Symbol ID to get details for',
                },
              },
              required: ['symbolId'],
            },
          },
          {
            name: 'get_orders',
            description: 'Get orders for a specific account',
            inputSchema: {
              type: 'object',
              properties: {
                accountNumber: {
                  type: 'string',
                  description: 'Account number to get orders for',
                },
                startTime: {
                  type: 'string',
                  description: 'Start time for order history (ISO format)',
                },
                endTime: {
                  type: 'string',
                  description: 'End time for order history (ISO format)',
                },
                stateFilter: {
                  type: 'string',
                  description: 'Filter orders by state (All, Open, Closed)',
                },
              },
              required: ['accountNumber'],
            },
          },
          {
            name: 'get_candles',
            description: 'Get historical candle data for a symbol',
            inputSchema: {
              type: 'object',
              properties: {
                symbolId: {
                  type: 'number',
                  description: 'Symbol ID to get candles for',
                },
                startTime: {
                  type: 'string',
                  description: 'Start time (ISO format)',
                },
                endTime: {
                  type: 'string',
                  description: 'End time (ISO format)',
                },
                interval: {
                  type: 'string',
                  description: 'Candle interval (OneMinute, FiveMinutes, etc.)',
                },
              },
              required: ['symbolId', 'startTime', 'endTime', 'interval'],
            },
          },
          {
            name: 'refresh_token',
            description: 'Refresh the API access token',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        const client = await this.initializeClient();

        switch (name) {
          case 'get_accounts':
            const accounts = await client.getAccounts();
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(accounts, null, 2),
                },
              ],
            };

          case 'get_positions':
            if (!args?.accountNumber) {
              throw new McpError(ErrorCode.InvalidParams, 'accountNumber is required');
            }
            const positions = await client.getPositions(args.accountNumber as string);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(positions, null, 2),
                },
              ],
            };

          case 'get_balances':
            if (!args?.accountNumber) {
              throw new McpError(ErrorCode.InvalidParams, 'accountNumber is required');
            }
            const balances = await client.getBalances(args.accountNumber as string);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(balances, null, 2),
                },
              ],
            };

          case 'get_quotes':
            if (!args?.symbolIds || !Array.isArray(args.symbolIds)) {
              throw new McpError(ErrorCode.InvalidParams, 'symbolIds array is required');
            }
            const quotes = await client.getQuotes(args.symbolIds as number[]);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(quotes, null, 2),
                },
              ],
            };

          case 'search_symbols':
            if (!args?.prefix) {
              throw new McpError(ErrorCode.InvalidParams, 'prefix is required');
            }
            const symbols = await client.searchSymbols(
              args.prefix as string,
              (args.offset as number) || 0
            );
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(symbols, null, 2),
                },
              ],
            };

          case 'get_symbol':
            if (!args?.symbolId) {
              throw new McpError(ErrorCode.InvalidParams, 'symbolId is required');
            }
            const symbolDetails = await client.getSymbol(args.symbolId as number);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(symbolDetails, null, 2),
                },
              ],
            };

          case 'get_orders':
            if (!args?.accountNumber) {
              throw new McpError(ErrorCode.InvalidParams, 'accountNumber is required');
            }
            const orders = await client.getOrders(
              args.accountNumber as string,
              args.startTime as string,
              args.endTime as string,
              args.stateFilter as string
            );
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(orders, null, 2),
                },
              ],
            };

          case 'get_candles':
            if (!args?.symbolId || !args?.startTime || !args?.endTime || !args?.interval) {
              throw new McpError(
                ErrorCode.InvalidParams,
                'symbolId, startTime, endTime, and interval are required'
              );
            }
            const candles = await client.getCandles(
              args.symbolId as number,
              args.startTime as string,
              args.endTime as string,
              args.interval as string
            );
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(candles, null, 2),
                },
              ],
            };

          case 'refresh_token':
            const tokenData = await client.refreshToken();
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    message: 'Token refreshed successfully',
                    expires_in: tokenData.expires_in,
                    api_server: tokenData.api_server,
                  }, null, 2),
                },
              ],
            };

          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }

        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${errorMessage}`);
      }
    });
  }

  private setupResourceHandlers(): void {
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [],
      };
    });
  }

  private setupPromptHandlers(): void {
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return {
        prompts: [
          {
            name: 'portfolio_summary',
            description: 'Get a comprehensive portfolio summary with account balances, positions, and performance',
            arguments: [
              {
                name: 'accountNumber',
                description: 'The account number to analyze (optional - will use first account if not provided)',
                required: false,
              },
            ],
          },
          {
            name: 'stock_analysis',
            description: 'Analyze a specific stock with current quotes, symbol information, and recent performance',
            arguments: [
              {
                name: 'symbol',
                description: 'Stock symbol to analyze (e.g., AAPL, TSLA, MSFT)',
                required: true,
              },
            ],
          },
          {
            name: 'trading_opportunities',
            description: 'Identify potential trading opportunities based on current positions and market data',
            arguments: [
              {
                name: 'accountNumber',
                description: 'The account number to analyze (optional - will use first account if not provided)',
                required: false,
              },
              {
                name: 'riskLevel',
                description: 'Risk tolerance level: conservative, moderate, or aggressive',
                required: false,
              },
            ],
          },
        ],
      };
    });

    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        const client = await this.initializeClient();

        switch (name) {
          case 'portfolio_summary':
            const accounts = await client.getAccounts();
            const accountNumber = args?.accountNumber || accounts[0]?.number;
            
            if (!accountNumber) {
              throw new McpError(ErrorCode.InvalidParams, 'No account found');
            }

            const [positions, balances] = await Promise.all([
              client.getPositions(accountNumber),
              client.getBalances(accountNumber)
            ]);

            return {
              description: `Portfolio summary for account ${accountNumber}`,
              messages: [
                {
                  role: 'user',
                  content: {
                    type: 'text',
                    text: `Please provide a comprehensive portfolio analysis for Questrade account ${accountNumber}. Here's the data:

**Account Balances:**
${JSON.stringify(balances, null, 2)}

**Current Positions:**
${JSON.stringify(positions, null, 2)}

Please analyze:
1. Total portfolio value and cash position
2. Asset allocation breakdown
3. Individual position performance
4. Any notable concentrations or risks
5. Recommendations for portfolio optimization`
                  }
                }
              ]
            };

          case 'stock_analysis':
            const symbol = args?.symbol;
            if (!symbol) {
              throw new McpError(ErrorCode.InvalidParams, 'symbol is required');
            }

            const symbols = await client.searchSymbols(symbol, 0);
            if (symbols.length === 0) {
              throw new McpError(ErrorCode.InvalidParams, `No symbols found for "${symbol}"`);
            }

            const symbolData = symbols[0];
            const quotes = await client.getQuotes([symbolData.symbolId]);

            return {
              description: `Stock analysis for ${symbol}`,
              messages: [
                {
                  role: 'user',
                  content: {
                    type: 'text',
                    text: `Please provide a detailed stock analysis for ${symbol}. Here's the current data:

**Symbol Information:**
${JSON.stringify(symbolData, null, 2)}

**Current Quote:**
${JSON.stringify(quotes[0], null, 2)}

Please analyze:
1. Current price and recent performance
2. Key financial metrics
3. Trading volume and liquidity
4. Technical indicators
5. Investment recommendation (buy/hold/sell)
6. Risk assessment`
                  }
                }
              ]
            };

          case 'trading_opportunities':
            const allAccounts = await client.getAccounts();
            const targetAccount = args?.accountNumber || allAccounts[0]?.number;
            
            if (!targetAccount) {
              throw new McpError(ErrorCode.InvalidParams, 'No account found');
            }

            const [accountPositions, accountBalances] = await Promise.all([
              client.getPositions(targetAccount),
              client.getBalances(targetAccount)
            ]);

            const riskLevel = args?.riskLevel || 'moderate';

            return {
              description: `Trading opportunities analysis for account ${targetAccount}`,
              messages: [
                {
                  role: 'user',
                  content: {
                    type: 'text',
                    text: `Please identify trading opportunities for Questrade account ${targetAccount} with ${riskLevel} risk tolerance. Here's the current portfolio data:

**Account Balances:**
${JSON.stringify(accountBalances, null, 2)}

**Current Positions:**
${JSON.stringify(accountPositions, null, 2)}

**Risk Level:** ${riskLevel}

Please provide:
1. Analysis of current portfolio allocation
2. Identification of overweight/underweight positions
3. Specific trading opportunities based on risk level
4. Sector diversification recommendations
5. Cash deployment strategies
6. Risk management considerations`
                  }
                }
              ]
            };

          default:
            throw new McpError(ErrorCode.InvalidParams, `Unknown prompt: ${name}`);
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new McpError(ErrorCode.InternalError, `Prompt execution failed: ${errorMessage}`);
      }
    });
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      process.stderr.write(`[MCP Error] ${error}\n`);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    process.stderr.write('Questrade MCP server running on stdio\n');
  }
}

const server = new QuestradeServer();
server.run().catch((error) => {
  process.stderr.write(`Failed to start server: ${error}\n`);
  process.exit(1);
});