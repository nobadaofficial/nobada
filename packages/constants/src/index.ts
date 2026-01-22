// App Configuration
export const APP_NAME = 'Nobada';
export const APP_VERSION = '1.0.0';

// API Configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
export const API_TIMEOUT = 30000; // 30 seconds

// Currency Configuration
export const INITIAL_HEARTS = 100;
export const INITIAL_DIAMONDS = 10;

export const CURRENCY_COSTS = {
  CHAT_MESSAGE: 1,      // hearts per message
  PREMIUM_CHOICE: 1,    // diamonds per choice
  GALLERY_UNLOCK: 3,    // diamonds per item
  REPLAY: 2,           // hearts per replay
} as const;

// TTS Configuration
export const TTS_CONFIG = {
  MAX_TEXT_LENGTH: 200,
  DEFAULT_VOICE_ID: 'ko-KR-Neural2-A',
  CACHE_DURATION: 3600000, // 1 hour in ms
  STREAM_CHUNK_SIZE: 4096,
} as const;

// Video Configuration
export const VIDEO_CONFIG = {
  DEFAULT_QUALITY: '720p',
  QUALITIES: ['360p', '480p', '720p', '1080p'],
  MAX_BUFFER_LENGTH: 30, // seconds
  ASPECT_RATIO_MOBILE: 9 / 16,
  ASPECT_RATIO_DESKTOP: 16 / 9,
} as const;

// Chat Configuration
export const CHAT_CONFIG = {
  MAX_MESSAGE_LENGTH: 200,
  MAX_HISTORY_LENGTH: 20,
  TYPING_INDICATOR_DELAY: 1000,
  AI_RESPONSE_DELAY: 500,
} as const;

// Relationship Levels
export const RELATIONSHIP_LEVELS = {
  STRANGER: { min: 0, max: 20, label: '낯선 사람' },
  ACQUAINTANCE: { min: 21, max: 40, label: '아는 사이' },
  FRIEND: { min: 41, max: 60, label: '친구' },
  CLOSE_FRIEND: { min: 61, max: 80, label: '가까운 친구' },
  ROMANTIC: { min: 81, max: 100, label: '연인' },
} as const;

// Colors
export const COLORS = {
  // Primary Colors
  PRIMARY: '#FF6B9D',
  SECONDARY: '#C44569',
  ACCENT: '#FFC0CB',

  // Emotion Colors
  EMOTION: {
    LOVE: '#FF1744',
    HAPPY: '#FFD54F',
    SAD: '#7986CB',
    ANGRY: '#FF5252',
    SHY: '#FFB6C1',
    NEUTRAL: '#90A4AE',
  },

  // System Colors
  BACKGROUND: '#0A0A0A',
  SURFACE: '#1A1A1A',
  SURFACE_ELEVATED: '#2D2D2D',

  // Text Colors
  TEXT_PRIMARY: '#FFFFFF',
  TEXT_SECONDARY: '#B0B0B0',
  TEXT_MUTED: '#6B6B6B',

  // Status Colors
  SUCCESS: '#4CAF50',
  WARNING: '#FFC107',
  ERROR: '#F44336',
  INFO: '#2196F3',
} as const;

// Font Configuration
export const FONTS = {
  PRIMARY: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
  SECONDARY: 'Inter, sans-serif',
} as const;

// Breakpoints
export const BREAKPOINTS = {
  MOBILE: 320,
  MOBILE_LG: 430,
  TABLET: 768,
  DESKTOP: 1024,
  DESKTOP_LG: 1440,
} as const;

// Animation Timing
export const ANIMATION_DURATION = {
  INSTANT: 0,
  FAST: 200,
  NORMAL: 300,
  SLOW: 500,
  VERY_SLOW: 1000,
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'nobada_auth_token',
  USER_PREFERENCES: 'nobada_user_preferences',
  SOUND_ENABLED: 'nobada_sound_enabled',
  LANGUAGE: 'nobada_language',
  LAST_EPISODE: 'nobada_last_episode',
} as const;

// Error Codes
export const ERROR_CODES = {
  // Auth Errors
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_EXPIRED: 'AUTH_EXPIRED',
  AUTH_INVALID: 'AUTH_INVALID',

  // Payment Errors
  INSUFFICIENT_HEARTS: 'INSUFFICIENT_HEARTS',
  INSUFFICIENT_DIAMONDS: 'INSUFFICIENT_DIAMONDS',
  PAYMENT_FAILED: 'PAYMENT_FAILED',

  // Network Errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  SERVER_ERROR: 'SERVER_ERROR',

  // Content Errors
  CONTENT_NOT_FOUND: 'CONTENT_NOT_FOUND',
  CONTENT_LOCKED: 'CONTENT_LOCKED',
  CONTENT_EXPIRED: 'CONTENT_EXPIRED',

  // TTS Errors
  TTS_FAILED: 'TTS_FAILED',
  TTS_UNAVAILABLE: 'TTS_UNAVAILABLE',

  // Video Errors
  VIDEO_LOAD_FAILED: 'VIDEO_LOAD_FAILED',
  VIDEO_PLAYBACK_ERROR: 'VIDEO_PLAYBACK_ERROR',
} as const;

// Routes
export const ROUTES = {
  HOME: '/',
  HISTORY: '/history',
  DISCOVER: '/discover',
  PROFILE: '/profile',
  EPISODE: '/episode/:id',
  CHAT: '/chat/:sessionId',
  SHOP: '/shop',
  SETTINGS: '/settings',
  LOGIN: '/login',
  SIGNUP: '/signup',
} as const;

// Google Cloud Configuration
export const GCP_CONFIG = {
  PROJECT_ID: process.env.GOOGLE_CLOUD_PROJECT_ID,
  BUCKET_NAME: process.env.GCS_BUCKET_NAME,
  CDN_URL: process.env.GCP_CDN_URL || 'https://cdn.nobada.com',
  REGION: 'asia-northeast3', // Seoul
} as const;