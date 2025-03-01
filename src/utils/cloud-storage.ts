import { Storage } from '@google-cloud/storage';

export class CloudStorage {
  private static instance: CloudStorage;
  private storage: Storage;
  private bucket: string;

  private constructor() {
    this.storage = new Storage({
      projectId: 'stitch-ai-451906',
    });
    this.bucket = 'stitch-ai';
  }

  public static getInstance(): CloudStorage {
    if (!CloudStorage.instance) {
      CloudStorage.instance = new CloudStorage();
    }
    return CloudStorage.instance;
  }

  async readAndUpload(sourceFileName: string, destinationFileName: string) {
    const bucket = this.storage.bucket(this.bucket);
    const sourceFile = bucket.file(sourceFileName);

    try {
      const [exists] = await sourceFile.exists();
      if (!exists) {
        throw new Error(`파일을 찾을 수 없습니다: ${sourceFileName}`);
      }

      const [fileContent] = await sourceFile.download();
      const destinationFile = bucket.file(destinationFileName);
      await destinationFile.save(fileContent);

      return `https://storage.googleapis.com/${this.bucket}/${destinationFileName}`;
    } catch (error) {
      throw error;
    }
  }

  async upload(fileBuffer: Buffer, destinationFileName: string): Promise<string> {
    const bucket = this.storage.bucket(this.bucket);
    const destinationFile = bucket.file(destinationFileName);

    try {
      await destinationFile.save(fileBuffer);

      return `https://storage.googleapis.com/${this.bucket}/${destinationFileName}`;
    } catch (error) {
      throw error;
    }
  }
}
