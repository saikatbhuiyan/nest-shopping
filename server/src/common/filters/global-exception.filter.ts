// /* eslint-disable @typescript-eslint/no-unsafe-assignment */
// /* eslint-disable @typescript-eslint/no-unsafe-member-access */
// import {
//   ArgumentsHost,
//   Catch,
//   ExceptionFilter,
//   HttpException,
//   Logger,
// } from '@nestjs/common';
// import { RpcException } from '@nestjs/microservices';
// import { ErrorResponse } from '../dto/error-response.dto';

// @Catch()
// export class GlobalExceptionFilter implements ExceptionFilter {
//   private readonly logger = new Logger(GlobalExceptionFilter.name);

//   catch(exception: unknown, host: ArgumentsHost) {
//     const ctx = host.switchToRpc();
//     const correlationId = ctx.getContext()?.correlationId || 'N/A';

//     let response: ErrorResponse;

//     if (exception instanceof RpcException) {
//       const error = exception.getError();
//       response = {
//         errorCode: error['errorCode'] ?? 'RPC_ERROR',
//         message: error['message'] ?? 'RPC Exception occurred',
//         details: error['details'] ?? null,
//         correlationId,
//         timestamp: new Date().toISOString(),
//       };
//     } else if (exception instanceof HttpException) {
//       response = {
//         errorCode: 'HTTP_ERROR',
//         message: exception.message,
//         details: exception.getResponse(),
//         correlationId,
//         timestamp: new Date().toISOString(),
//       };
//     } else {
//       response = {
//         errorCode: 'INTERNAL_ERROR',
//         message: (exception as any)?.message ?? 'Internal server error',
//         details: (exception as any)?.stack ?? null,
//         correlationId,
//         timestamp: new Date().toISOString(),
//       };
//     }

//     this.logger.error(`Error: ${JSON.stringify(response)}`);

//     return response; // Will be serialized and sent to client
//   }
// }
