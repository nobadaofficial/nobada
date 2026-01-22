import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { ChatSession, Episode, Character } from '@prisma/client';

// Force this route to be included in the build
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type SessionWithRelations = ChatSession & {
  episode: Episode & {
    character: Character;
  };
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    // Fetch user's chat sessions
    const sessions = await prisma.chatSession.findMany({
      where: {
        userId,
      },
      orderBy: {
        lastPlayedAt: 'desc',
      },
      include: {
        episode: {
          include: {
            character: true,
          },
        },
      },
    });

    // Transform to chat history format
    const chatHistory = sessions.map((session: SessionWithRelations) => {
      const messages = (session.messages as any[]) || [];
      const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;

      return {
        id: session.id,
        characterId: session.episode.character.id,
        characterName: session.episode.character.name,
        characterImage: session.episode.character.profileImage,
        lastMessage: lastMessage?.content || '대화를 시작해보세요',
        lastMessageTime: session.lastPlayedAt,
        messageCount: messages.filter((m: any) => m.role === 'user').length,
        relationshipLevel: Math.floor(session.relationshipScore / 20) + 1, // Convert score to level (1-5)
        unreadCount: 0, // TODO: Implement unread message tracking
        status: session.status,
      };
    });

    return NextResponse.json({ chatHistory });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat history' },
      { status: 500 }
    );
  }
}
