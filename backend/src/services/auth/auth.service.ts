import crypto from "node:crypto";

import { Injectable, UnauthorizedException } from "@nestjs/common";

import { ConfigService } from "../config.service";

interface AccessTokenPayload {
  sub: string;
  env: "stage" | "prod";
  iat: number;
  exp: number;
}

interface RefreshTokenState {
  username: string;
  expiresAtMs: number;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresInSeconds: number;
}

@Injectable()
export class AuthService {
  private readonly refreshTokens = new Map<string, RefreshTokenState>();

  public constructor(private readonly configService: ConfigService) {}

  public login(username: string, password: string): LoginResult {
    const config = this.configService.getConfig();

    if (username !== config.authUsername || password !== config.authPassword) {
      throw new UnauthorizedException("Invalid username or password");
    }

    return this.issueTokens(username);
  }

  public refresh(refreshToken: string): LoginResult {
    this.clearExpiredRefreshTokens();

    const tokenState = this.refreshTokens.get(refreshToken);

    if (!tokenState || tokenState.expiresAtMs <= Date.now()) {
      this.refreshTokens.delete(refreshToken);
      throw new UnauthorizedException("Refresh token is invalid or expired");
    }

    this.refreshTokens.delete(refreshToken);

    return this.issueTokens(tokenState.username);
  }

  public logout(refreshToken: string): void {
    this.refreshTokens.delete(refreshToken);
  }

  public verifyAccessToken(token: string): AccessTokenPayload {
    const config = this.configService.getConfig();
    const payload = this.verifyJwt(token, config.jwtSecret);

    if (
      !payload ||
      typeof payload.sub !== "string" ||
      (payload.env !== "stage" && payload.env !== "prod") ||
      typeof payload.iat !== "number" ||
      typeof payload.exp !== "number"
    ) {
      throw new UnauthorizedException("Access token payload is invalid");
    }

    return {
      sub: payload.sub,
      env: payload.env,
      iat: payload.iat,
      exp: payload.exp,
    };
  }

  private issueTokens(username: string): LoginResult {
    const config = this.configService.getConfig();
    const issuedAtSeconds = Math.floor(Date.now() / 1000);

    const accessToken = this.signJwt(
      {
        sub: username,
        env: config.appEnv,
        iat: issuedAtSeconds,
        exp: issuedAtSeconds + config.accessTokenTtlSeconds,
      },
      config.jwtSecret,
    );

    const refreshToken = crypto.randomBytes(48).toString("base64url");
    this.refreshTokens.set(refreshToken, {
      username,
      expiresAtMs: Date.now() + config.refreshTokenTtlSeconds * 1000,
    });

    return {
      accessToken,
      refreshToken,
      tokenType: "Bearer",
      expiresInSeconds: config.accessTokenTtlSeconds,
    };
  }

  private signJwt(payload: Record<string, unknown>, secret: string): string {
    const header = { alg: "HS256", typ: "JWT" };
    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));
    const content = `${encodedHeader}.${encodedPayload}`;
    const signature = crypto.createHmac("sha256", secret).update(content).digest("base64url");

    return `${content}.${signature}`;
  }

  private verifyJwt(token: string, secret: string): Record<string, unknown> | null {
    const [encodedHeader, encodedPayload, signature] = token.split(".");

    if (!encodedHeader || !encodedPayload || !signature) {
      throw new UnauthorizedException("Access token format is invalid");
    }

    const content = `${encodedHeader}.${encodedPayload}`;
    const expectedSignature = crypto.createHmac("sha256", secret).update(content).digest("base64url");

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      throw new UnauthorizedException("Access token signature is invalid");
    }

    let payload: Record<string, unknown>;

    try {
      payload = JSON.parse(this.base64UrlDecode(encodedPayload)) as Record<string, unknown>;
    } catch {
      throw new UnauthorizedException("Access token payload is malformed");
    }

    const exp = payload.exp;

    if (typeof exp !== "number" || exp <= Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException("Access token is expired");
    }

    return payload;
  }

  private base64UrlEncode(value: string): string {
    return Buffer.from(value, "utf8").toString("base64url");
  }

  private base64UrlDecode(value: string): string {
    return Buffer.from(value, "base64url").toString("utf8");
  }

  private clearExpiredRefreshTokens(): void {
    const now = Date.now();

    for (const [token, state] of this.refreshTokens.entries()) {
      if (state.expiresAtMs <= now) {
        this.refreshTokens.delete(token);
      }
    }
  }
}
