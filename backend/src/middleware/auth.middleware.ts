import { Injectable, NestMiddleware, UnauthorizedException } from "@nestjs/common";

import { AuthService } from "../services/auth/auth.service";

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  public constructor(private readonly authService: AuthService) {}

  public use(request: { headers: Record<string, string | string[] | undefined> }, _response: unknown, next: () => void): void {
    const authorization = request.headers.authorization;

    if (Array.isArray(authorization)) {
      throw new UnauthorizedException("Authorization header must be a single value");
    }

    if (!authorization) {
      throw new UnauthorizedException("Missing Authorization header");
    }

    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
      throw new UnauthorizedException("Authorization header must be Bearer token");
    }

    this.authService.verifyAccessToken(token);
    next();
  }
}
