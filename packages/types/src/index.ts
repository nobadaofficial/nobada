// User types
export interface User {
  id: string;
  clerkId: string;
  email?: string;
  username?: string;
  profileImage?: string;
  hearts: number;
  diamonds: number;
  createdAt: Date;
  updatedAt: Date;
}

// Character types
export interface Character {
  id: string;
  name: string;
  description: string;
  profileImage: string;
  personality: PersonalityTraits;
  backstory: string;
  voiceId: string;
}

export interface PersonalityTraits {
  openness: number;      // 0-100
  warmth: number;        // 0-100
  playfulness: number;   // 0-100
  mysteriousness: number; // 0-100
}

// Episode types
export interface Episode {
  id: string;
  title: string;
  description: string;
  characterId: string;
  character?: Character;
  category: Category;
  difficulty: Difficulty;
  introVideoUrl: string;
  videoPoolIds: string[];
  baseStory: string;
  branchPoints: BranchPoint[];
  playCount: number;
  avgRating?: number;
}

export type Category = 'first_love' | 'office' | 'fantasy' | 'daily' | 'mystery';
export type Difficulty = 'easy' | 'normal' | 'hard';

export interface BranchPoint {
  id: string;
  triggerCondition: string;
  relationshipRequirement?: number;
  branches: Branch[];
}

export interface Branch {
  id: string;
  condition: string;
  nextStorySegment: string;
}

// Chat types
export interface ChatSession {
  id: string;
  userId: string;
  episodeId: string;
  messages: Message[];
  relationshipScore: number;
  emotionalState: EmotionState;
  storyProgress: number;
  unlockedGallery: string[];
  currentBranch?: string;
  status: SessionStatus;
  createdAt: Date;
  lastPlayedAt: Date;
  completedAt?: Date;
}

export type SessionStatus = 'active' | 'paused' | 'completed' | 'abandoned';

export interface Message {
  id: string;
  role: 'USER' | 'AI' | 'SYSTEM';
  content: string;
  videoClipId?: string;
  audioUrl?: string;
  emotion?: EmotionType;
  relationshipDelta?: number;
  timestamp: Date;
}

export type EmotionType =
  | 'happy'
  | 'sad'
  | 'angry'
  | 'excited'
  | 'romantic'
  | 'shy'
  | 'neutral';

export interface EmotionState {
  current: EmotionType;
  intensity: number; // 0-100
  history: Array<{
    emotion: EmotionType;
    timestamp: Date;
  }>;
}

// Video types
export interface VideoClip {
  id: string;
  url: string;
  thumbnailUrl: string;
  emotion: EmotionType;
  intensity: 1 | 2 | 3;
  tags: string[];
  duration: number;
  characterId?: string;
}

// TTS types
export interface TTSOptions {
  voiceId?: string;
  emotion?: EmotionType;
  speed?: number;
  pitch?: number;
  volume?: number;
}

export interface TTSCache {
  id: string;
  textHash: string;
  text: string;
  voiceId: string;
  emotion: string;
  audioUrl: string;
  duration: number;
  usageCount: number;
  lastUsedAt: Date;
  createdAt: Date;
}

// Payment types
export interface Purchase {
  id: string;
  userId: string;
  type: 'hearts' | 'diamonds' | 'subscription';
  amount: number;
  currency: string;
  status: PaymentStatus;
  createdAt: Date;
  completedAt?: Date;
}

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

// Gallery types
export interface GalleryItem {
  id: string;
  episodeId: string;
  type: 'image' | 'video';
  url: string;
  thumbnailUrl: string;
  unlockCondition: string;
  relationshipRequirement?: number;
  diamondCost?: number;
}

// Achievement types
export interface Achievement {
  id: string;
  code: string;
  title: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  progress?: number;
  maxProgress?: number;
  unlockedAt?: Date;
}

export type AchievementCategory =
  | 'romance'
  | 'collection'
  | 'exploration'
  | 'social'
  | 'special';

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

// Conversation Context for AI
export interface ConversationContext {
  character: Character;
  messages: Message[];
  relationshipLevel: number;
  emotionalState: EmotionState;
  currentBranch?: string;
  storyProgress: number;
  userPreferences?: UserPreferences;
}

export interface UserPreferences {
  preferredPace: 'slow' | 'normal' | 'fast';
  preferredTone: 'casual' | 'formal' | 'playful';
  autoplay: boolean;
  soundEnabled: boolean;
}

// AI Response type
export interface AIResponse {
  text: string;
  emotion: EmotionType;
  videoClipId: string;
  ttsOptions: TTSOptions;
  relationshipDelta: number;
  nextBranch?: string;
  metadata?: {
    confidence: number;
    processingTime: number;
  };
}