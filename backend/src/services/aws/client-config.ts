import { fromIni } from "@aws-sdk/credential-providers";

export function createAwsClientConfig(region: string): {
  region: string;
  credentials?: ReturnType<typeof fromIni>;
} {
  const profile = process.env.AWS_PROFILE || process.env.AWS_DEFAULT_PROFILE;

  if (!profile) {
    return { region };
  }

  return {
    region,
    credentials: fromIni({ profile }),
  };
}

export function describeAwsCredentialSource(): string {
  const profile = process.env.AWS_PROFILE || process.env.AWS_DEFAULT_PROFILE;

  if (profile) {
    return `AWS profile ${profile}`;
  }

  if (process.env.AWS_SESSION_TOKEN) {
    return "environment session credentials";
  }

  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    return "environment access key credentials";
  }

  return "default AWS provider chain";
}