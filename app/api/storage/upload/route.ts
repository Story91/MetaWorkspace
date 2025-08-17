import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const PINATA_API_URL = 'https://api.pinata.cloud';
const PINATA_GATEWAY = process.env.IPFS_GATEWAY_URL || 'https://gateway.pinata.cloud/ipfs/';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const metadataStr = formData.get('metadata') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    if (!process.env.PINATA_API_KEY || !process.env.PINATA_SECRET_KEY) {
      return NextResponse.json(
        { error: 'IPFS storage not configured' },
        { status: 500 }
      );
    }

    // Parse metadata
    let metadata = {};
    if (metadataStr) {
      try {
        metadata = JSON.parse(metadataStr);
      } catch {
        return NextResponse.json(
          { error: 'Invalid metadata JSON' },
          { status: 400 }
        );
      }
    }

    // Validate file size (100MB limit)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 100MB.' },
        { status: 400 }
      );
    }

    console.log('Uploading to IPFS:', {
      fileName: file.name,
      fileSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
      fileType: file.type,
      metadata
    });

    // Prepare form data for Pinata
    const pinataFormData = new FormData();
    pinataFormData.append('file', file);

    // Add Pinata metadata
    const pinataMetadata = {
      name: file.name,
      keyvalues: {
        app: 'MetaWorkspace',
        uploadedAt: new Date().toISOString(),
        originalSize: file.size.toString(),
        fileType: file.type,
        ...metadata
      }
    };

    pinataFormData.append('pinataMetadata', JSON.stringify(pinataMetadata));

    // Upload to Pinata
    const response = await axios.post(
      `${PINATA_API_URL}/pinning/pinFileToIPFS`,
      pinataFormData,
      {
        headers: {
          'pinata_api_key': process.env.PINATA_API_KEY,
          'pinata_secret_api_key': process.env.PINATA_SECRET_KEY,
          'Content-Type': 'multipart/form-data'
        },
        maxContentLength: maxSize,
        maxBodyLength: maxSize,
        timeout: 120000 // 2 minute timeout
      }
    );

    const ipfsHash = response.data.IpfsHash;
    const pinSize = response.data.PinSize;
    const timestamp = response.data.Timestamp;

    // Construct IPFS URLs
    const ipfsUrl = `${PINATA_GATEWAY}${ipfsHash}`;
    const nativeIpfsUrl = `ipfs://${ipfsHash}`;

    console.log('IPFS upload successful:', {
      hash: ipfsHash,
      size: pinSize,
      url: ipfsUrl
    });

    return NextResponse.json({
      success: true,
      hash: ipfsHash,
      url: ipfsUrl,
      nativeUrl: nativeIpfsUrl,
      size: pinSize,
      timestamp,
      metadata: pinataMetadata,
      gateway: PINATA_GATEWAY
    });

  } catch (error) {
    console.error('IPFS Upload Error:', error);

    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 500;
      const message = error.response?.data?.error || error.message;
      
      if (status === 401) {
        return NextResponse.json(
          { error: 'Invalid Pinata API credentials' },
          { status: 500 }
        );
      }
      
      if (status === 429) {
        return NextResponse.json(
          { error: 'IPFS upload rate limit exceeded' },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { error: `IPFS upload failed: ${message}` },
        { status }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to upload to IPFS',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hash = searchParams.get('hash');

    if (!hash) {
      return NextResponse.json(
        { error: 'IPFS hash is required' },
        { status: 400 }
      );
    }

    if (!process.env.PINATA_API_KEY || !process.env.PINATA_SECRET_KEY) {
      return NextResponse.json(
        { error: 'IPFS storage not configured' },
        { status: 500 }
      );
    }

    // Get file metadata from Pinata
    const response = await axios.get(
      `${PINATA_API_URL}/data/pinList?hashContains=${hash}`,
      {
        headers: {
          'pinata_api_key': process.env.PINATA_API_KEY,
          'pinata_secret_api_key': process.env.PINATA_SECRET_KEY
        }
      }
    );

    const files = response.data.rows;
    if (files.length === 0) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    const file = files[0];
    
    return NextResponse.json({
      hash: file.ipfs_pin_hash,
      size: file.size,
      pinnedAt: file.date_pinned,
      metadata: file.metadata,
      url: `${PINATA_GATEWAY}${file.ipfs_pin_hash}`,
      nativeUrl: `ipfs://${file.ipfs_pin_hash}`
    });

  } catch (error) {
    console.error('IPFS Retrieve Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to retrieve IPFS file info',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
