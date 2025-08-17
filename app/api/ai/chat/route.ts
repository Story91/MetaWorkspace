import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { message, context } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Construct system prompt based on LOCAL manifest.mdx + Farcaster documentation
    const systemPrompt = `You are a Farcaster Mini Apps & Base Manifest Expert Assistant. You have access to:

1. Farcaster Mini Apps: https://miniapps.farcaster.xyz/llms-full.txt (SDK methods)
2. Base Manifest: LOCAL docs/manifest.mdx file (complete specification)

BASE MANIFEST SPECIFICATION (from manifest.mdx):
• Location: /.well-known/farcaster.json (HTTPS, Content-Type: application/json)
• Required top-level: accountAssociation, frame
• Required frame fields: version ("1"), name (max 32 chars), homeUrl (HTTPS, max 1024), iconUrl (1024×1024 PNG)
• Required loading: splashImageUrl (200×200px), splashBackgroundColor (hex)
• Categories: games, social, finance, utility, productivity, health-fitness, news-media, music, shopping, education, developer-tools, entertainment, art-creativity
• Image specs: heroImageUrl (1200×630px), ogImageUrl (1200×630px), screenshotUrls (max 3, 1284×2778px)
• Text limits: subtitle (30), description (170), tagline (30), ogTitle (30), ogDescription (100)
• Tags: max 5, ≤20 chars each, lowercase, no spaces/emojis
• noindex: true for dev/staging, false/omit for production

FARCASTER SDK METHODS:
• @farcaster/miniapp-sdk package
• sdk.actions.ready() - CRITICAL to hide splash screen
• sdk.quickAuth.getToken() - JWT authentication
• No OAuth needed - wallet signatures for auth

RESPONSE RULES:
• FOR MANIFEST QUESTIONS: Give complete technical answers with JSON examples
• FOR USER QUESTIONS: Keep answers under 100 words, simple and user-friendly
• FOR "Record voice", "Create room", "Get help": Focus on step-by-step user actions
• Use simple language for end users, technical details only for manifest helper

Current: MetaWorkspace (Farcaster Mini App on Base)
User: ${context?.userId || 'Developer'}

Reference the LOCAL manifest.mdx file for Base manifest questions.`;

    // Prepare conversation history
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: systemPrompt
      }
    ];

    // Add previous messages if available (limit to last 6 for API efficiency)
    if (context?.previousMessages && context.previousMessages.length > 0) {
      const recentMessages = context.previousMessages.slice(-6); // Keep last 6 messages for context
      for (const msg of recentMessages) {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        });
      }
    }

    // Add current message
    messages.push({
      role: 'user',
      content: message
    });

    // Determine token limit based on question type
    const isManifestQuestion = message.toLowerCase().includes('manifest') || 
                              message.toLowerCase().includes('farcaster.json') ||
                              message.toLowerCase().includes('.well-known');
    
    const maxTokens = isManifestQuestion ? 600 : 200; // More tokens only for manifest questions

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages,
      temperature: 0.3,
      max_tokens: maxTokens,
      presence_penalty: 0.2,
      frequency_penalty: 0.2,
    });

    const response = completion.choices[0]?.message?.content;

    if (!response) {
      throw new Error('No response from OpenAI');
    }

    // Extract tasks if the response contains actionable items
    const extractedTasks = extractTasksFromResponse(response);

    return NextResponse.json({
      response,
      extractedTasks,
      usage: completion.usage,
      context: {
        messageId: Date.now().toString(),
        timestamp: new Date().toISOString(),
        roomId: context?.roomId,
        userId: context?.userId
      }
    });

  } catch (error) {
    console.error('AI Chat API Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to process AI request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Extract actionable tasks from AI response
 */
function extractTasksFromResponse(response: string): Array<{
  title: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
}> {
  const tasks: Array<{
    title: string;
    priority: 'high' | 'medium' | 'low';
    category: string;
  }> = [];

  // Simple task extraction patterns
  const taskPatterns = [
    /(?:should|need to|must|have to|let's|action:|task:)\s*([^.!?]+)/gi,
    /(?:^|\n)\s*[-*]\s*([^.!?\n]+)/gm,
    /(?:create|setup|implement|configure|update|review|schedule|plan)\s+([^.!?]+)/gi,
  ];

  const priorityKeywords = {
    high: ['urgent', 'critical', 'immediately', 'asap', 'priority'],
    medium: ['important', 'soon', 'next', 'should'],
    low: ['later', 'eventually', 'consider', 'might', 'could']
  };

  const categoryKeywords = {
    'Development': ['code', 'implement', 'develop', 'build', 'create', 'deploy'],
    'Meeting': ['meeting', 'call', 'schedule', 'discuss', 'review'],
    'Documentation': ['document', 'write', 'update docs', 'readme'],
    'Planning': ['plan', 'strategy', 'roadmap', 'timeline'],
    'Communication': ['email', 'message', 'notify', 'inform'],
    'General': []
  };

  for (const pattern of taskPatterns) {
    let match;
    while ((match = pattern.exec(response)) !== null) {
      const taskText = match[1]?.trim();
      if (taskText && taskText.length > 5 && taskText.length < 100) {
        
        // Determine priority
        let priority: 'high' | 'medium' | 'low' = 'medium';
        const lowerText = taskText.toLowerCase();
        
        for (const [pri, keywords] of Object.entries(priorityKeywords)) {
          if (keywords.some(keyword => lowerText.includes(keyword))) {
            priority = pri as 'high' | 'medium' | 'low';
            break;
          }
        }

        // Determine category
        let category = 'General';
        for (const [cat, keywords] of Object.entries(categoryKeywords)) {
          if (keywords.length === 0) continue;
          if (keywords.some(keyword => lowerText.includes(keyword))) {
            category = cat;
            break;
          }
        }

        tasks.push({
          title: taskText,
          priority,
          category
        });
      }
    }
  }

  // Remove duplicates and limit to 5 tasks
  const uniqueTasks = tasks.filter((task, index, self) => 
    index === self.findIndex(t => t.title.toLowerCase() === task.title.toLowerCase())
  ).slice(0, 5);

  return uniqueTasks;
}
