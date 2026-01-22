import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Force this route to be included in the build
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, episodeId, message } = body;

    if (!userId || !episodeId || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // episodeId is actually characterId in the current implementation
    // First, find or create an episode for this character
    const characterId = episodeId;

    let episode = await prisma.episode.findFirst({
      where: {
        characterId: characterId,
      },
      include: {
        character: true,
      },
    });

    // If no episode exists for this character, create one
    if (!episode) {
      const character = await prisma.character.findUnique({
        where: { id: characterId },
      });

      if (!character) {
        return NextResponse.json(
          { error: 'Character not found' },
          { status: 404 }
        );
      }

      // Create a default episode for this character
      episode = await prisma.episode.create({
        data: {
          characterId: characterId,
          title: `${character.name}와의 첫 만남`,
          description: `${character.name}와 처음으로 만나는 설레는 순간`,
          category: 'DAILY',
          difficulty: 'EASY',
          introVideoUrl: '',
          videoPoolIds: [],
          baseStory: `${character.name}와의 새로운 이야기가 시작됩니다.`,
          branchPoints: [],
        },
        include: {
          character: true,
        },
      });
    }

    // Find or create chat session
    let session = await prisma.chatSession.findFirst({
      where: {
        userId,
        episodeId: episode.id,
        status: 'ACTIVE',
      },
      include: {
        episode: {
          include: {
            character: true,
          },
        },
      },
    });

    if (!session) {

      // Create new session
      session = await prisma.chatSession.create({
        data: {
          userId,
          episodeId,
          messages: [],
          relationshipScore: 0,
          emotionalState: {
            happiness: 50,
            interest: 50,
            trust: 50,
          },
          storyProgress: 0,
          unlockedGallery: [],
          status: 'ACTIVE',
        },
        include: {
          episode: {
            include: {
              character: true,
            },
          },
        },
      });
    }

    // Get character info
    const character = session.episode.character;
    const currentMessages = (session.messages as any[]) || [];

    // Build conversation history for AI
    const conversationHistory = currentMessages.map((msg: any) => {
      return `${msg.role === 'user' ? '사용자' : character.name}: ${msg.content}`;
    }).join('\n');

    // Generate AI response using Gemini 2.5 Flash
    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash-exp",
      });

      // Parse personality if it's a JSON object
      const personalityData = typeof character.personality === 'object'
        ? character.personality as any
        : {};

      const prompt = `당신은 "${character.name}"라는 ${character.age}살 ${character.occupation} 캐릭터입니다.

캐릭터 설명: ${character.description}
성격: ${personalityData.traits ? personalityData.traits.join(', ') : JSON.stringify(character.personality)}
배경 스토리: ${character.backstory}
태그: ${character.tags.join(', ')}

현재 에피소드: ${session.episode.title}
상황 설명: ${session.episode.description}

이전 대화 내역:
${conversationHistory || '(첫 대화입니다)'}

사용자: ${message}

위 상황에서 ${character.name}로서 자연스럽고 매력적으로 답변해주세요.
- 한국어로 답변하세요
- 캐릭터의 성격과 말투를 유지하세요
- 연애 시뮬레이션 게임처럼 설레고 재미있게 대화하세요
- 이모티콘이나 이모지를 적절히 사용하세요
- 답변은 2-3문장 정도로 간결하게 하세요

${character.name}:`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const responseText = response.text();

      // Determine emotion and relationship change based on message content
      let emotion = 'neutral';
      let relationshipChange = 0;

      if (message.includes('좋아') || message.includes('사랑') || message.includes('예쁘') || message.includes('멋져')) {
        emotion = 'happy';
        relationshipChange = 5;
      } else if (message.includes('싫어') || message.includes('바보') || message.includes('짜증')) {
        emotion = 'sad';
        relationshipChange = -3;
      } else if (message.includes('?')) {
        emotion = 'curious';
        relationshipChange = 2;
      } else {
        emotion = 'neutral';
        relationshipChange = 1;
      }

      const aiResponse = {
        text: responseText,
        videoUrl: null,
        audioUrl: null,
        emotion,
        relationshipChange,
      };

      // Update session with new messages
      const updatedMessages = [
        ...currentMessages,
        {
          id: Date.now().toString(),
          role: 'user',
          content: message,
          timestamp: new Date().toISOString(),
        },
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: aiResponse.text,
          videoUrl: aiResponse.videoUrl,
          audioUrl: aiResponse.audioUrl,
          emotion: aiResponse.emotion,
          timestamp: new Date().toISOString(),
        },
      ];

      await prisma.chatSession.update({
        where: { id: session.id },
        data: {
          messages: updatedMessages,
          relationshipScore: Math.min(100, session.relationshipScore + aiResponse.relationshipChange),
          lastPlayedAt: new Date(),
        },
      });

      return NextResponse.json({
        sessionId: session.id,
        response: aiResponse,
        relationshipScore: Math.min(100, session.relationshipScore + aiResponse.relationshipChange),
      });
    } catch (aiError: any) {
      console.error('Gemini AI Error:', aiError);

      // Fallback response if AI fails
      const fallbackResponse = {
        text: "죄송해요, 지금은 제대로 대답하기 어려운 것 같아요. 다시 한 번 말씀해주시겠어요? 💕",
        videoUrl: null,
        audioUrl: null,
        emotion: 'confused',
        relationshipChange: 0,
      };

      // Still save the conversation even if AI fails
      const updatedMessages = [
        ...currentMessages,
        {
          id: Date.now().toString(),
          role: 'user',
          content: message,
          timestamp: new Date().toISOString(),
        },
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: fallbackResponse.text,
          videoUrl: fallbackResponse.videoUrl,
          audioUrl: fallbackResponse.audioUrl,
          emotion: fallbackResponse.emotion,
          timestamp: new Date().toISOString(),
        },
      ];

      await prisma.chatSession.update({
        where: { id: session.id },
        data: {
          messages: updatedMessages,
          lastPlayedAt: new Date(),
        },
      });

      return NextResponse.json({
        sessionId: session.id,
        response: fallbackResponse,
        relationshipScore: session.relationshipScore,
      });
    }
  } catch (error) {
    console.error('Error processing chat:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        episode: {
          include: {
            character: true,
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ session });
  } catch (error) {
    console.error('Error fetching chat session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat session' },
      { status: 500 }
    );
  }
}
