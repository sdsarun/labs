import { Injectable, NotFoundException } from '@nestjs/common';
import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { ensureDirectoryExists } from 'src/file.utils';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  async getResouceByResouceId(param: { resouceId: string }) {
    const { resouceId } = param;
    const resouceLocate = `temp/files-uploaded/${resouceId}`;
    if (!existsSync(resouceLocate)) {
      throw new NotFoundException();
    }
    const fileReadStream = createReadStream(resouceLocate);
    ensureDirectoryExists(`temp/files-out`);
    const fileInBuffer = readFileSync(resouceLocate);

    const fileInBuffer2 = await new Promise<Buffer<ArrayBufferLike>[]>(
      (resolve) => {
        const buffers: Buffer<ArrayBufferLike>[] = [];
        fileReadStream.on('data', (chunk) => {
          buffers.push(chunk as Buffer<ArrayBufferLike>);
        });

        fileReadStream.on('error', (error) => {
          throw error;
        });

        fileReadStream.on('end', () => {
          resolve(buffers);
        });
      },
    );

    console.log(
      '[LOG] - app.service.ts:20 - AppService - getResouceByResouceId - fileInBuffer2:',
      fileInBuffer2.reduce((prev, current) => prev + current.length, 0),
      fileInBuffer2.at(0)?.length,
    );
    console.log(
      '[LOG] - app.service.ts:18 - AppService - getResouceByResouceId - fileInBuffer:',
      fileInBuffer.length,
    );
  }
}
