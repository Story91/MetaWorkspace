import { neon } from '@neondatabase/serverless';

export interface AIConversation {
  conversation_id: string;
  user_id: string;
  room_id: string;
  messages: unknown[];
  context?: unknown;
  created_at: Date;
}

export interface UserSession {
  farcaster_id: string;
  wallet_address?: string;
  last_active: Date;
  preferences?: unknown;
}

export interface CachedRoom {
  room_id: string;
  name: string;
  creator: string;
  is_public: boolean;
  created_at: Date;
  last_synced: Date;
}

export interface AIAccessCache {
  wallet_address: string;
  has_access: boolean;
  granted_at?: Date;
  transaction_hash?: string;
  cached_at: Date;
  last_verified: Date;
}

export class DatabaseService {
  private sql!: ReturnType<typeof neon>;
  private isConnected: boolean = false;

  constructor() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.warn('DATABASE_URL not configured, database features will be disabled');
      return;
    }

    try {
      this.sql = neon(databaseUrl);
      this.isConnected = true;
      this.initializeTables();
    } catch (error) {
      console.error('Failed to initialize database:', error);
      this.isConnected = false;
    }
  }

  private async initializeTables() {
    if (!this.isConnected) return;

    try {
      // Create AI conversations table
      await this.sql`
        CREATE TABLE IF NOT EXISTS ai_conversations (
          conversation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR NOT NULL,
          room_id VARCHAR NOT NULL,
          messages JSONB NOT NULL,
          context JSONB,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `;

      // Create user sessions table
      await this.sql`
        CREATE TABLE IF NOT EXISTS user_sessions (
          farcaster_id VARCHAR PRIMARY KEY,
          wallet_address VARCHAR,
          last_active TIMESTAMP DEFAULT NOW(),
          preferences JSONB
        )
      `;

      // Create cached rooms table
      await this.sql`
        CREATE TABLE IF NOT EXISTS cached_rooms (
          room_id VARCHAR PRIMARY KEY,
          name VARCHAR NOT NULL,
          creator VARCHAR NOT NULL,
          is_public BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW(),
          last_synced TIMESTAMP DEFAULT NOW()
        )
      `;

      // Create AI access cache table
      await this.sql`
        CREATE TABLE IF NOT EXISTS ai_access_cache (
          wallet_address VARCHAR PRIMARY KEY,
          has_access BOOLEAN NOT NULL,
          granted_at TIMESTAMP,
          transaction_hash VARCHAR,
          cached_at TIMESTAMP DEFAULT NOW(),
          last_verified TIMESTAMP DEFAULT NOW()
        )
      `;

      // Create user statistics table
      await this.sql`
        CREATE TABLE IF NOT EXISTS user_stats (
          wallet_address VARCHAR PRIMARY KEY,
          nft_count INTEGER DEFAULT 0,
          hours_logged DECIMAL(10,2) DEFAULT 0,
          tasks_completed INTEGER DEFAULT 0,
          ai_access BOOLEAN DEFAULT false,
          last_updated TIMESTAMP DEFAULT NOW()
        )
      `;

      // Create global statistics table
      await this.sql`
        CREATE TABLE IF NOT EXISTS global_stats (
          id INTEGER PRIMARY KEY DEFAULT 1,
          total_nfts INTEGER DEFAULT 0,
          total_users INTEGER DEFAULT 0,
          total_hours DECIMAL(10,2) DEFAULT 0,
          total_ai_users INTEGER DEFAULT 0,
          last_updated TIMESTAMP DEFAULT NOW()
        )
      `;

      // Create indexes for faster lookups
      await this.sql`
        CREATE INDEX IF NOT EXISTS idx_ai_access_wallet 
        ON ai_access_cache(wallet_address);
      `;
      
      await this.sql`
        CREATE INDEX IF NOT EXISTS idx_user_stats_wallet 
        ON user_stats(wallet_address);
      `;

      console.log('Database tables initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database tables:', error);
    }
  }

  // AI Conversations
  async saveConversation(userId: string, roomId: string, messages: Record<string, unknown>[], context?: Record<string, unknown>): Promise<string> {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      const result = await this.sql`
        INSERT INTO ai_conversations (user_id, room_id, messages, context)
        VALUES (${userId}, ${roomId}, ${JSON.stringify(messages)}, ${context ? JSON.stringify(context) : null})
        RETURNING conversation_id
      `;
      
      return (result as { conversation_id: string }[])[0]?.conversation_id || '';
    } catch (error) {
      console.error('Failed to save conversation:', error);
      throw error;
    }
  }

  async getConversations(userId: string, roomId?: string): Promise<AIConversation[]> {
    if (!this.isConnected) {
      return [];
    }

    try {
      let result;
      if (roomId) {
        result = await this.sql`
          SELECT * FROM ai_conversations 
          WHERE user_id = ${userId} AND room_id = ${roomId}
          ORDER BY created_at DESC
        `;
      } else {
        result = await this.sql`
          SELECT * FROM ai_conversations 
          WHERE user_id = ${userId}
          ORDER BY created_at DESC
        `;
      }
      
      return (result as AIConversation[]).map((row: AIConversation) => ({
        ...row,
        created_at: new Date(row.created_at)
      }));
    } catch (error) {
      console.error('Failed to get conversations:', error);
      return [];
    }
  }

  // User Sessions
  async updateUserSession(farcasterId: string, walletAddress?: string, preferences?: unknown): Promise<void> {
    if (!this.isConnected) return;

    try {
      await this.sql`
        INSERT INTO user_sessions (farcaster_id, wallet_address, preferences, last_active)
        VALUES (${farcasterId}, ${walletAddress || null}, ${preferences ? JSON.stringify(preferences) : null}, NOW())
        ON CONFLICT (farcaster_id) 
        DO UPDATE SET 
          wallet_address = EXCLUDED.wallet_address,
          preferences = EXCLUDED.preferences,
          last_active = NOW()
      `;
    } catch (error) {
      console.error('Failed to update user session:', error);
    }
  }

  async getUserSession(farcasterId: string): Promise<UserSession | null> {
    if (!this.isConnected) return null;

    try {
      const result = await this.sql`
        SELECT * FROM user_sessions WHERE farcaster_id = ${farcasterId}
      `;
      
      if ((result as UserSession[]).length > 0) {
        const row = (result as UserSession[])[0];
        return {
          ...row,
          last_active: new Date(row.last_active)
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to get user session:', error);
      return null;
    }
  }

  // Room Caching
  async cacheRoom(room: CachedRoom): Promise<void> {
    if (!this.isConnected) return;

    try {
      await this.sql`
        INSERT INTO cached_rooms (room_id, name, creator, is_public, created_at, last_synced)
        VALUES (${room.room_id}, ${room.name}, ${room.creator}, ${room.is_public}, ${room.created_at.toISOString()}, NOW())
        ON CONFLICT (room_id) 
        DO UPDATE SET 
          name = EXCLUDED.name,
          creator = EXCLUDED.creator,
          is_public = EXCLUDED.is_public,
          last_synced = NOW()
      `;
    } catch (error) {
      console.error('Failed to cache room:', error);
    }
  }

  async getCachedRooms(): Promise<CachedRoom[]> {
    if (!this.isConnected) return [];

    try {
      const result = await this.sql`
        SELECT * FROM cached_rooms ORDER BY last_synced DESC
      `;
      
      return (result as CachedRoom[]).map((row: CachedRoom) => ({
        ...row,
        created_at: new Date(row.created_at),
        last_synced: new Date(row.last_synced)
      }));
    } catch (error) {
      console.error('Failed to get cached rooms:', error);
      return [];
    }
  }

  // Health check
  async isHealthy(): Promise<boolean> {
    if (!this.isConnected) return false;

    try {
      await this.sql`SELECT 1`;
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  // AI Access Cache Management
  async getAIAccessCache(walletAddress: string): Promise<AIAccessCache | null> {
    if (!this.isConnected) return null;

    try {
      const result = await this.sql`
        SELECT * FROM ai_access_cache 
        WHERE wallet_address = ${walletAddress.toLowerCase()}
      `;

      if (!Array.isArray(result) || result.length === 0) return null;

      const row = result[0] as Record<string, unknown>;
      return {
        wallet_address: row.wallet_address as string,
        has_access: row.has_access as boolean,
        granted_at: row.granted_at ? new Date(row.granted_at as string | number) : undefined,
        transaction_hash: row.transaction_hash as string | undefined,
        cached_at: new Date(row.cached_at as string | number),
        last_verified: new Date(row.last_verified as string | number)
      };
    } catch (error) {
      console.error('Failed to get AI access cache:', error);
      return null;
    }
  }

  async setAIAccessCache(
    walletAddress: string, 
    hasAccess: boolean, 
    transactionHash?: string,
    grantedAt?: Date
  ): Promise<boolean> {
    if (!this.isConnected) return false;

    try {
      await this.sql`
        INSERT INTO ai_access_cache (
          wallet_address, 
          has_access, 
          granted_at, 
          transaction_hash,
          cached_at,
          last_verified
        ) VALUES (
          ${walletAddress.toLowerCase()}, 
          ${hasAccess}, 
          ${grantedAt || null}, 
          ${transactionHash || null},
          NOW(),
          NOW()
        )
        ON CONFLICT (wallet_address) 
        DO UPDATE SET 
          has_access = ${hasAccess},
          granted_at = COALESCE(${grantedAt || null}, ai_access_cache.granted_at),
          transaction_hash = COALESCE(${transactionHash || null}, ai_access_cache.transaction_hash),
          last_verified = NOW()
      `;

      // AI access cached silently
      return true;
    } catch (error) {
      console.error('Failed to set AI access cache:', error);
      return false;
    }
  }

  async updateAIAccessVerification(walletAddress: string): Promise<boolean> {
    if (!this.isConnected) return false;

    try {
      await this.sql`
        UPDATE ai_access_cache 
        SET last_verified = NOW()
        WHERE wallet_address = ${walletAddress.toLowerCase()}
      `;
      return true;
    } catch (error) {
      console.error('Failed to update AI access verification:', error);
      return false;
    }
  }

  // User Statistics Management
  async updateUserStats(
    walletAddress: string,
    nftCount: number,
    hoursLogged: number,
    tasksCompleted: number,
    aiAccess: boolean
  ): Promise<boolean> {
    if (!this.isConnected) return false;

    try {
      await this.sql`
        INSERT INTO user_stats (
          wallet_address, 
          nft_count, 
          hours_logged, 
          tasks_completed, 
          ai_access,
          last_updated
        ) VALUES (
          ${walletAddress.toLowerCase()}, 
          ${nftCount}, 
          ${hoursLogged}, 
          ${tasksCompleted}, 
          ${aiAccess},
          NOW()
        )
        ON CONFLICT (wallet_address) 
        DO UPDATE SET 
          nft_count = ${nftCount},
          hours_logged = ${hoursLogged},
          tasks_completed = ${tasksCompleted},
          ai_access = ${aiAccess},
          last_updated = NOW()
      `;

      return true;
    } catch (error) {
      console.error('Failed to update user stats:', error);
      return false;
    }
  }

  async getUserStats(walletAddress: string): Promise<Record<string, unknown> | null> {
    if (!this.isConnected) return null;

    try {
      const result = await this.sql`
        SELECT * FROM user_stats 
        WHERE wallet_address = ${walletAddress.toLowerCase()}
      `;

      if (!Array.isArray(result) || result.length === 0) return null;
      return result[0] as Record<string, unknown>;
    } catch (error) {
      console.error('Failed to get user stats:', error);
      return null;
    }
  }

  async updateGlobalStats(
    totalNfts: number,
    totalUsers: number,
    totalHours: number,
    totalAiUsers: number
  ): Promise<boolean> {
    if (!this.isConnected) return false;

    try {
      await this.sql`
        INSERT INTO global_stats (
          id, total_nfts, total_users, total_hours, total_ai_users, last_updated
        ) VALUES (
          1, ${totalNfts}, ${totalUsers}, ${totalHours}, ${totalAiUsers}, NOW()
        )
        ON CONFLICT (id) 
        DO UPDATE SET 
          total_nfts = ${totalNfts},
          total_users = ${totalUsers},
          total_hours = ${totalHours},
          total_ai_users = ${totalAiUsers},
          last_updated = NOW()
      `;

      return true;
    } catch (error) {
      console.error('Failed to update global stats:', error);
      return false;
    }
  }

  async getGlobalStats(): Promise<Record<string, unknown> | null> {
    if (!this.isConnected) return null;

    try {
      const result = await this.sql`
        SELECT * FROM global_stats WHERE id = 1
      `;

      if (!Array.isArray(result) || result.length === 0) return null;
      return result[0] as Record<string, unknown>;
    } catch (error) {
      console.error('Failed to get global stats:', error);
      return null;
    }
  }

  // Cleanup old data
  async cleanupOldData(daysOld: number = 30): Promise<void> {
    if (!this.isConnected) return;

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      await this.sql`
        DELETE FROM ai_conversations 
        WHERE created_at < ${cutoffDate.toISOString()}
      `;

      // Also cleanup old AI access cache (if user hasn't been verified in 7 days)
      await this.sql`
        DELETE FROM ai_access_cache 
        WHERE last_verified < NOW() - INTERVAL '7 days'
      `;

      console.log(`Cleaned up data older than ${daysOld} days`);
    } catch (error) {
      console.error('Failed to cleanup old data:', error);
    }
  }
}

// Export singleton instance
export const databaseService = new DatabaseService();
