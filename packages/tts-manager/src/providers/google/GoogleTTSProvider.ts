import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { google } from '@google-cloud/text-to-speech/build/protos/protos';
import { TTSProvider, TTSOptions, TTSProviderError } from '../../types';
import { GOOGLE_TTS_CONFIG } from './config';

export class GoogleTTSProvider extends TTSProvider {
  private client: TextToSpeechClient;

  constructor() {
    super();
    this.client = new TextToSpeechClient({
      projectId: GOOGLE_TTS_CONFIG.projectId,
      keyFilename: GOOGLE_TTS_CONFIG.keyFilename,
    });
  }

  async generateStream(
    text: string,
    options: TTSOptions
  ): Promise<ReadableStream<Uint8Array>> {
    const ssmlText = this.buildSSML(text, options);

    const request: google.cloud.texttospeech.v1.ISynthesizeSpeechRequest = {
      input: { ssml: ssmlText },
      voice: {
        languageCode: 'ko-KR',
        name: options.voiceId || 'ko-KR-Neural2-A',
        ssmlGender: google.cloud.texttospeech.v1.SsmlVoiceGender.FEMALE,
      },
      audioConfig: {
        audioEncoding: google.cloud.texttospeech.v1.AudioEncoding.MP3,
        speakingRate: options.speed || 1.0,
        pitch: options.pitch || 0,
        volumeGainDb: options.volume || 0,
      },
    };

    try {
      const [response] = await this.client.synthesizeSpeech(request);

      // 바이너리 데이터를 스트림으로 변환
      return new ReadableStream({
        start(controller) {
          if (response.audioContent) {
            const audioData = response.audioContent as Uint8Array;
            // 청크 단위로 스트리밍 (실시간 재생 시뮬레이션)
            const chunkSize = 4096;
            let offset = 0;

            const pushChunk = () => {
              if (offset < audioData.length) {
                const chunk = audioData.slice(offset, offset + chunkSize);
                controller.enqueue(chunk);
                offset += chunkSize;
                setTimeout(pushChunk, 10); // 10ms 간격으로 청크 전송
              } else {
                controller.close();
              }
            };

            pushChunk();
          } else {
            controller.close();
          }
        },
      });
    } catch (error) {
      console.error('Google TTS Error:', error);
      throw new TTSProviderError('Failed to generate TTS with Google', error);
    }
  }

  async generateAudio(
    text: string,
    options: TTSOptions
  ): Promise<ArrayBuffer> {
    const ssmlText = this.buildSSML(text, options);

    const request: google.cloud.texttospeech.v1.ISynthesizeSpeechRequest = {
      input: { ssml: ssmlText },
      voice: {
        languageCode: 'ko-KR',
        name: options.voiceId || 'ko-KR-Neural2-A',
        ssmlGender: google.cloud.texttospeech.v1.SsmlVoiceGender.FEMALE,
      },
      audioConfig: {
        audioEncoding: google.cloud.texttospeech.v1.AudioEncoding.MP3,
        speakingRate: options.speed || 1.0,
        pitch: options.pitch || 0,
        volumeGainDb: options.volume || 0,
      },
    };

    try {
      const [response] = await this.client.synthesizeSpeech(request);

      if (!response.audioContent) {
        throw new Error('No audio content received from Google TTS');
      }

      return (response.audioContent as Uint8Array).buffer;
    } catch (error) {
      console.error('Google TTS Error:', error);
      throw new TTSProviderError('Failed to generate TTS with Google', error);
    }
  }

  private buildSSML(text: string, options: TTSOptions): string {
    const emotion = options.emotion || 'neutral';
    const profile = GOOGLE_TTS_CONFIG.ssmlProfiles[emotion];

    // SSML 구조 생성
    let ssml = '<speak>';

    if (profile) {
      ssml += profile + text + '</prosody>';
    } else {
      ssml += text;
    }

    // 한국어 특수 처리 (숫자 읽기 등)
    ssml = ssml
      .replace(/(\d+)살/g, '<say-as interpret-as="cardinal">$1</say-as>살')
      .replace(/(\d{4})년/g, '<say-as interpret-as="date" format="y">$1</say-as>')
      .replace(/♥|❤/g, '<sub alias="하트">♥</sub>');

    ssml += '</speak>';

    return ssml;
  }
}