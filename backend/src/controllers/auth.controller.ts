import { Body, Controller, HttpCode, Post } from "@nestjs/common";

import { AuthService } from "../services/auth/auth.service";

interface LoginRequestBody {
  username?: string;
  password?: string;
}

interface RefreshRequestBody {
  refreshToken?: string;
}

@Controller("auth")
export class AuthController {
  public constructor(private readonly authService: AuthService) {}

  @Post("login")
  @HttpCode(200)
  public login(@Body() body: LoginRequestBody) {
    return this.authService.login(body.username ?? "", body.password ?? "");
  }

  @Post("refresh")
  @HttpCode(200)
  public refresh(@Body() body: RefreshRequestBody) {
    return this.authService.refresh(body.refreshToken ?? "");
  }

  @Post("logout")
  @HttpCode(204)
  public logout(@Body() body: RefreshRequestBody) {
    this.authService.logout(body.refreshToken ?? "");
  }
}
