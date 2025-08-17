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

    // Construct system prompt based on MetaWorkspace context
    const systemPrompt = `You are an AI assistant for MetaWorkspace, a decentralized workplace platform. You help users with:

1. Task management and productivity optimization
2. Meeting coordination and scheduling
3. Workspace organization and collaboration
4. Voice/video NFT management
5. Blockchain-based workspace logs
6. Farcaster social integration

Current context:
- User ID: ${context?.userId || 'Unknown'}
- Room ID: ${context?.roomId || 'No room'}
- Workspace: Decentralized AI-powered environment

Provide helpful, professional responses focused on workplace productivity and Web3 collaboration.`;

    // Prepare conversation history
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: systemPrompt
      }
    ];

    // Add previous messages if available
    if (context?.previousMessages && context.previousMessages.length > 0) {
      const recentMessages = context.previousMessages.slice(-10); // Keep last 10 messages
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

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages,
      temperature: 0.7,
      max_tokens: 1000,
      presence_penalty: 0.1,
      frequency_penalty: 0.1,
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
