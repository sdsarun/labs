import { isBaseError } from 'src/core/base.error';

export abstract class Usecase<Param = any, Result = any> {
  abstract execute(...args: Param[]): Promise<Result>;
}

export type UsecaseResult<TResult> =
  | { success: true; data: TResult }
  | {
      success: false;
      error: { message: string; code: string; statusCode: number };
    };

export async function executeUsecase<TParams, TResult>(
  usecase: { execute: (params: TParams) => Promise<TResult> },
  params: TParams,
): Promise<UsecaseResult<TResult>> {
  try {
    const data = await usecase.execute(params);
    return { success: true, data };
  } catch (error) {
    console.error(error);
    if (isBaseError(error)) {
      return {
        success: false,
        error: {
          message: error.message,
          code: error.code,
          statusCode: error.statusCode ?? 500,
        },
      };
    }

    return {
      success: false,
      error: {
        code: 'INTERNAL_SERVICE_ERROR',
        message: 'Internal server error',
        statusCode: 500,
      },
    };
  }
}
