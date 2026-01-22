'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, Send, Heart, Video } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  videoUrl?: string | null;
  audioUrl?: string | null;
  emotion?: string;
  timestamp: string;
}

interface Character {
  id: string;
  name: string;
  age: number;
  occupation: string;
  profileImage: string;
  description: string;
  voiceId: string;
}

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const characterId = params?.characterId as string;

  const [character, setCharacter] = useState<Character | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [relationshipScore, setRelationshipScore] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (characterId) {
      fetchCharacter();
    }
  }, [characterId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchCharacter = async () => {
    try {
      const response = await fetch(`/api/characters/${characterId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch character');
      }
      const data = await response.json();
      setCharacter(data.character);
    } catch (error) {
      console.error('Error fetching character:', error);
      // Redirect to home if character not found
      router.push('/ko');
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !character) return;

    const messageContent = inputMessage.trim();

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // TODO: Get actual userId from Clerk auth
      const userId = 'temp-user-id';

      // Use character ID as episode ID for now
      // In a real app, you'd fetch the actual episode
      const episodeId = characterId;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          episodeId,
          message: messageContent,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();

      setSessionId(data.sessionId);
      setRelationshipScore(data.relationshipScore);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response.text,
        videoUrl: data.response.videoUrl,
        audioUrl: data.response.audioUrl,
        emotion: data.response.emotion,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Play video if available
      if (data.response.videoUrl && videoRef.current) {
        videoRef.current.src = data.response.videoUrl;
        videoRef.current.play();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!character) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#1A1A1A] border-b border-[#2A2A2A]">
        <div className="max-w-[430px] mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-[#2A2A2A] rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>

          <div className="flex items-center gap-3 flex-1 ml-3">
            <div className="relative w-10 h-10">
              <Image
                src={character.profileImage}
                alt={character.name}
                fill
                className="rounded-full object-cover"
              />
            </div>
            <div>
              <h1 className="text-white font-semibold">{character.name}</h1>
              <p className="text-xs text-[#9CA3AF]">
                {character.age}세 · {character.occupation}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-[#FF6B6B]/10 px-2 py-1 rounded-full">
              <Heart className="w-4 h-4 text-[#FF6B6B]" fill="#FF6B6B" />
              <span className="text-xs text-[#FF6B6B] font-semibold">
                {relationshipScore}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Video Section */}
      <div className="relative w-full aspect-[9/16] max-h-[50vh] bg-black">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted={false}
        />
        <div className="absolute top-4 right-4">
          <div className="bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-2">
            <Video className="w-4 h-4 text-white" />
            <span className="text-xs text-white font-medium">Live</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-[#6B7280] text-sm">
              {character.name}님과 대화를 시작해보세요!
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-[#FF6B6B] text-white'
                  : 'bg-[#2A2A2A] text-white'
              }`}
            >
              <p className="text-sm">{message.content}</p>
              <p className="text-xs opacity-60 mt-1">
                {new Date(message.timestamp).toLocaleTimeString('ko-KR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[#2A2A2A] rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-[#9CA3AF] rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-[#9CA3AF] rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-[#9CA3AF] rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="sticky bottom-0 bg-[#1A1A1A] border-t border-[#2A2A2A] p-4">
        <div className="max-w-[430px] mx-auto flex items-end gap-2">
          <div className="flex-1 bg-[#2A2A2A] rounded-full px-4 py-2 flex items-center">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="메시지를 입력하세요..."
              className="flex-1 bg-transparent text-white placeholder-[#6B7280] outline-none text-sm"
              disabled={isLoading}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
              inputMessage.trim() && !isLoading
                ? 'bg-[#FF6B6B] hover:bg-[#FF5252]'
                : 'bg-[#2A2A2A] cursor-not-allowed'
            }`}
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
