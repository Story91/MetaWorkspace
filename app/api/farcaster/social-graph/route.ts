import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const NEYNAR_API_URL = 'https://api.neynar.com/v2';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fid = searchParams.get('fid');
    const limit = searchParams.get('limit') || '100';

    if (!fid) {
      return NextResponse.json(
        { error: 'FID is required' },
        { status: 400 }
      );
    }

    if (!process.env.NEYNAR_API_KEY) {
      return NextResponse.json(
        { error: 'Farcaster API not configured' },
        { status: 500 }
      );
    }

    console.log(`Fetching social graph for FID: ${fid}`);

    // Fetch following and followers in parallel
    const [followingResponse, followersResponse] = await Promise.allSettled([
      axios.get(`${NEYNAR_API_URL}/following?fid=${fid}&limit=${limit}`, {
        headers: { 'API_KEY': process.env.NEYNAR_API_KEY }
      }),
      axios.get(`${NEYNAR_API_URL}/followers?fid=${fid}&limit=${limit}`, {
        headers: { 'API_KEY': process.env.NEYNAR_API_KEY }
      })
    ]);

    // Process following data
    let following = [];
    if (followingResponse.status === 'fulfilled') {
      following = followingResponse.value.data.users.map((user: any) => ({
        fid: user.fid,
        username: user.username,
        displayName: user.display_name || user.username,
        pfpUrl: user.pfp_url || '',
        followerCount: user.follower_count || 0,
        powerBadge: user.power_badge || false,
        bio: user.profile?.bio?.text || ''
      }));
    } else {
      console.error('Failed to fetch following:', followingResponse.reason);
    }

    // Process followers data
    let followers = [];
    if (followersResponse.status === 'fulfilled') {
      followers = followersResponse.value.data.users.map((user: any) => ({
        fid: user.fid,
        username: user.username,
        displayName: user.display_name || user.username,
        pfpUrl: user.pfp_url || '',
        followerCount: user.follower_count || 0,
        powerBadge: user.power_badge || false,
        bio: user.profile?.bio?.text || ''
      }));
    } else {
      console.error('Failed to fetch followers:', followersResponse.reason);
    }

    // Calculate mutual connections
    const followingFids = new Set(following.map(user => user.fid));
    const mutualConnections = followers.filter(follower => 
      followingFids.has(follower.fid)
    );

    // Get engagement metrics if available
    let recentCasts = [];
    try {
      const castsResponse = await axios.get(
        `${NEYNAR_API_URL}/casts?fid=${fid}&limit=25`,
        {
          headers: { 'API_KEY': process.env.NEYNAR_API_KEY }
        }
      );
      
      recentCasts = castsResponse.data.casts.map((cast: any) => ({
        hash: cast.hash,
        text: cast.text,
        timestamp: cast.timestamp,
        replies: cast.replies?.count || 0,
        reactions: cast.reactions?.count || 0,
        recasts: cast.recasts?.count || 0
      })).slice(0, 10); // Keep only last 10 casts
    } catch (castError) {
      console.error('Failed to fetch casts:', castError);
    }

    // Calculate engagement statistics
    const totalEngagement = recentCasts.reduce((sum: number, cast: any) => 
      sum + cast.replies + cast.reactions + cast.recasts, 0
    );
    
    const avgEngagement = recentCasts.length > 0 
      ? Math.round(totalEngagement / recentCasts.length) 
      : 0;

    return NextResponse.json({
      success: true,
      socialGraph: {
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
      }
    });

  } catch (error) {
    console.error('Social Graph API Error:', error);

    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 500;
      
      if (status === 401) {
        return NextResponse.json(
          { error: 'Invalid Neynar API key' },
          { status: 500 }
        );
      }
      
      if (status === 404) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
      
      if (status === 429) {
        return NextResponse.json(
          { error: 'API rate limit exceeded' },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { error: `Farcaster API error: ${error.response?.data?.message || error.message}` },
        { status }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to fetch social graph',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
