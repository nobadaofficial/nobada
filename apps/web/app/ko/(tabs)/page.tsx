import { HomeFeed } from '@/components/home/HomeFeed';
import { CharacterClipData } from '@/components/home/CharacterClip';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering to avoid build-time database access
export const dynamic = 'force-dynamic';

// Available video files in /public/videos/
const VIDEO_FILES = [
  '/videos/sample1_260126.mp4',
  '/videos/sample2_260126.mp4',
  '/videos/sample3_260126.mp4',
  '/videos/sample4_260126.mp4',
];

// Get random video from the available videos
function getRandomVideo(): string {
  return VIDEO_FILES[Math.floor(Math.random() * VIDEO_FILES.length)];
}

async function getInitialClips(): Promise<{
  clips: CharacterClipData[];
  nextCursor: string | null;
  hasMore: boolean;
}> {
  const limit = 20;

  // Fetch published characters from database
  const characters = await prisma.character.findMany({
    where: {
      isPublished: true,
    },
    orderBy: [
      { isTrending: 'desc' },
      { chatCount: 'desc' },
      { createdAt: 'desc' },
    ],
    take: limit + 1,
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
    },
  });

  const hasMore = characters.length > limit;
  const items = hasMore ? characters.slice(0, -1) : characters;
  const nextCursor = hasMore ? characters[characters.length - 2].id : null;

  // Convert to CharacterClipData format
  const clips: CharacterClipData[] = items.map((character) => ({
    id: character.id,
    characterId: character.id,
    characterName: character.name,
    characterAge: character.age,
    characterOccupation: character.occupation,
    // Use random video from /videos/ directory if previewVideoUrl is not set
    videoUrl: character.previewVideoUrl || getRandomVideo(),
    thumbnailUrl: character.thumbnailUrl,
    description: character.description.substring(0, 100), // Limit description length
    tags: character.tags,
    stats: {
      likes: character.likeCount,
      chats: character.chatCount,
    },
  }));

  return {
    clips,
    nextCursor,
    hasMore,
  };
}

export default async function HomePage() {
  const initialData = await getInitialClips();

  return <HomeFeed initialData={initialData} />;
}