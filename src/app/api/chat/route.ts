import { NextRequest, NextResponse } from 'next/server';
import { aiService } from '@/lib/ai-service';
import { databaseService } from '@/lib/database';
import { ChatMessage } from '@/types/profile';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, messages } = await request.json();

    if (!sessionId || !messages) {
      return NextResponse.json(
        { error: 'Session ID and messages are required' },
        { status: 400 }
      );
    }

    // Get user profile
    const userProfile = await databaseService.getUserProfile(sessionId);

    // Get conversation history from database to provide context to AI
    const conversationHistory = userProfile?.conversation_history || [];
    
    // Combine conversation history with the new user message
    const allMessages = [...conversationHistory, ...messages];

    // Generate AI response (local-only)
    const { response, analysis } = await aiService.generateResponse(allMessages, userProfile || undefined);

    // Create AI message
    const aiMessage: ChatMessage = {
      id: crypto.randomUUID(),
      type: 'ai',
      content: response,
      timestamp: new Date(),
      metadata: {
        sentiment: analysis.sentiment,
        flags_detected: analysis.flags,
        compatibility_score: analysis.compatibility_score,
      },
    };

    // Save message to database
    if (userProfile) {
      await databaseService.addMessage(sessionId, aiMessage);
      
      // Update compatibility score if analysis provided one
      if (analysis.compatibility_score) {
        const updatedFlags = {
          red: [...userProfile.evaluation.flags.red, ...(analysis.flags?.filter((f: string) => f.includes('red')) || [])],
          green: [...userProfile.evaluation.flags.green, ...(analysis.flags?.filter((f: string) => f.includes('green')) || [])],
        };

        await databaseService.updateCompatibilityScore(
          sessionId,
          analysis.compatibility_score,
          updatedFlags,
          [...(userProfile.evaluation.notes || []), analysis.reasoning || '']
        );
      }
    }

    return NextResponse.json({
      message: aiMessage,
      analysis,
    });
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const userProfile = await databaseService.getUserProfile(sessionId);
    
    if (!userProfile) {
      // Create new profile if it doesn't exist
      const newProfile = await databaseService.createUserProfile(sessionId);
      return NextResponse.json({ profile: newProfile, isNew: true });
    }

    return NextResponse.json({ profile: userProfile, isNew: false });
  } catch (error) {
    console.error('Chat API GET Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
