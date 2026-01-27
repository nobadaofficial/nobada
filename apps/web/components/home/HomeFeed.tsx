'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CharacterClip, CharacterClipData } from './CharacterClip';
import { Loader2 } from 'lucide-react';

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

interface HomeFeedProps {
  initialData?: {
    clips: CharacterClipData[];
    nextCursor: string | null;
    hasMore: boolean;
  };
}

export function HomeFeed({ initialData }: HomeFeedProps) {
  const router = useRouter();
  const [clips, setClips] = useState<CharacterClipData[]>(initialData?.clips || []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(!initialData);
  const [isMuted, setIsMuted] = useState(true);
  const [cursor, setCursor] = useState<string | null>(initialData?.nextCursor || null);
  const [hasMore, setHasMore] = useState(initialData?.hasMore ?? true);
  const [loadingMore, setLoadingMore] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const slidingContainerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number>(0);
  const touchStartTime = useRef<number>(0);
  const isAnimating = useRef<boolean>(false);
  const isDraggingRef = useRef<boolean>(false);
  const dragOffsetRef = useRef<number>(0);

  // Fetch initial clips if no server data
  useEffect(() => {
    if (initialData) return;

    const fetchClips = async () => {
      try {
        // TODO: Replace with actual API call
        const mockClips: CharacterClipData[] = [
          {
            id: '1',
            characterId: '1',
            characterName: '서윤',
            characterAge: 24,
            characterOccupation: '바리스타',
            videoUrl: getRandomVideo(),
            thumbnailUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=600&fit=crop',
            description: '커피 향과 함께하는 따뜻한 일상을 나누고 싶어요',
            tags: ['로맨틱', '일상', '힐링'],
            stats: { likes: 5892, chats: 892 },
          },
          {
            id: '2',
            characterId: '2',
            characterName: '지민',
            characterAge: 26,
            characterOccupation: '요가 강사',
            videoUrl: getRandomVideo(),
            thumbnailUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=600&fit=crop',
            description: '몸과 마음의 균형을 함께 찾아가요',
            tags: ['스포티', '건강', '긍정적'],
            stats: { likes: 3421, chats: 521 },
          },
          {
            id: '3',
            characterId: '3',
            characterName: '하늘',
            characterAge: 22,
            characterOccupation: '대학생',
            videoUrl: getRandomVideo(),
            thumbnailUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=600&fit=crop',
            description: '꿈을 향해 달리는 청춘의 이야기',
            tags: ['로맨틱', '모험', '청춘'],
            stats: { likes: 4123, chats: 723 },
          },
        ];
        setClips(mockClips);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch clips:', error);
        setLoading(false);
      }
    };

    fetchClips();
  }, [initialData]);

  // Load more clips
  const loadMoreClips = useCallback(async () => {
    if (loadingMore || !hasMore || !cursor) return;

    setLoadingMore(true);
    try {
      // TODO: Implement actual API call
      // const res = await fetch(`/api/clips?cursor=${cursor}`);
      // const data = await res.json();
      // setClips(prev => [...prev, ...data.clips]);
      // setCursor(data.nextCursor);
      // setHasMore(data.hasMore);
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, hasMore, loadingMore]);

  // Check if need to load more
  useEffect(() => {
    const remainingClips = clips.length - currentIndex - 1;
    if (remainingClips <= 2 && hasMore && !loadingMore) {
      loadMoreClips();
    }
  }, [currentIndex, clips.length, hasMore, loadingMore, loadMoreClips]);

  // Animation helpers
  const completeTransition = useCallback((direction: 'next' | 'prev') => {
    setCurrentIndex((prev) => {
      if (direction === 'next') {
        return Math.min(prev + 1, clips.length - 1);
      } else {
        return Math.max(prev - 1, 0);
      }
    });

    if (slidingContainerRef.current) {
      slidingContainerRef.current.style.transition = 'none';
      slidingContainerRef.current.style.transform = 'translate3d(0, 0, 0)';
    }
    dragOffsetRef.current = 0;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        isAnimating.current = false;
      });
    });
  }, [clips.length]);

  const animateToPosition = useCallback((targetPercent: number, direction: 'next' | 'prev' | null) => {
    if (!slidingContainerRef.current) return;

    const screenHeight = window.innerHeight;
    const targetOffset = targetPercent * screenHeight;
    const distance = Math.abs(targetOffset - dragOffsetRef.current);
    const duration = Math.min(400, Math.max(200, distance * 0.5));

    slidingContainerRef.current.style.transition = `transform ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
    slidingContainerRef.current.style.transform = `translate3d(0, ${-targetOffset}px, 0)`;

    if (direction) {
      isAnimating.current = true;
      setTimeout(() => completeTransition(direction), duration);
    } else {
      dragOffsetRef.current = 0;
    }
  }, [completeTransition]);

  // Swipe handlers
  const handleDragStart = (clientY: number) => {
    if (isAnimating.current) return;
    touchStartY.current = clientY;
    touchStartTime.current = Date.now();
    isDraggingRef.current = true;
    if (slidingContainerRef.current) {
      slidingContainerRef.current.style.transition = 'none';
    }
  };

  const handleDragMove = (clientY: number) => {
    if (!isDraggingRef.current || isAnimating.current) return;
    const delta = touchStartY.current - clientY;
    const maxDrag = window.innerHeight * 0.6;
    const limitedDelta = Math.max(-maxDrag, Math.min(maxDrag, delta));
    dragOffsetRef.current = limitedDelta;
    if (slidingContainerRef.current) {
      slidingContainerRef.current.style.transform = `translate3d(0, ${-limitedDelta}px, 0)`;
    }
  };

  const handleDragEnd = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    const deltaY = dragOffsetRef.current;
    const deltaTime = Date.now() - touchStartTime.current;
    const velocity = Math.abs(deltaY) / deltaTime;
    const screenHeight = window.innerHeight;

    const threshold = screenHeight * 0.25;
    const velocityThreshold = 0.5;
    const swipeEnough = Math.abs(deltaY) >= threshold || velocity >= velocityThreshold;

    if (swipeEnough && deltaY > 0 && currentIndex < clips.length - 1) {
      animateToPosition(1, 'next');
    } else if (swipeEnough && deltaY < 0 && currentIndex > 0) {
      animateToPosition(-1, 'prev');
    } else {
      animateToPosition(0, null);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => handleDragStart(e.touches[0].clientY);
  const handleTouchMove = (e: React.TouchEvent) => handleDragMove(e.touches[0].clientY);
  const handleTouchEnd = () => handleDragEnd();

  const handleMouseDown = (e: React.MouseEvent) => handleDragStart(e.clientY);
  const handleMouseMove = (e: React.MouseEvent) => handleDragMove(e.clientY);
  const handleMouseUp = () => handleDragEnd();
  const handleMouseLeave = () => {
    if (isDraggingRef.current) handleDragEnd();
  };

  // Action handlers
  const handlePlay = useCallback((clip: CharacterClipData) => {
    // TODO: Navigate to chat with character
    router.push(`/ko/chat/${clip.characterId}`);
  }, [router]);

  const handleShare = useCallback(async (clip: CharacterClipData) => {
    const url = `${window.location.origin}/ko/character/${clip.characterId}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${clip.characterName} - Nobada`,
          text: clip.description,
          url,
        });
      } catch (err) {
        console.error('Share failed:', err);
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(url);
      // TODO: Show toast notification
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAnimating.current || isDraggingRef.current) return;

      if (e.key === 'ArrowDown' && currentIndex < clips.length - 1) {
        e.preventDefault();
        isAnimating.current = true;
        animateToPosition(1, 'next');
      } else if (e.key === 'ArrowUp' && currentIndex > 0) {
        e.preventDefault();
        isAnimating.current = true;
        animateToPosition(-1, 'prev');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, clips.length, animateToPosition]);

  if (loading) {
    return (
      <div className="h-dvh bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#FF6B6B]" />
      </div>
    );
  }

  if (clips.length === 0) {
    return (
      <div className="h-dvh bg-black flex items-center justify-center">
        <div className="text-white text-center p-6">
          <p className="mb-4 text-lg">캐릭터를 준비 중입니다</p>
          <p className="text-white/50 text-sm">곧 새로운 캐릭터가 추가될 예정입니다!</p>
        </div>
      </div>
    );
  }

  const currentClip = clips[currentIndex];
  const prevIndex = Math.max(0, currentIndex - 1);
  const nextIndex = Math.min(clips.length - 1, currentIndex + 1);

  return (
    <div className="h-dvh overflow-hidden relative">
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        className="w-full h-full bg-black relative overflow-hidden cursor-grab active:cursor-grabbing"
        style={{
          overscrollBehavior: 'none',
          touchAction: 'pan-x pinch-zoom',
        }}
      >
        <div
          ref={slidingContainerRef}
          className="absolute inset-0"
          style={{
            transform: 'translate3d(0, 0, 0)',
            willChange: 'transform',
          }}
        >
          {/* Previous Clip */}
          <div
            className="absolute w-full h-full"
            style={{ top: '-100%' }}
          >
            <CharacterClip
              clip={clips[prevIndex]}
              isActive={false}
              isMuted={isMuted}
              onToggleMute={toggleMute}
              onPlay={handlePlay}
              onShare={handleShare}
            />
          </div>

          {/* Current Clip */}
          <div className="absolute w-full h-full" style={{ top: '0' }}>
            <CharacterClip
              clip={currentClip}
              isActive={true}
              isMuted={isMuted}
              onToggleMute={toggleMute}
              onPlay={handlePlay}
              onShare={handleShare}
            />
          </div>

          {/* Next Clip */}
          <div
            className="absolute w-full h-full"
            style={{ top: '100%' }}
          >
            <CharacterClip
              clip={clips[nextIndex]}
              isActive={false}
              isMuted={isMuted}
              onToggleMute={toggleMute}
              onPlay={handlePlay}
              onShare={handleShare}
            />
          </div>
        </div>
      </div>

      {/* Page Indicators */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
        {clips.map((_, index) => (
          <div
            key={index}
            className={`w-1 transition-all duration-300 ${
              index === currentIndex
                ? 'h-6 bg-white'
                : 'h-4 bg-white/40'
            } rounded-full`}
          />
        ))}
      </div>
    </div>
  );
}