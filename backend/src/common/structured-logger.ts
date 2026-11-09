import type { LoggerService } from "@nestjs/common";

type LogLevel = "info" | "warn" | "error" | "debug" | "verbose" | "fatal";

export class StructuredLogger implements LoggerService {
  log(message: unknown, context?: string) {
    this.write("info", message, context);
  }
  warn(message: unknown, context?: string) {
    this.write("warn", message, context);
  }
  error(message: unknown, stack?: string, context?: string) {
    this.write("error", message, context, stack);
  }
  debug(message: unknown, context?: string) {
    this.write("debug", message, context);
  }
  verbose(message: unknown, context?: string) {
    this.write("verbose", message, context);
  }
  fatal(message: unknown, context?: string) {
    this.write("fatal", message, context);
  }

  private write(
    level: LogLevel,
    message: unknown,
    context?: string,
    stack?: string,
  ) {
    const record = {
      timestamp: new Date().toISOString(),
      level,
      context: context ?? "ShoghlyApi",
      message: typeof message === "string" ? message : "structured_event",
      ...(typeof message === "object" && message !== null
        ? { data: message }
        : {}),
      ...(stack ? { stack } : {}),
    };
    const line = `${JSON.stringify(record)}\n`;
    if (level === "error" || level === "fatal") process.stderr.write(line);
    else process.stdout.write(line);
  }
}
