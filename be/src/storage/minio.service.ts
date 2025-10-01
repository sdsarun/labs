import { Injectable, Logger } from '@nestjs/common';
import {
  GetObjectParam,
  PresignedUrlParam,
  RemoveObjectsParam,
  StorageService,
} from 'src/storage/storage.abstract';
import { Client } from 'minio';
import { Readable } from 'node:stream';
import { InvalidPresignedUrlMode } from 'src/storage/storage.error';

@Injectable()
export class MinioService extends StorageService {
  private storage: Client;
  private bucketName: string;
  private presignedUrlExpred: number = 60 * 15;

  constructor() {
    super();
    this.storage = new Client({
      endPoint: '192.168.1.161',
      port: 19001,
      useSSL: false,
      accessKey: 'admin',
      secretKey: 'P@ssw0rd1234',
    });
    this.bucketName = 'test';
    Logger.log(MinioService.name + ' initialize');
    void this.health();
  }

  async health(): Promise<boolean> {
    try {
      const isBucketExists = await this.storage.bucketExists(this.bucketName);
      if (isBucketExists) {
        Logger.log(`MinIO is healthy. Bucket "${this.bucketName}" exists.`);
        return true;
      }

      await this.storage.makeBucket(this.bucketName);
      Logger.log(
        `MinIO is healthy. Bucket "${this.bucketName}" was missing and has been created.`,
      );
      return true;
    } catch (error) {
      Logger.error(`MinIO health check failed: ${(error as Error)?.message}`);
      return false;
    }
  }

  async getObject({ objectName }: GetObjectParam): Promise<Readable> {
    return this.storage.getObject(this.bucketName, objectName);
  }

  async removeObjects(param: RemoveObjectsParam): Promise<void> {
    const result = await this.storage.removeObjects(
      this.bucketName,
      param.objects,
    );
    console.log(
      '[LOG] - minio.service.ts:59 - MinioService - removeObjects - result:',
      result,
    );
  }

  presignedUrl(param: PresignedUrlParam): Promise<string> {
    switch (param.mode) {
      case 'upload': {
        return this.storage.presignedPutObject(
          this.bucketName,
          param.name,
          this.presignedUrlExpred,
        );
      }
      case 'download': {
        return this.storage.presignedGetObject(
          this.bucketName,
          param.name,
          this.presignedUrlExpred,
          param.resHeader,
        );
      }
      default: {
        throw new InvalidPresignedUrlMode();
      }
    }
  }
}
