import { Storage } from '@google-cloud/storage';
import { Readable } from 'stream';

export class GCSManager {
  private storage: Storage;
  private bucketName: string;

  constructor() {
    this.storage = new Storage({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    });
    this.bucketName = process.env.GCS_BUCKET_NAME || 'nobada-media';
  }

  // Upload audio file
  async uploadAudio(
    audioBuffer: Buffer,
    path: string,
    metadata?: { [key: string]: string }
  ): Promise<string> {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(`audio/${path}`);

    await file.save(audioBuffer, {
      metadata: {
        contentType: 'audio/mpeg',
        cacheControl: 'public, max-age=31536000',
        ...metadata,
      },
    });

    // Generate signed URL (valid for 7 days)
    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });

    return signedUrl;
  }

  // Upload video file
  async uploadVideo(
    videoStream: Readable,
    path: string,
    metadata?: { [key: string]: string }
  ): Promise<string> {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(`videos/${path}`);

    const stream = file.createWriteStream({
      resumable: true,
      metadata: {
        contentType: 'video/mp4',
        cacheControl: 'public, max-age=86400',
        ...metadata,
      },
    });

    return new Promise((resolve, reject) => {
      videoStream
        .pipe(stream)
        .on('error', reject)
        .on('finish', async () => {
          // Make the file public
          await file.makePublic();

          // Return public URL
          const publicUrl = `https://storage.googleapis.com/${this.bucketName}/videos/${path}`;
          resolve(publicUrl);
        });
    });
  }

  // Get video streaming URL
  async getVideoStreamUrl(videoPath: string): Promise<string> {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(`videos/${videoPath}`);

    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      throw new Error(`Video file not found: ${videoPath}`);
    }

    // Return public URL for CDN caching
    return `https://storage.googleapis.com/${this.bucketName}/videos/${videoPath}`;
  }

  // Get audio URL
  async getAudioUrl(audioPath: string): Promise<string> {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(`audio/${audioPath}`);

    // Generate signed URL for audio (1 hour validity)
    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000,
    });

    return signedUrl;
  }

  // Upload image
  async uploadImage(
    imageBuffer: Buffer,
    path: string,
    metadata?: { [key: string]: string }
  ): Promise<string> {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(`images/${path}`);

    await file.save(imageBuffer, {
      metadata: {
        contentType: 'image/jpeg',
        cacheControl: 'public, max-age=31536000',
        ...metadata,
      },
    });

    // Make public for CDN
    await file.makePublic();

    return `https://storage.googleapis.com/${this.bucketName}/images/${path}`;
  }

  // Delete file
  async deleteFile(path: string): Promise<void> {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(path);

    await file.delete();
  }

  // List files in a directory
  async listFiles(prefix: string): Promise<string[]> {
    const bucket = this.storage.bucket(this.bucketName);
    const [files] = await bucket.getFiles({ prefix });

    return files.map(file => file.name);
  }

  // Get file metadata
  async getFileMetadata(path: string): Promise<any> {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(path);

    const [metadata] = await file.getMetadata();
    return metadata;
  }

  // Create upload stream for large files
  createUploadStream(path: string, contentType: string): NodeJS.WritableStream {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(path);

    return file.createWriteStream({
      resumable: true,
      metadata: {
        contentType,
        cacheControl: 'public, max-age=3600',
      },
    });
  }

  // Generate upload URL for client-side upload
  async generateUploadUrl(path: string, contentType: string): Promise<string> {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(path);

    const [url] = await file.getSignedUrl({
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType,
    });

    return url;
  }
}