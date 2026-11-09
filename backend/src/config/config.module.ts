import { Global, Module } from "@nestjs/common";
import { parseEnvironment } from "./environment";

@Global()
@Module({
  providers: [
    {
      provide: "BACKEND_ENV",
      useFactory: () => parseEnvironment(process.env),
    },
  ],
  exports: ["BACKEND_ENV"],
})
export class BackendConfigModule {}
