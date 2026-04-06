import fs from "node:fs/promises";
import path from "node:path";

import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Injectable } from "@nestjs/common";

import { ConfigService } from "../config.service";
import { createAwsClientConfig } from "./client-config";

function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

@Injectable()
export class S3Service {
  private readonly client: S3Client | null;

  private readonly bucket?: string;

  private readonly uploadsDir: string;

  private readonly appEnv: string;

  public constructor(configService: ConfigService) {
    const config = configService.getConfig();
    this.bucket = config.rawEmailBucket;
    this.uploadsDir = config.uploadsDir;
    this.appEnv = config.appEnv;
    this.client = this.bucket ? new S3Client(createAwsClientConfig(config.awsRegion)) : null;
  }

  public isConfigured(): boolean {
    return Boolean(this.client && this.bucket);
  }

  public async getRawEmail(key: string): Promise<Buffer> {
    if (!this.client || !this.bucket) {
      throw new Error("S3 is not configured");
    }

    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );

    if (!response.Body) {
      throw new Error(`Empty S3 body for key ${key}`);
    }

    return streamToBuffer(response.Body as NodeJS.ReadableStream);
  }

  public async saveSupplierFile(filename: string, content: Buffer): Promise<{ storedAt: "s3" | "local"; key: string }> {
    const safeName = filename.replace(/[^a-zA-Z0-9._-]+/g, "-");
    const key = `supplier-files/${this.appEnv}/${Date.now()}-${safeName}`;

    if (this.client && this.bucket) {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: content,
          ContentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
      );

      return { storedAt: "s3", key };
    }

    await fs.mkdir(this.uploadsDir, { recursive: true });
    const targetPath = path.join(this.uploadsDir, `${Date.now()}-${safeName}`);
    await fs.writeFile(targetPath, content);
    return { storedAt: "local", key: targetPath };
  }
}
