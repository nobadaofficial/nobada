'use client';

import { useRef, useEffect } from 'react';
import { Play, Heart, MessageCircle, Volume2, VolumeX, Share2 } from 'lucide-react';

export interface CharacterClipData {
  id: string;
  characterId: string;
  characterName: string;
  characterAge: number;
  characterOccupation: string;
  videoUrl: string;
  thumbnailUrl: string;
  description: string;
  tags: string[];
  stats: {
    likes: number;
    chats: number;
  };
}

interface CharacterClipProps {
  clip: CharacterClipData;
  isActive: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onPlay: (clip: CharacterClipData) => void;
  onShare: (clip: CharacterClipData) => void;
}

export function CharacterClip({
  clip,
  isActive,
  isMuted,
  onToggleMute,
  onPlay,
  onShare,
}: CharacterClipProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    if (isActive) {
      videoRef.current.play().catch(err => {
        console.error('Video play failed:', err);
      });
    } else {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [isActive]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const handleVideoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // 비디오 클릭 시 아무것도 하지 않음 (전체 화면 방지)
  };

  return (
    <div className="relative w-full h-full bg-black">
      {/* Video Background */}
      <video
        ref={videoRef}
        src={clip.videoUrl}
        preload="metadata"
        loop
        muted={isMuted}
        playsInline
        webkit-playsinline="true"
        className="absolute inset-0 w-full h-full object-cover"
        onClick={handleVideoClick}
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80 pointer-events-none" />

      {/* Right Side Actions */}
      <div className="absolute right-4 bottom-32 flex flex-col items-center gap-6">
        {/* Mute Toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleMute();
          }}
          className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white"
        >
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>

        {/* Like */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            // TODO: Implement like
          }}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
            <Heart size={20} className="text-white" />
          </div>
          <span className="text-white text-xs font-semibold">
            {(clip.stats.likes / 1000).toFixed(1)}k
          </span>
        </button>

        {/* Chat Count */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPlay(clip);
          }}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
            <MessageCircle size={20} className="text-white" />
          </div>
          <span className="text-white text-xs font-semibold">
            {clip.stats.chats.toLocaleString()}
          </span>
        </button>

        {/* Share */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onShare(clip);
          }}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
            <Share2 size={20} className="text-white" />
          </div>
        </button>
      </div>

      {/* Character Info */}
      <div className="absolute bottom-20 left-4 right-20">
        <h2 className="text-white text-2xl font-bold mb-1">
          {clip.characterName}, {clip.characterAge}
        </h2>
        <p className="text-white/90 text-sm mb-2">{clip.characterOccupation}</p>
        <p className="text-white/80 text-sm mb-3 line-clamp-2">{clip.description}</p>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {clip.tags.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-xs"
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* Start Chat Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPlay(clip);
          }}
          className="bg-[#FF6B6B] text-white px-6 py-3 rounded-full font-semibold flex items-center gap-2 hover:bg-[#FF5555] transition-colors"
        >
          <Play size={16} fill="white" />
          대화 시작하기
        </button>
      </div>
    </div>
  );
}