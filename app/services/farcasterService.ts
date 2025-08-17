/**
 * Farcaster Service for MetaWorkspace
 * Real Neynar API integration replacing mock data
 */

import axios from 'axios';

export interface FarcasterProfile {
  fid: string;
  username: string;
  displayName: string;
  bio: string;
  pfpUrl: string;
  custodyAddress: string;
  followerCount: number;
  followingCount: number;
  verifications: string[];
  activeStatus: string;
  powerBadge: boolean;
  profile: {
    location: string;
    website: string;
  };
}

export interface SocialGraphUser {
  fid: string;
  username: string;
  displayName: string;
  pfpUrl: string;
  followerCount: number;
  powerBadge: boolean;
  bio: string;
}

export interface SocialGraph {
  following: {
    count: number;
    users: SocialGraphUser[];
  };
  followers: {
    count: number;
    users: SocialGraphUser[];
  };
  mutualConnections: {
    count: number;
    users: SocialGraphUser[];
  };
  engagement: {
    recentCasts: number;
    totalEngagement: number;
    avgEngagement: number;
    topCasts: Array<{
      hash: string;
      text: string;
      timestamp: string;
      replies: number;
      reactions: number;
      recasts: number;
    }>;
  };
  stats: {
    followingCount: number;
    followersCount: number;
    mutualCount: number;
    engagementRate: number;
    fetchedAt: string;
  };
}

export interface Cast {
  hash: string;
  text: string;
  timestamp: string;
  author: SocialGraphUser;
  replies: number;
  reactions: number;
  recasts: number;
  embeds?: Array<{
    url: string;
    metadata?: any;
  }>;
}

export class FarcasterService {
  private apiKey: string;
  private apiUrl = 'https://api.neynar.com/v2';
  private isConfigured: boolean;

  constructor() {
    this.apiKey = process.env.NEYNAR_API_KEY || '';
    this.isConfigured = !!this.apiKey;

    if (!this.isConfigured) {
      console.warn('Farcaster Service: Neynar API key not configured, falling back to mock mode');
    }
  }

  /**
   * Get user profile by FID or username
   */
  async getUserProfile(identifier: string, byUsername = false): Promise<FarcasterProfile> {
    if (!this.isConfigured) {
      return this.mockProfile(identifier);
    }

    try {
      let response;
      
      if (byUsername) {
        response = await axios.get(
          `${this.apiUrl}/user/by_username?username=${identifier}`,
          { headers: { 'API_KEY': this.apiKey } }
        );
      } else {
        response = await axios.get(
          `${this.apiUrl}/user/bulk?fids=${identifier}`,
          { headers: { 'API_KEY': this.apiKey } }
        );
      }

      const userData = byUsername ? response.data.user : response.data.users[0];

      if (!userData) {
        throw new Error('User not found');
      }

      return {
        fid: userData.fid.toString(),
        username: userData.username,
        displayName: userData.display_name || userData.username,
        bio: userData.profile?.bio?.text || '',
        pfpUrl: userData.pfp_url || '',
        custodyAddress: userData.custody_address,
        followerCount: userData.follower_count || 0,
        followingCount: userData.following_count || 0,
        verifications: userData.verifications || [],
        activeStatus: userData.active_status || 'inactive',
        powerBadge: userData.power_badge || false,
        profile: {
          location: userData.profile?.location?.description || '',
          website: userData.profile?.location?.description || ''
        }
      };

    } catch (error) {
      console.error('Farcaster profile fetch failed:', error);
      
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 404) {
          throw new Error('User not found');
        }
        if (status === 429) {
          throw new Error('API rate limit exceeded');
        }
        if (status === 401) {
          throw new Error('Invalid API credentials');
        }
      }
      
      throw new Error(`Failed to fetch profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user's social graph (following/followers)
   */
  async getSocialGraph(fid: string, limit = 100): Promise<SocialGraph> {
    if (!this.isConfigured) {
      return this.mockSocialGraph(fid);
    }

    try {
      // Fetch following and followers in parallel
      const [followingResponse, followersResponse] = await Promise.allSettled([
        axios.get(`${this.apiUrl}/following?fid=${fid}&limit=${limit}`, {
          headers: { 'API_KEY': this.apiKey }
        }),
        axios.get(`${this.apiUrl}/followers?fid=${fid}&limit=${limit}`, {
          headers: { 'API_KEY': this.apiKey }
        })
      ]);

      // Process following data
      let following: SocialGraphUser[] = [];
      if (followingResponse.status === 'fulfilled') {
        following = followingResponse.value.data.users.map(this.transformUser);
      }

      // Process followers data
      let followers: SocialGraphUser[] = [];
      if (followersResponse.status === 'fulfilled') {
        followers = followersResponse.value.data.users.map(this.transformUser);
      }

      // Calculate mutual connections
      const followingFids = new Set(following.map(user => user.fid));
      const mutualConnections = followers.filter(follower => 
        followingFids.has(follower.fid)
      );

      // Get recent casts for engagement metrics
      let recentCasts: Cast[] = [];
      let totalEngagement = 0;
      
      try {
        const castsResponse = await axios.get(
          `${this.apiUrl}/casts?fid=${fid}&limit=25`,
          { headers: { 'API_KEY': this.apiKey } }
        );
        
        recentCasts = castsResponse.data.casts.map((cast: any) => ({
          hash: cast.hash,
          text: cast.text,
          timestamp: cast.timestamp,
          author: this.transformUser(cast.author),
          replies: cast.replies?.count || 0,
          reactions: cast.reactions?.count || 0,
          recasts: cast.recasts?.count || 0,
          embeds: cast.embeds || []
        }));

        totalEngagement = recentCasts.reduce((sum, cast) => 
          sum + cast.replies + cast.reactions + cast.recasts, 0
        );
      } catch (castError) {
        console.error('Failed to fetch casts:', castError);
      }

      const avgEngagement = recentCasts.length > 0 
        ? Math.round(totalEngagement / recentCasts.length) 
        : 0;

      return {
        following: {
          count: following.length,
          users: following
        },
        followers: {
          count: followers.length,
          users: followers
        },
        mutualConnections: {
          count: mutualConnections.length,
          users: mutualConnections
        },
        engagement: {
          recentCasts: recentCasts.length,
          totalEngagement,
          avgEngagement,
          topCasts: recentCasts
            .sort((a, b) => (b.replies + b.reactions + b.recasts) - (a.replies + a.reactions + a.recasts))
            .slice(0, 3)
        },
        stats: {
          followingCount: following.length,
          followersCount: followers.length,
          mutualCount: mutualConnections.length,
          engagementRate: avgEngagement,
          fetchedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('Social graph fetch failed:', error);
      throw new Error(`Failed to fetch social graph: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user's recent casts
   */
  async getUserCasts(fid: string, limit = 25): Promise<Cast[]> {
    if (!this.isConfigured) {
      return this.mockCasts(fid);
    }

    try {
      const response = await axios.get(
        `${this.apiUrl}/casts?fid=${fid}&limit=${limit}`,
        { headers: { 'API_KEY': this.apiKey } }
      );

      return response.data.casts.map((cast: any) => ({
        hash: cast.hash,
        text: cast.text,
        timestamp: cast.timestamp,
        author: this.transformUser(cast.author),
        replies: cast.replies?.count || 0,
        reactions: cast.reactions?.count || 0,
        recasts: cast.recasts?.count || 0,
        embeds: cast.embeds || []
      }));

    } catch (error) {
      console.error('User casts fetch failed:', error);
      throw new Error(`Failed to fetch casts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search users by query
   */
  async searchUsers(query: string, limit = 20): Promise<SocialGraphUser[]> {
    if (!this.isConfigured) {
      return this.mockSearchResults(query);
    }

    try {
      const response = await axios.get(
        `${this.apiUrl}/user/search?q=${encodeURIComponent(query)}&limit=${limit}`,
        { headers: { 'API_KEY': this.apiKey } }
      );

      return response.data.result.users.map(this.transformUser);

    } catch (error) {
      console.error('User search failed:', error);
      return [];
    }
  }

  /**
   * Verify if user follows another user
   */
  async checkFollowStatus(sourceFid: string, targetFid: string): Promise<boolean> {
    if (!this.isConfigured) {
      return Math.random() > 0.5; // Mock random follow status
    }

    try {
      const response = await axios.get(
        `${this.apiUrl}/following?fid=${sourceFid}&limit=1000`,
        { headers: { 'API_KEY': this.apiKey } }
      );

      const following = response.data.users;
      return following.some((user: any) => user.fid.toString() === targetFid);

    } catch (error) {
      console.error('Follow status check failed:', error);
      return false;
    }
  }

  /**
   * Transform API user data to our format
   */
  private transformUser(user: any): SocialGraphUser {
    return {
      fid: user.fid.toString(),
      username: user.username,
      displayName: user.display_name || user.username,
      pfpUrl: user.pfp_url || '',
      followerCount: user.follower_count || 0,
      powerBadge: user.power_badge || false,
      bio: user.profile?.bio?.text || ''
    };
  }

  /**
   * Mock profile for development
   */
  private async mockProfile(identifier: string): Promise<FarcasterProfile> {
    console.log('🔧 Using mock Farcaster profile (Neynar not configured)');
    
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      fid: identifier,
      username: `user-${identifier}`,
      displayName: `Mock User ${identifier}`,
      bio: 'Mock bio for development purposes',
      pfpUrl: '/api/placeholder-avatar',
      custodyAddress: '0x1234567890123456789012345678901234567890',
      followerCount: Math.floor(Math.random() * 1000),
      followingCount: Math.floor(Math.random() * 500),
      verifications: [],
      activeStatus: 'active',
      powerBadge: Math.random() > 0.8,
      profile: {
        location: 'Mock Location',
        website: 'https://example.com'
      }
    };
  }

  /**
   * Mock social graph for development
   */
  private async mockSocialGraph(fid: string): Promise<SocialGraph> {
    console.log('🔧 Using mock social graph (Neynar not configured)');
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    const mockUsers = Array.from({ length: 10 }, (_, i) => ({
      fid: (parseInt(fid) + i + 1).toString(),
      username: `mockuser${i + 1}`,
      displayName: `Mock User ${i + 1}`,
      pfpUrl: '/api/placeholder-avatar',
      followerCount: Math.floor(Math.random() * 500),
      powerBadge: Math.random() > 0.9,
      bio: `Mock bio for user ${i + 1}`
    }));

    return {
      following: {
        count: mockUsers.length,
        users: mockUsers
      },
      followers: {
        count: mockUsers.length + 5,
        users: [...mockUsers, ...mockUsers.slice(0, 5)]
      },
      mutualConnections: {
        count: 3,
        users: mockUsers.slice(0, 3)
      },
      engagement: {
        recentCasts: 12,
        totalEngagement: 45,
        avgEngagement: 4,
        topCasts: []
      },
      stats: {
        followingCount: mockUsers.length,
        followersCount: mockUsers.length + 5,
        mutualCount: 3,
        engagementRate: 4,
        fetchedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Mock casts for development
   */
  private async mockCasts(fid: string): Promise<Cast[]> {
    console.log('🔧 Using mock casts (Neynar not configured)');
    
    return [
      {
        hash: 'mock-hash-1',
        text: `Mock cast from user ${fid} for development purposes`,
        timestamp: new Date().toISOString(),
        author: {
          fid,
          username: `user-${fid}`,
          displayName: `User ${fid}`,
          pfpUrl: '/api/placeholder-avatar',
          followerCount: 100,
          powerBadge: false,
          bio: 'Mock user'
        },
        replies: Math.floor(Math.random() * 10),
        reactions: Math.floor(Math.random() * 20),
        recasts: Math.floor(Math.random() * 5)
      }
    ];
  }

  /**
   * Mock search results for development
   */
  private async mockSearchResults(query: string): Promise<SocialGraphUser[]> {
    console.log('🔧 Using mock search results (Neynar not configured)');
    
    return [
      {
        fid: '1',
        username: query.toLowerCase(),
        displayName: `Mock ${query}`,
        pfpUrl: '/api/placeholder-avatar',
        followerCount: Math.floor(Math.random() * 1000),
        powerBadge: false,
        bio: `Mock search result for "${query}"`
      }
    ];
  }

  /**
   * Check if service is configured
   */
  isConfigured(): boolean {
    return this.isConfigured;
  }

  /**
   * Get service status
   */
  getStatus(): { configured: boolean; apiUrl: string; mode: string } {
    return {
      configured: this.isConfigured,
      apiUrl: this.apiUrl,
      mode: this.isConfigured ? 'production' : 'mock'
    };
  }
}

// Export singleton instance
export const farcasterService = new FarcasterService();

export default FarcasterService;
