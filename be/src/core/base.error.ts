import { HttpStatus } from '@nestjs/common';

export type BaseErrorInitOptions = {
  code?: string;
  message?: string;
  statusCode?: number;
};

export class BaseError extends Error {
  statusCode: number;
  code: string;

  constructor(options?: BaseErrorInitOptions) {
    super(options?.message ?? 'Error');
    this.code = options?.code ?? 'ERROR';
    this.statusCode = options?.statusCode ?? HttpStatus.INTERNAL_SERVER_ERROR;
  }

  toJSON() {
    return {
      statusCode: this.statusCode,
      code: this.code,
      message: this.message,
    };
  }
}

export function isBaseError(error: unknown) {
  return error instanceof BaseError;
}
