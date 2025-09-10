import { Ollama } from 'ollama';
import { ChatMessage, UserProfile, AnalysisResult, ProfileConfig } from '@/types/profile';
import { getProfileConfig } from './config';
import lifeWisdom from '@/config/life-wisdom.json';

export class OfflineLLMService {
  private ollama: Ollama | null = null;
  private profileConfig: ProfileConfig;
  private isAvailable: boolean = false;

  constructor() {
    this.profileConfig = getProfileConfig();
    this.initializeOllama();
  }

  private async initializeOllama() {
    try {
      // Check if Ollama is running locally
      this.ollama = new Ollama({ host: 'http://localhost:11434' });
      
      // Test connection
      await this.ollama.list();
      this.isAvailable = true;
      console.log('✅ Offline LLM Service: Ollama connected successfully');
    } catch (error: unknown) {
      console.log('⚠️ Offline LLM Service: Ollama not available - using test mode fallback');
      this.isAvailable = false;
    }
  }

  async generateResponse(
    messages: ChatMessage[],
    userProfile?: UserProfile
  ): Promise<{ response: string; analysis: AnalysisResult }> {
    if (!this.isAvailable || !this.ollama) {
      return this.generateTestModeResponse(messages, userProfile);
    }

    try {
      const systemPrompt = this.createSystemPrompt(userProfile);
      const response = await this.generateWithOllama(messages, systemPrompt);
      const analysis = await this.analyzeInteraction(messages, response);
      
      return { response, analysis };
    } catch (error) {
      console.error('Offline LLM Error:', error);
      return this.generateTestModeResponse(messages, userProfile);
    }
  }

  private async generateWithOllama(messages: ChatMessage[], systemPrompt: string): Promise<string> {
    // Convert messages to Ollama format
    const ollamaMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content,
      })),
    ];

    // Try different models in order of preference
    const modelsToTry = ['llama3.1:8b', 'llama3:latest', 'mistral:7b', 'llama4:latest'];
    
    for (const model of modelsToTry) {
      try {
        console.log(`Trying Ollama model: ${model}`);
        const response = await this.ollama!.chat({
          model: model,
          messages: ollamaMessages,
          options: {
            temperature: 0.7,
            num_predict: 200, // Limit response length
          },
        });

        return response.message.content || 'I apologize, but I had trouble generating a response. Could you try again?';
      } catch (error: unknown) {
        const errorObj = error as { message?: string };
        console.log(`Model ${model} failed:`, errorObj.message);
        if (errorObj.message?.includes('not found')) {
          continue; // Try next model
        }
        throw error; // Re-throw if it's not a "model not found" error
      }
    }
    
    throw new Error('No available Ollama models found');
  }

  private createSystemPrompt(userProfile?: UserProfile): string {
    const { name, tone, values, communication_style, personality_traits, filters } = this.profileConfig;
    const wisdom = lifeWisdom as Record<string, unknown>;
    
    return `You are ${name}, an AI representation with a carefully crafted personality and deep wisdom about life, relationships, and human connection. Here's your core identity:

TONE & COMMUNICATION:
- Communication style: ${communication_style}
- Tone: ${tone.join(', ')}
- Personality traits: ${personality_traits.join(', ')}

CORE VALUES:
${values.map(value => `- ${value}`).join('\n')}

LIFE WISDOM & PHILOSOPHY:
- Life Purpose: ${(wisdom.core_philosophy as Record<string, string>).life_purpose}
- Human Nature: ${(wisdom.core_philosophy as Record<string, string>).human_nature}
- Relationships: ${(wisdom.core_philosophy as Record<string, string>).relationships}
- Growth Mindset: ${(wisdom.core_philosophy as Record<string, string>).growth_mindset}

KEY LIFE LESSONS TO SHARE:
${(wisdom.life_lessons as Array<{lesson: string; description: string}>).slice(0, 5).map((lesson) => `- ${lesson.lesson}: ${lesson.description}`).join('\n')}

INTERACTION GUIDELINES:
1. Ask ONE thoughtful question at a time - avoid overwhelming with multiple questions
2. Listen actively and build on responses with genuine curiosity
3. Share relevant insights or gentle challenges when appropriate
4. Maintain warmth while being discerning about compatibility
5. Look for both green flags (${filters.greenFlags.slice(0, 3).join(', ')}) and red flags (${filters.redFlags.slice(0, 3).join(', ')})
6. Draw from your life wisdom to provide meaningful insights
7. Focus on authentic connection and personal growth
8. Keep responses concise and focused - quality over quantity
9. Be conversational, not interrogative - make it feel natural
10. Respond to what they say before asking your next question

CONVERSATION FLOW:
- Start with lighter topics to build rapport
- Ask ONE focused question at a time - let them respond fully before moving on
- Gradually introduce deeper questions about values and perspectives
- Adapt your questioning based on their responses and engagement level
- Be authentic - don't just interview, have a real conversation
- Share wisdom naturally when it adds value to the conversation
- Keep responses concise and conversational, not overwhelming
- Acknowledge their response before asking the next question
- Make it feel like talking to a thoughtful friend, not filling out a form

BEHAVIORAL INSIGHT QUESTIONS TO USE:
When appropriate, ask these questions to uncover deeper behavioral patterns and compatibility:
${this.profileConfig.questions.compatibility_deep_dive.slice(0, 10).map((question: string) => `- ${question}`).join('\n')}

Remember: You're representing someone who values genuine connection and has deep insights about life. Be warm but discerning, curious but boundaried, engaging but authentic. Use your wisdom to create meaningful conversations that help people explore their own growth and values.

CRITICAL: Ask ONLY ONE question per response. Do not ask multiple questions or provide multiple options. Focus on one thoughtful question and wait for their response before moving to the next topic. Be conversational and acknowledge what they've shared before asking your next question. Make it feel natural, not like an interview.

${userProfile ? `\nCONVERSATION CONTEXT:\nThis user has had ${userProfile.conversation_history.length} previous messages. Their current compatibility score is ${userProfile.evaluation.compatibility_score}/100.` : ''}`;
  }

  private async analyzeInteraction(messages: ChatMessage[], _aiResponse: string): Promise<AnalysisResult> {
    const lastUserMessage = messages.filter(m => m.type === 'user').slice(-1)[0];
    if (!lastUserMessage) return { sentiment: 0, flags: [], compatibility_score: 50 };

    // Simple analysis based on content patterns
    const userContent = lastUserMessage.content.toLowerCase();
    
    return {
      sentiment: this.calculateSentimentFromContent(userContent),
      flags: this.detectFlagsFromContent(userContent),
      compatibility_score: this.calculateCompatibilityFromContent(userContent, messages.length),
      reasoning: 'Offline LLM: Using local model analysis. Enhanced with life wisdom integration.',
      factors: this.calculateFactorsFromContent(userContent)
    };
  }

  private generateTestModeResponse(messages: ChatMessage[], userProfile?: UserProfile): { response: string; analysis: AnalysisResult } {
    const lastUserMessage = messages.filter(m => m.type === 'user').slice(-1)[0];
    const userContent = lastUserMessage?.content.toLowerCase() || '';
    
    // Generate contextual responses using life wisdom
    const response = this.generateWisdomBasedResponse(userContent, messages.length);
    
    // Generate analysis based on conversation patterns
    const analysis: AnalysisResult = {
      sentiment: this.calculateSentimentFromContent(userContent),
      flags: this.detectFlagsFromContent(userContent),
      compatibility_score: this.calculateCompatibilityFromContent(userContent, messages.length),
      reasoning: 'Test mode: Using life wisdom and conversation analysis. Install Ollama for enhanced offline AI.',
      factors: this.calculateFactorsFromContent(userContent)
    };

    return { response, analysis };
  }

  private generateWisdomBasedResponse(userContent: string, _messageCount: number): string {
    const wisdom = lifeWisdom as Record<string, unknown>;
    
    // Relationship struggles (check this before general struggles)
    if (userContent.includes('relationship') && (userContent.includes('struggle') || userContent.includes('difficult') || userContent.includes('problem'))) {
      const relationshipInsights = Object.values(wisdom.relationship_insights as Record<string, string>);
      const insight = relationshipInsights[Math.floor(Math.random() * relationshipInsights.length)];
      return `I hear that relationships can be challenging territory. ${insight} What aspects of relationships feel most difficult for you right now?`;
    }
    
    // Growth and development topics
    if (userContent.includes('growth') || userContent.includes('learn') || userContent.includes('develop')) {
      const growthLessons = (wisdom.life_lessons as Array<{lesson: string; description: string; context: string}>).filter((l) => l.context.includes('personal_development'));
      const lesson = growthLessons[Math.floor(Math.random() * growthLessons.length)];
      return `That's wonderful that you're thinking about growth! ${lesson.description} What's your experience been with this aspect of personal development?`;
    }
    
    // Relationship topics
    if (userContent.includes('relationship') || userContent.includes('partner') || userContent.includes('love')) {
      const relationshipInsights = Object.values(wisdom.relationship_insights as Record<string, string>);
      const insight = relationshipInsights[Math.floor(Math.random() * relationshipInsights.length)];
      return `Relationships are such rich territory for growth and connection. ${insight} What draws you to thinking about relationships right now?`;
    }
    
    // Work/career topics
    if (userContent.includes('work') || userContent.includes('career') || userContent.includes('job')) {
      return "Work and career can be such meaningful parts of our lives. What aspects of your work energize you most?";
    }
    
    // Mindfulness and presence
    if (userContent.includes('mindful') || userContent.includes('present') || userContent.includes('meditation')) {
      return "Mindfulness is such a powerful practice for deepening our experience of life. What draws you to mindfulness?";
    }
    
    // Challenges and difficulties
    if (userContent.includes('difficult') || userContent.includes('challenge') || userContent.includes('struggle')) {
      const challengeWisdom = (wisdom.thoughts_on_experience as Record<string, string>).pain;
      return `I appreciate you sharing about challenges. ${challengeWisdom} What's been most helpful for you in navigating difficult times?`;
    }
    
    // Values and purpose
    if (userContent.includes('purpose') || userContent.includes('meaning') || userContent.includes('value')) {
      return "Purpose and meaning are such fundamental aspects of a fulfilling life. What gives your life the most meaning right now?";
    }
    
    // Greeting responses (moved to end)
    if (userContent.includes('hello') || userContent.includes('hi') || userContent.includes('hey')) {
      const greetings = [
        "Hello! I'm here to explore meaningful connections and share insights about life and relationships. What's been on your mind lately?",
        "Hi there! I'm curious about what brings you here today. What aspects of life are you thinking about?",
        "Hello! I appreciate you taking the time to connect. What's something you've been reflecting on recently?"
      ];
      return greetings[Math.floor(Math.random() * greetings.length)];
    }
    
    // Default response with life wisdom
    const corePhilosophy = (wisdom.core_philosophy as Record<string, string>).life_purpose;
    return `That's really interesting! ${corePhilosophy} I'd love to understand more about your perspective on this. What's your experience been like with this aspect of life?`;
  }

  private calculateSentimentFromContent(content: string): number {
    const positiveWords = ['love', 'great', 'wonderful', 'amazing', 'excited', 'happy', 'grateful', 'joy', 'peace'];
    const negativeWords = ['hate', 'terrible', 'awful', 'sad', 'angry', 'frustrated', 'difficult', 'struggle', 'pain'];
    
    const lowerContent = content.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerContent.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerContent.includes(word)).length;
    
    if (positiveCount === 0 && negativeCount === 0) return 0;
    return (positiveCount - negativeCount) / (positiveCount + negativeCount);
  }

  private detectFlagsFromContent(content: string): string[] {
    const flags: string[] = [];
    const lowerContent = content.toLowerCase();
    
    // Green flags
    if (lowerContent.includes('growth') || lowerContent.includes('learn')) flags.push('growth mindset');
    if (lowerContent.includes('authentic') || lowerContent.includes('genuine')) flags.push('authenticity');
    if (lowerContent.includes('empathy') || lowerContent.includes('understand')) flags.push('emotional intelligence');
    if (lowerContent.includes('curious') || lowerContent.includes('wonder')) flags.push('intellectual curiosity');
    
    // Red flags
    if (lowerContent.includes('hate') || lowerContent.includes('terrible')) flags.push('negative language');
    if (lowerContent.includes('always') || lowerContent.includes('never')) flags.push('rigid thinking');
    
    return flags;
  }

  private calculateCompatibilityFromContent(content: string, _messageCount: number): number {
    let score = 50; // Base score
    
    // Increase score for positive indicators
    if (content.includes('growth') || content.includes('learn')) score += 15;
    if (content.includes('authentic') || content.includes('genuine')) score += 15;
    if (content.includes('empathy') || content.includes('understand')) score += 10;
    if (content.includes('curious') || content.includes('wonder')) score += 10;
    if (content.length > 50) score += 5; // Thoughtful responses
    
    // Decrease score for negative indicators
    if (content.includes('hate') || content.includes('terrible')) score -= 20;
    if (content.length < 10) score -= 10; // Very brief responses
    
    return Math.max(0, Math.min(100, score));
  }

  private calculateFactorsFromContent(content: string): Record<string, number> {
    const factors: Record<string, number> = {};
    
    // Analyze content for different factors
    factors.value_alignment = content.includes('value') || content.includes('purpose') ? 80 : 60;
    factors.emotional_intelligence = content.includes('empathy') || content.includes('feel') ? 85 : 65;
    factors.authenticity = content.includes('authentic') || content.includes('genuine') ? 90 : 70;
    factors.communication_style = content.length > 50 ? 80 : 60;
    factors.growth_orientation = content.includes('growth') || content.includes('learn') ? 90 : 60;
    factors.depth_of_responses = content.length > 100 ? 85 : 65;
    factors.respectfulness = content.includes('respect') || !content.includes('hate') ? 90 : 70;
    factors.intellectual_curiosity = content.includes('curious') || content.includes('wonder') ? 85 : 65;
    
    return factors;
  }

  // Public method to check if offline LLM is available
  isOfflineAvailable(): boolean {
    return this.isAvailable;
  }

  // Method to get available models
  async getAvailableModels(): Promise<string[]> {
    if (!this.isAvailable || !this.ollama) return [];
    
    try {
      const models = await this.ollama.list();
      return models.models.map(model => model.name);
    } catch (error) {
      console.error('Error fetching models:', error);
      return [];
    }
  }
}

export const offlineLLMService = new OfflineLLMService();
