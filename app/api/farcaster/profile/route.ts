import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const NEYNAR_API_URL = 'https://api.neynar.com/v2';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fid = searchParams.get('fid');
    const username = searchParams.get('username');

    if (!fid && !username) {
      return NextResponse.json(
        { error: 'Either fid or username is required' },
        { status: 400 }
      );
    }

    if (!process.env.NEYNAR_API_KEY) {
      return NextResponse.json(
        { error: 'Farcaster API not configured' },
        { status: 500 }
      );
    }

    let userData;

    if (fid) {
      // Get user by FID
      const response = await axios.get(
        `${NEYNAR_API_URL}/user/bulk?fids=${fid}`,
        {
          headers: {
            'API_KEY': process.env.NEYNAR_API_KEY
          }
        }
      );
      userData = response.data.users[0];
    } else if (username) {
      // Get user by username
      const response = await axios.get(
        `${NEYNAR_API_URL}/user/by_username?username=${username}`,
        {
          headers: {
            'API_KEY': process.env.NEYNAR_API_KEY
          }
        }
      );
      userData = response.data.user;
    }

    if (!userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Transform to our format
    const profile = {
      fid: userData.fid,
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

    return NextResponse.json({
      success: true,
      profile
    });

  } catch (error) {
    console.error('Farcaster Profile API Error:', error);

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
        error: 'Failed to fetch Farcaster profile',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
