import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const language = formData.get('language') as string || 'en';
    const prompt = formData.get('prompt') as string || '';

    if (!audioFile) {
      return NextResponse.json(
        { error: 'Audio file is required' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/webm'];
    if (!allowedTypes.includes(audioFile.type)) {
      return NextResponse.json(
        { error: 'Unsupported audio format. Please use MP3, MP4, WAV, or WebM.' },
        { status: 400 }
      );
    }

    // Validate file size (25MB limit for Whisper)
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (audioFile.size > maxSize) {
      return NextResponse.json(
        { error: 'Audio file too large. Maximum size is 25MB.' },
        { status: 400 }
      );
    }

    console.log('Processing audio transcription:', {
      fileName: audioFile.name,
      fileSize: `${(audioFile.size / 1024 / 1024).toFixed(2)}MB`,
      fileType: audioFile.type,
      language
    });

    // Call OpenAI Whisper API
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: language || undefined,
      prompt: prompt || undefined,
      response_format: 'verbose_json',
      temperature: 0.2,
    });

    // Extract key information
    const duration = transcription.duration;
    const text = transcription.text;
    const segments = transcription.segments || [];

    // Generate summary if text is long enough
    let summary = '';
    let keyPoints: string[] = [];
    let actionItems: string[] = [];

    if (text.length > 100) {
      try {
        const summaryResponse = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: `You are an AI assistant that analyzes meeting transcriptions and voice notes for MetaWorkspace. Extract:
1. A brief summary (2-3 sentences)
2. Key points (bullet points)
3. Action items (if any)

Format your response as JSON:
{
  "summary": "Brief summary here",
  "keyPoints": ["point 1", "point 2"],
  "actionItems": ["action 1", "action 2"]
}`
            },
            {
              role: 'user',
              content: `Please analyze this transcription:\n\n${text}`
            }
          ],
          temperature: 0.3,
          max_tokens: 800
        });

        const analysis = summaryResponse.choices[0]?.message?.content;
        if (analysis) {
          try {
            const parsed = JSON.parse(analysis);
            summary = parsed.summary || '';
            keyPoints = parsed.keyPoints || [];
            actionItems = parsed.actionItems || [];
          } catch {
            // Fallback if JSON parsing fails
            summary = analysis.substring(0, 200) + '...';
          }
        }
      } catch (summaryError) {
        console.error('Summary generation failed:', summaryError);
        // Continue without summary
      }
    }

    return NextResponse.json({
      transcription: {
        text,
        duration,
        language: transcription.language || language,
        segments: segments.map(segment => ({
          id: segment.id,
          start: segment.start,
          end: segment.end,
          text: segment.text
        }))
      },
      analysis: {
        summary,
        keyPoints,
        actionItems,
        wordCount: text.split(/\s+/).length,
        confidence: segments.length > 0 
          ? segments.reduce((acc, seg) => acc + (seg.avg_logprob || 0), 0) / segments.length
          : null
      },
      metadata: {
        processedAt: new Date().toISOString(),
        originalFileName: audioFile.name,
        fileSizeBytes: audioFile.size,
        processingTimeMs: Date.now()
      }
    });

  } catch (error) {
    console.error('Transcription API Error:', error);
    
    if (error instanceof Error && error.message.includes('rate limit')) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to process audio transcription',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
