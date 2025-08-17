# 🔧 MetaWorkspace Environment Setup Guide

## Required Environment Variables

Create `.env.local` file in the root directory with the following variables:

```env
# AI Integration
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4
WHISPER_API_ENDPOINT=https://api.openai.com/v1/audio/transcriptions

# Blockchain (Base L2)
NEXT_PUBLIC_RPC_URL=https://mainnet.base.org
NEXT_PUBLIC_VOICE_NFT_ADDRESS=0x...
NEXT_PUBLIC_VIDEO_NFT_ADDRESS=0x...
NEXT_PUBLIC_ROOM_MANAGER_ADDRESS=0x...
PRIVATE_KEY=0x...
BASESCAN_API_KEY=...

# IPFS Storage (Pinata)
PINATA_API_KEY=...
PINATA_SECRET_KEY=...
IPFS_GATEWAY_URL=https://gateway.pinata.cloud/ipfs/

# Farcaster Integration (Neynar)
NEYNAR_API_KEY=...
FARCASTER_APP_FID=...

# Database (Optional - Supabase for caching)
SUPABASE_URL=...
SUPABASE_ANON_KEY=...

# Security
NEXTAUTH_SECRET=...
JWT_SECRET=...

# App Configuration
NEXT_PUBLIC_URL=http://localhost:3000
NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME=MetaWorkspace
NEXT_PUBLIC_APP_HERO_IMAGE=/hero.gif
NEXT_PUBLIC_APP_SPLASH_IMAGE=/splash.png
NEXT_PUBLIC_SPLASH_BACKGROUND_COLOR=#0052FF
```

## API Keys Setup Instructions

### 1. OpenAI API Key
1. Go to https://platform.openai.com/api-keys
2. Create new API key
3. Add to OPENAI_API_KEY

### 2. Pinata IPFS
1. Create account at https://pinata.cloud
2. Get API key and secret from dashboard
3. Add to PINATA_API_KEY and PINATA_SECRET_KEY

### 3. Neynar Farcaster API
1. Sign up at https://neynar.com
2. Get API key from dashboard
3. Add to NEYNAR_API_KEY

### 4. Base RPC
1. Use public RPC: https://mainnet.base.org
2. Or get dedicated RPC from Alchemy/Infura

### 5. Private Key
1. Create new wallet for deployment
2. Add private key to PRIVATE_KEY
3. Fund with ETH for gas fees

## Package Dependencies to Install

```bash
npm install openai axios @supabase/supabase-js hardhat @nomicfoundation/hardhat-toolbox
```
