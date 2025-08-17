/**
 * AI Service for MetaWorkspace
 * Real OpenAI integration replacing mock responses
 */

import OpenAI from 'openai';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
  id?: string;
}

export interface ChatContext {
  userId: string;
  roomId: string;
  previousMessages: ChatMessage[];
  workspaceData?: any;
}

export interface AIResponse {
  response: string;
  extractedTasks: TaskItem[];
  usage?: OpenAI.Chat.Completions.CompletionUsage;
  context: {
    messageId: string;
    timestamp: string;
    roomId: string;
    userId: string;
  };
}

export interface TaskItem {
  title: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  dueDate?: string;
  estimatedTime?: string;
}

export interface TranscriptionResult {
  text: string;
  duration: number;
  language: string;
  segments: Array<{
    id: number;
    start: number;
    end: number;
    text: string;
  }>;
  analysis: {
    summary: string;
    keyPoints: string[];
    actionItems: string[];
    wordCount: number;
    confidence: number | null;
  };
  metadata: {
    processedAt: string;
    originalFileName: string;
    fileSizeBytes: number;
  };
}

export class AIService {
  private openai: OpenAI;
  private isConfigured: boolean;

  constructor() {
    this.isConfigured = !!process.env.OPENAI_API_KEY;
    
    if (this.isConfigured) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    } else {
      console.warn('AI Service: OpenAI API key not configured, falling back to mock mode');
    }
  }

  /**
   * Get AI chat response
   */
  async getChatResponse(message: string, context: ChatContext): Promise<AIResponse> {
    if (!this.isConfigured) {
      return this.mockChatResponse(message, context);
    }

    try {
      // Construct system prompt
      const systemPrompt = this.buildSystemPrompt(context);

      // Prepare messages
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt }
      ];

      // Add recent conversation history
      const recentMessages = context.previousMessages.slice(-10);
      for (const msg of recentMessages) {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        });
      }

      // Add current message
      messages.push({ role: 'user', content: message });

      // Call OpenAI
      const completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4',
        messages,
        temperature: 0.7,
        max_tokens: 1000,
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
      });

      const response = completion.choices[0]?.message?.content || '';
      const extractedTasks = this.extractTasks(response);

      return {
        response,
        extractedTasks,
        usage: completion.usage,
        context: {
          messageId: Date.now().toString(),
          timestamp: new Date().toISOString(),
          roomId: context.roomId,
          userId: context.userId
        }
      };

    } catch (error) {
      console.error('AI Chat Error:', error);
      throw new Error(`AI chat failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Transcribe audio using Whisper
   */
  async transcribeAudio(
    audioFile: File, 
    language?: string, 
    prompt?: string
  ): Promise<TranscriptionResult> {
    if (!this.isConfigured) {
      return this.mockTranscription(audioFile);
    }

    try {
      // Call Whisper API
      const transcription = await this.openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: language || undefined,
        prompt: prompt || undefined,
        response_format: 'verbose_json',
        temperature: 0.2,
      });

      const text = transcription.text;
      const duration = transcription.duration;
      const segments = transcription.segments || [];

      // Generate analysis if text is substantial
      let analysis = {
        summary: '',
        keyPoints: [] as string[],
        actionItems: [] as string[],
        wordCount: text.split(/\s+/).length,
        confidence: segments.length > 0 
          ? segments.reduce((acc, seg) => acc + (seg.avg_logprob || 0), 0) / segments.length
          : null
      };

      if (text.length > 100) {
        try {
          const analysisResponse = await this.openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
              {
                role: 'system',
                content: `You are an AI assistant analyzing transcriptions for MetaWorkspace. Extract:
1. A brief summary (2-3 sentences)
2. Key points (bullet points)
3. Action items (if any)

Format as JSON:
{
  "summary": "Brief summary here",
  "keyPoints": ["point 1", "point 2"],
  "actionItems": ["action 1", "action 2"]
}`
              },
              { role: 'user', content: `Analyze this transcription:\n\n${text}` }
            ],
            temperature: 0.3,
            max_tokens: 800
          });

          const analysisText = analysisResponse.choices[0]?.message?.content;
          if (analysisText) {
            const parsed = JSON.parse(analysisText);
            analysis.summary = parsed.summary || '';
            analysis.keyPoints = parsed.keyPoints || [];
            analysis.actionItems = parsed.actionItems || [];
          }
        } catch (err) {
          console.error('Analysis generation failed:', err);
        }
      }

      return {
        text,
        duration,
        language: transcription.language || language || 'en',
        segments: segments.map(segment => ({
          id: segment.id,
          start: segment.start,
          end: segment.end,
          text: segment.text
        })),
        analysis,
        metadata: {
          processedAt: new Date().toISOString(),
          originalFileName: audioFile.name,
          fileSizeBytes: audioFile.size
        }
      };

    } catch (error) {
      console.error('Transcription Error:', error);
      throw new Error(`Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate meeting summary from transcription
   */
  async generateMeetingSummary(
    transcription: string, 
    participants: string[], 
    roomId: string
  ): Promise<{
    summary: string;
    keyDecisions: string[];
    actionItems: Array<{
      task: string;
      assignee?: string;
      priority: 'high' | 'medium' | 'low';
      dueDate?: string;
    }>;
    nextSteps: string[];
  }> {
    if (!this.isConfigured) {
      return this.mockMeetingSummary();
    }

    try {
      const prompt = `Analyze this meeting transcription from MetaWorkspace room "${roomId}" with participants: ${participants.join(', ')}.

Transcription:
${transcription}

Please provide a structured analysis in JSON format:
{
  "summary": "Brief meeting summary (3-4 sentences)",
  "keyDecisions": ["decision 1", "decision 2"],
  "actionItems": [
    {
      "task": "task description",
      "assignee": "person name if mentioned",
      "priority": "high|medium|low",
      "dueDate": "date if mentioned"
    }
  ],
  "nextSteps": ["next step 1", "next step 2"]
}`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are an expert meeting analyzer for professional workspaces.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 1200
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        return JSON.parse(content);
      }

      throw new Error('No response from AI');

    } catch (error) {
      console.error('Meeting summary generation failed:', error);
      return this.mockMeetingSummary();
    }
  }

  /**
   * Build system prompt based on context
   */
  private buildSystemPrompt(context: ChatContext): string {
    return `You are an AI assistant for MetaWorkspace, a decentralized workplace platform that combines AI, blockchain, and social collaboration.

Your role is to help users with:
- Task management and productivity optimization
- Meeting coordination and scheduling  
- Workspace organization and collaboration
- Voice/video NFT management and blockchain workspace logs
- Farcaster social integration and team coordination
- Workflow automation and process improvement

Current context:
- User ID: ${context.userId}
- Room ID: ${context.roomId}
- Platform: Web3-enabled workspace with blockchain verification
- Features: AI task extraction, NFT-based content storage, decentralized collaboration

Guidelines:
- Provide practical, actionable advice focused on workplace productivity
- Suggest specific tasks when appropriate
- Be professional but friendly
- Consider the decentralized/Web3 context when relevant
- Help optimize workflows and team collaboration
- Emphasize transparency and verification features

Respond concisely and helpfully, focusing on immediate value for the user's work.`;
  }

  /**
   * Extract actionable tasks from AI response
   */
  private extractTasks(response: string): TaskItem[] {
    const tasks: TaskItem[] = [];

    // Task extraction patterns
    const patterns = [
      /(?:should|need to|must|have to|let's|action:|task:)\s*([^.!?]+)/gi,
      /(?:^|\n)\s*[-*]\s*([^.!?\n]+)/gm,
      /(?:create|setup|implement|configure|update|review|schedule|plan|organize|prepare)\s+([^.!?]+)/gi,
    ];

    const priorityKeywords = {
      high: ['urgent', 'critical', 'immediately', 'asap', 'priority', 'deadline'],
      medium: ['important', 'soon', 'next', 'should', 'recommended'],
      low: ['later', 'eventually', 'consider', 'might', 'could', 'optional']
    };

    const categoryKeywords = {
      'Development': ['code', 'implement', 'develop', 'build', 'create', 'deploy', 'fix', 'debug'],
      'Meeting': ['meeting', 'call', 'schedule', 'discuss', 'review', 'standup', 'sync'],
      'Documentation': ['document', 'write', 'update docs', 'readme', 'wiki', 'notes'],
      'Planning': ['plan', 'strategy', 'roadmap', 'timeline', 'goals', 'milestones'],
      'Communication': ['email', 'message', 'notify', 'inform', 'contact', 'reach out'],
      'Research': ['research', 'investigate', 'analyze', 'study', 'explore', 'find'],
      'General': []
    };

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(response)) !== null) {
        const taskText = match[1]?.trim();
        if (taskText && taskText.length > 5 && taskText.length < 150) {
          
          const lowerText = taskText.toLowerCase();
          
          // Determine priority
          let priority: 'high' | 'medium' | 'low' = 'medium';
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

    // Remove duplicates and limit
    return tasks.filter((task, index, self) => 
      index === self.findIndex(t => t.title.toLowerCase() === task.title.toLowerCase())
    ).slice(0, 5);
  }

  /**
   * Mock chat response for development
   */
  private async mockChatResponse(message: string, context: ChatContext): Promise<AIResponse> {
    console.log('🔧 Using mock AI response (OpenAI not configured)');
    
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    const responses = [
      `I understand you're asking about "${message}". In MetaWorkspace, I can help you organize tasks, manage meetings, and coordinate with your team using blockchain-verified logs.`,
      `Based on your message about "${message}", I recommend breaking this down into smaller tasks. Would you like me to help you create a structured plan?`,
      `For "${message}", consider using our voice NFT feature to record your thoughts and share them with your team. This creates a permanent, blockchain-verified record.`,
      `Regarding "${message}", I suggest we schedule a team meeting to discuss this further. I can help coordinate with your Farcaster network.`
    ];

    const response = responses[Math.floor(Math.random() * responses.length)];
    
    return {
      response,
      extractedTasks: [
        {
          title: `Follow up on: ${message.substring(0, 50)}...`,
          priority: 'medium',
          category: 'General'
        }
      ],
      context: {
        messageId: Date.now().toString(),
        timestamp: new Date().toISOString(),
        roomId: context.roomId,
        userId: context.userId
      }
    };
  }

  /**
   * Mock transcription for development
   */
  private async mockTranscription(audioFile: File): Promise<TranscriptionResult> {
    console.log('🔧 Using mock transcription (OpenAI not configured)');
    
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));

    const mockText = `This is a mock transcription of the audio file "${audioFile.name}". In a real implementation, this would contain the actual speech-to-text conversion using OpenAI's Whisper model. The transcription would include speaker identification, timestamps, and confidence scores.`;

    return {
      text: mockText,
      duration: 30,
      language: 'en',
      segments: [
        { id: 0, start: 0, end: 30, text: mockText }
      ],
      analysis: {
        summary: 'Mock transcription analysis - this would contain AI-generated insights in production.',
        keyPoints: ['Mock key point 1', 'Mock key point 2'],
        actionItems: ['Mock action item'],
        wordCount: mockText.split(/\s+/).length,
        confidence: 0.85
      },
      metadata: {
        processedAt: new Date().toISOString(),
        originalFileName: audioFile.name,
        fileSizeBytes: audioFile.size
      }
    };
  }

  /**
   * Mock meeting summary
   */
  private mockMeetingSummary() {
    return {
      summary: 'Mock meeting summary - this would contain AI-generated meeting insights in production.',
      keyDecisions: ['Mock decision 1', 'Mock decision 2'],
      actionItems: [
        { task: 'Mock action item', priority: 'medium' as const }
      ],
      nextSteps: ['Mock next step']
    };
  }

  /**
   * Check if AI service is configured
   */
  isConfigured(): boolean {
    return this.isConfigured;
  }

  /**
   * Get service status
   */
  getStatus(): { configured: boolean; model: string; mode: string } {
    return {
      configured: this.isConfigured,
      model: process.env.OPENAI_MODEL || 'gpt-4',
      mode: this.isConfigured ? 'production' : 'mock'
    };
  }
}

// Export singleton instance
export const aiService = new AIService();

export default AIService;
