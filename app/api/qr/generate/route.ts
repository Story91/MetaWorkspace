import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Use QR Server API for real QR generation
    const qrText = JSON.stringify(data);
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrText)}`;
    
    // Return the QR image URL
    return NextResponse.json({
      qrCode: qrApiUrl,
      success: true
    });

  } catch (error) {
    console.error('QR generation failed:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate QR code',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
