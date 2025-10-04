import {
  Controller,
  Get,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('/upload')
  @UseInterceptors(FilesInterceptor('files'))
  postUpload(@UploadedFiles() files: Express.Multer.File[]) {
    return { files };
  }

  @Get('/resouce/:resouceId/info')
  getResouceInfoByResouceId(
    @Param('resouceId') resouceId: string,
    @Res() res: Response,
  ) {
    return res.json({ ok: true });
  }

  @Get('/resouce/:resouceId/stream')
  getStreamByResouceId(
    @Param('resouceId') resouceId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const filePath = `temp/files-uploaded/${resouceId}`;
    if (!existsSync(filePath)) {
      throw new NotFoundException(
        `Your resouce '${resouceId}' does not exists.`,
      );
    }

    const { size: fileSize } = statSync(filePath);
    const range = req.headers.range;
    console.log(
      '[LOG] - app.controller.ts:57 - AppController - getStreamByResouceId - range:',
      range,
    );

    res.setHeader('Accept-Ranges', 'bytes'); // server should tell browser

    if (!range) {
      res.setHeader('Content-Length', fileSize);
      const stream = createReadStream(filePath);
      stream.pipe(res);
      return;
    }

    const matches = /^bytes=(\d*)-(\d*)$/.exec(range);
    console.log(
      '[LOG] - app.controller.ts:69 - AppController - getStreamByResouceId - matches:',
      matches,
    );
    if (!matches) {
      res
        .status(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE)
        .setHeader('Content-Range', `bytes */${fileSize}`);
      res.end();
      return;
    }

    const start = matches[1] ? parseInt(matches[1], 10) : 0;
    const end = matches[2] ? parseInt(matches[2], 10) : fileSize - 1;

    if (isNaN(start) || isNaN(end)) {
      res
        .status(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE)
        .setHeader('Content-Range', `bytes */${fileSize}`);
      res.end();
      return;
    }

    if (start >= fileSize || end >= fileSize || start > end) {
      res
        .status(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE)
        .setHeader('Content-Range', `bytes */${fileSize}`);
      res.end();
      return;
    }

    const chunkSize = end - start + 1;
    res.status(HttpStatus.PARTIAL_CONTENT);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
    res.setHeader('Content-Length', chunkSize);

    const stream = createReadStream(filePath, { start, end });
    stream.pipe(res);
  }
}
