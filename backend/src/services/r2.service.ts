import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import { config } from '../config';

export class R2Service {
  private static client: S3Client | null = null;
  private static isInitialized = false;

  public static isConfigured(): boolean {
    return Boolean(config.r2AccountId && config.r2AccessKeyId && config.r2SecretAccessKey);
  }

  private static getClient(): S3Client | null {
    if (this.isInitialized) return this.client;

    if (this.isConfigured()) {
      try {
        this.client = new S3Client({
          region: 'auto',
          endpoint: `https://${config.r2AccountId}.r2.cloudflarestorage.com`,
          credentials: {
            accessKeyId: config.r2AccessKeyId,
            secretAccessKey: config.r2SecretAccessKey,
          },
        });
        console.log(`[R2 Storage] Connected to Cloudflare R2 (Bucket: ${config.r2BucketName})`);
      } catch (err: any) {
        console.warn('[R2 Storage] Failed to initialize Cloudflare R2:', err.message);
      }
    } else {
      console.log('[R2 Storage] Cloudflare R2 credentials not set in .env. Falling back to local disk storage.');
    }

    this.isInitialized = true;
    return this.client;
  }

  public static async uploadFile(
    localFilePath: string,
    destinationKey: string,
    contentType: string = 'application/pdf'
  ): Promise<string | null> {
    const s3 = this.getClient();
    if (!s3 || !config.r2BucketName) {
      return null;
    }

    try {
      if (!fs.existsSync(localFilePath)) {
        console.warn(`[R2 Storage] File not found at path: ${localFilePath}`);
        return null;
      }

      const fileBuffer = fs.readFileSync(localFilePath);
      const command = new PutObjectCommand({
        Bucket: config.r2BucketName,
        Key: destinationKey,
        Body: fileBuffer,
        ContentType: contentType,
      });

      await s3.send(command);
      console.log(`[R2 Storage] Successfully uploaded ${destinationKey} to Cloudflare R2 bucket: ${config.r2BucketName}`);

      if (config.r2PublicUrl) {
        const cleanBase = config.r2PublicUrl.replace(/\/+$/, '');
        return `${cleanBase}/${destinationKey}`;
      }

      return `https://${config.r2BucketName}.${config.r2AccountId}.r2.cloudflarestorage.com/${destinationKey}`;
    } catch (err: any) {
      console.warn(`[R2 Storage] Error uploading ${destinationKey} to Cloudflare R2:`, err.message);
      return null;
    }
  }
}
