import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Force this route to be included in the build
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const isTrending = searchParams.get('trending') === 'true';
    const isNew = searchParams.get('new') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');
    const cursor = searchParams.get('cursor');

    const where: any = {
      isPublished: true,
    };

    if (category) {
      where.episodes = {
        some: {
          category: category.toUpperCase() as any,
        },
      };
    }

    if (isTrending) {
      where.isTrending = true;
    }

    if (isNew) {
      where.isNew = true;
    }

    const characters = await prisma.character.findMany({
      where,
      take: limit + 1,
      ...(cursor && {
        cursor: {
          id: cursor,
        },
        skip: 1,
      }),
      orderBy: [
        { isTrending: 'desc' },
        { chatCount: 'desc' },
        { createdAt: 'desc' },
      ],
      select: {
        id: true,
        name: true,
        age: true,
        occupation: true,
        description: true,
        profileImage: true,
        thumbnailUrl: true,
        previewVideoUrl: true,
        tags: true,
        likeCount: true,
        chatCount: true,
        rating: true,
        isNew: true,
        isTrending: true,
      },
    });

    const hasMore = characters.length > limit;
    const items = hasMore ? characters.slice(0, -1) : characters;
    const nextCursor = hasMore ? characters[characters.length - 2].id : null;

    return NextResponse.json({
      characters: items,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error('Error fetching characters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch characters' },
      { status: 500 }
    );
  }
}
