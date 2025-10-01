/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { type Response } from 'express';
import { executeUsecase } from 'src/core/usecase.abstract';
import { GetFileListByUserIdUsecase } from 'src/file/usecase/get-file-list-by-user-id.usecase';
import { GetPreviewFileByFileIdUsecase } from 'src/file/usecase/get-preview-file-by-file-id.usecase';
import { RequestPresignedUrlUsecase } from 'src/file/usecase/request-presigned-url.usecase';
import { StreamFileByFileIdUsecase } from 'src/file/usecase/stream-file-by-file-id.usecase';
import { UploadFileUsecase } from 'src/file/usecase/upload-file.usecase';

@Controller('files')
export class FileController {
  constructor(
    private readonly uploadFileUsecase: UploadFileUsecase,
    private readonly requestPresignedUrlUsecase: RequestPresignedUrlUsecase,
    private readonly streamFileByFileIdUsecase: StreamFileByFileIdUsecase,
    private readonly getFileListByUserIdUsecase: GetFileListByUserIdUsecase,
    private readonly getPreviewFileByFileIdUsecase: GetPreviewFileByFileIdUsecase,
  ) {}

  @Get('/file-list/:userId')
  async getFileListByUserId(
    @Param('userId') userId: string,
    @Query() query: any,
    @Res() res: Response,
  ) {
    const result = await executeUsecase(this.getFileListByUserIdUsecase, {
      userId,
      query,
    });

    if (result.success) {
      return res.status(HttpStatus.CREATED).json(result.data);
    } else {
      return res.status(result.error.statusCode).json(result.error);
    }
  }

  @Post('/upload')
  async postUploadFile(@Body() body: any, @Res() res: Response) {
    const result = await executeUsecase(this.uploadFileUsecase, body);
    if (result.success) {
      return res.status(HttpStatus.CREATED).json(result.data);
    } else {
      return res.status(result.error.statusCode).json(result.error);
    }
  }

  @Get('/stream/:fileId')
  async getStreamFileByFileId(
    @Param('fileId') fileId: string,
    @Res() res: Response,
  ) {
    const { stream } = await this.streamFileByFileIdUsecase.execute({ fileId });
    return res.pipe(stream as any);
  }

  @Get('/download/:fileId')
  async getDownloadFileByFileId() {}

  @Get('/preview/:fileId')
  async getPreviewFileByFileId(
    @Param('fileId') fileId: string,
    @Res() res: Response,
  ) {
    const result = await executeUsecase(this.getPreviewFileByFileIdUsecase, {
      fileId,
    });
    if (result.success) {
      return res.status(HttpStatus.OK).json(result.data);
    } else {
      return res.status(result.error.statusCode).json(result.error);
    }
  }
}
