#!/usr/bin/env node

// Simple Node.js version of the connection test (no TypeScript compilation needed)
import { QuestradeClient } from '../dist/questrade-client.js';
import { TokenManager } from '../dist/token-manager.js';
import dotenv from 'dotenv';

dotenv.config();

async function testConnection() {
  const refreshToken = process.env.QUESTRADE_REFRESH_TOKEN;
  
  if (!refreshToken) {
    console.error('❌ Missing QUESTRADE_REFRESH_TOKEN');
    console.log('Please get your refresh token from Questrade API Centre:');
    console.log('1. Log in to Questrade');
    console.log('2. Go to API Centre from the dropdown menu');
    console.log('3. Click "Generate new token"');
    console.log('4. Copy the token to your .env file');
    process.exit(1);
  }

  console.log('🔄 Testing Questrade API connection...');

  const tokenManager = new TokenManager();
  const tokens = await tokenManager.loadTokens();
  
  const config = {
    apiUrl: tokens.apiUrl || 'https://api01.iq.questrade.com',
    accessToken: tokens.accessToken || '',
    refreshToken: tokens.refreshToken,
  };

  console.log(`📍 API URL: ${config.apiUrl}`);
  const client = new QuestradeClient(config, tokenManager);

  try {
    if (!config.accessToken) {
      console.log('\n🔄 Getting access token from refresh token...');
      await client.refreshToken();
      console.log('✅ Access token obtained');
    }

    // Test basic API access
    console.log('\n1️⃣ Testing account access...');
    const accounts = await client.getAccounts();
    console.log(`✅ Found ${accounts.length} accounts`);
    
    if (accounts.length > 0) {
      const account = accounts[0];
      console.log(`   Account: ${account.number} (${account.type})`);
      
      // Test positions
      console.log('\n2️⃣ Testing positions access...');
      const positions = await client.getPositions(account.number);
      console.log(`✅ Found ${positions.length} positions`);
      
      // Test balances  
      console.log('\n3️⃣ Testing balances access...');
      const balances = await client.getBalances(account.number);
      console.log(`✅ Found ${balances.length} balance entries`);
      
      if (balances.length > 0) {
        console.log(`   Total Equity: $${balances[0].totalEquity?.toFixed(2) || 'N/A'} ${balances[0].currency}`);
      }
    }
    
    // Test symbol search
    console.log('\n4️⃣ Testing symbol search...');
    const symbols = await client.searchSymbols('AAPL', 0);
    console.log(`✅ Found ${symbols.length} symbols for "AAPL"`);
    
    console.log('\n🎉 All tests passed! Your Questrade MCP server is ready to use.');
    console.log('\nTo start the MCP server, run:');
    console.log('  npm start');
    
  } catch (error) {
    console.error('\n❌ Connection test failed:');
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
      
      if (error.message.includes('401') || error.message.includes('unauthorized')) {
        console.log('\n💡 Your refresh token may be expired. Generate a new one:');
        console.log('   1. Log in to Questrade API Centre');
        console.log('   2. Click "Generate new token"');
        console.log('   3. Update your .env file with the new token');
      }
    } else {
      console.error('   Unknown error occurred');
    }
    process.exit(1);
  }
}

testConnection();