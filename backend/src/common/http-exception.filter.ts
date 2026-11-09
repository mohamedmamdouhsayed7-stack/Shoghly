import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import type { Response } from "express";
import type { RequestWithContext } from "./request-context";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<RequestWithContext>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const responseBody =
      exception instanceof HttpException ? exception.getResponse() : null;
    const message =
      typeof responseBody === "object" &&
      responseBody !== null &&
      "message" in responseBody
        ? (responseBody as { message: string | string[] }).message
        : status >= 500
          ? "A server error occurred."
          : typeof responseBody === "string"
            ? responseBody
            : "Request failed.";
    response.status(status).json({
      statusCode: status,
      code:
        exception instanceof HttpException ? exception.name : "INTERNAL_ERROR",
      message,
      requestId: request.requestId,
    });
  }
}
