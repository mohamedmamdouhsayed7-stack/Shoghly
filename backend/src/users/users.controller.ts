import { Controller, Get, Req } from "@nestjs/common";
import type { RequestWithContext } from "../common/request-context";

@Controller("me")
export class UsersController {
  @Get()
  currentUser(@Req() request: RequestWithContext) {
    return { id: request.user!.id, email: request.user!.email ?? null };
  }
}
