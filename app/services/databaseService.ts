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

      console.log('Database tables initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database tables:', error);
    }
  }

  // AI Conversations
  async saveConversation(userId: string, roomId: string, messages: unknown[], context?: unknown): Promise<string> {
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

      console.log(`Cleaned up conversations older than ${daysOld} days`);
    } catch (error) {
      console.error('Failed to cleanup old data:', error);
    }
  }
}

// Export singleton instance
export const databaseService = new DatabaseService();
