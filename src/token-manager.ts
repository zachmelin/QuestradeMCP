import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface TokenData {
  refreshToken: string;
  accessToken?: string;
  apiUrl?: string;
  lastUpdated: string;
}

export class TokenManager {
  private tokenFilePath: string;

  constructor() {
    let defaultTokenDir: string;
    
    if (process.env.QUESTRADE_TOKEN_DIR) {
      defaultTokenDir = process.env.QUESTRADE_TOKEN_DIR;
    } else {
      try {
        defaultTokenDir = path.join(os.homedir(), '.questrade-mcp');
      } catch {
        defaultTokenDir = path.join(os.tmpdir(), 'questrade-mcp');
      }
    }
    
    this.tokenFilePath = path.join(defaultTokenDir, 'tokens.json');
    
    try {
      if (!fs.existsSync(defaultTokenDir)) {
        fs.mkdirSync(defaultTokenDir, { recursive: true });
      }
    } catch {
      // Directory creation failed - will fall back to environment variables
    }
  }

  async loadTokens(): Promise<{ refreshToken: string; accessToken?: string; apiUrl?: string }> {
    try {
      if (fs.existsSync(this.tokenFilePath)) {
        const tokenData: TokenData = JSON.parse(await fs.promises.readFile(this.tokenFilePath, 'utf8'));
        return {
          refreshToken: tokenData.refreshToken,
          accessToken: tokenData.accessToken,
          apiUrl: tokenData.apiUrl
        };
      }
    } catch (error) {
      // Fall back to environment variables on file read error
    }

    return {
      refreshToken: process.env.QUESTRADE_REFRESH_TOKEN!,
      accessToken: process.env.QUESTRADE_ACCESS_TOKEN,
      apiUrl: process.env.QUESTRADE_API_URL
    };
  }

  async saveTokens(refreshToken: string, accessToken?: string, apiUrl?: string): Promise<void> {
    try {
      const tokenData: TokenData = {
        refreshToken,
        accessToken,
        apiUrl,
        lastUpdated: new Date().toISOString()
      };

      await fs.promises.writeFile(this.tokenFilePath, JSON.stringify(tokenData, null, 2), 'utf8');
    } catch (error) {
      // Token save failed - will continue using environment variables
    }
  }

  getTokenFilePath(): string {
    return this.tokenFilePath;
  }

  async hasTokenFile(): Promise<boolean> {
    return fs.existsSync(this.tokenFilePath);
  }
}