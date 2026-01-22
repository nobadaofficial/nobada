export const GOOGLE_TTS_CONFIG = {
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID!,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS!,

  voices: {
    korean: {
      female: {
        standard: 'ko-KR-Standard-A',  // 표준 여성음
        wavenet: 'ko-KR-Wavenet-A',    // WaveNet 여성음 (고품질)
        neural: 'ko-KR-Neural2-A',      // Neural2 여성음 (최고품질)
      },
      male: {
        standard: 'ko-KR-Standard-C',
        wavenet: 'ko-KR-Wavenet-C',
        neural: 'ko-KR-Neural2-C',
      }
    }
  },

  // SSML을 이용한 감정 표현
  ssmlProfiles: {
    happy: '<prosody rate="110%" pitch="+2st">',
    sad: '<prosody rate="90%" pitch="-2st">',
    excited: '<prosody rate="120%" pitch="+3st">',
    calm: '<prosody rate="85%" pitch="-1st">',
    romantic: '<prosody rate="95%" pitch="+1st">',
    shy: '<prosody rate="90%" pitch="+1st">',
    angry: '<prosody rate="105%" pitch="-1st">',
    neutral: '',
  } as const
};