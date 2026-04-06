import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { config } from "dotenv";
import { existsSync, readFileSync } from "fs";
import { basename, extname, isAbsolute, resolve } from "path";

config({ path: resolve(__dirname, "../.env") });

const region = process.env.AWS_REGION;
const from = "some_sender@dark.dedyn.io";
const to = process.env.RECEIPT_EMAIL;

if (!region || !from || !to) {
  console.error("Missing required env vars: AWS_REGION, SES_FROM_EMAIL, RECEIPT_EMAIL");
  process.exit(1);
}

const subject = process.argv[2] ?? "Test email from CLI";
const body = process.argv[3] ?? `Sent at ${new Date().toISOString()}`;
const attachmentPaths = process.argv
  .slice(4)
  .flatMap((value) => value.split(","))
  .map((value) => value.trim())
  .filter(Boolean);

function inferContentType(fileName: string): string {
  const extension = extname(fileName).toLowerCase();

  switch (extension) {
    case ".csv":
      return "text/csv";
    case ".json":
      return "application/json";
    case ".pdf":
      return "application/pdf";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case ".xls":
      return "application/vnd.ms-excel";
    case ".txt":
      return "text/plain";
    default:
      return "application/octet-stream";
  }
}

function toMimeBase64(input: Buffer): string {
  const base64 = input.toString("base64");
  return base64.match(/.{1,76}/g)?.join("\r\n") ?? "";
}

function resolveAttachmentPath(inputPath: string): string {
  const repoRoot = resolve(__dirname, "..");
  const initCwd = process.env.INIT_CWD;
  const candidates = isAbsolute(inputPath)
    ? [inputPath]
    : [
        resolve(process.cwd(), inputPath),
        initCwd ? resolve(initCwd, inputPath) : "",
        resolve(repoRoot, inputPath),
      ].filter(Boolean);

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `Attachment file not found: ${inputPath}. Tried: ${candidates.join(", ")}`,
  );
}

function buildRawMimeEmail(): Buffer {
  const boundary = `mixed-boundary-${Date.now().toString(16)}`;
  const sanitizedSubject = subject.replace(/[\r\n]+/g, " ");

  const lines: string[] = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${sanitizedSubject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary=\"${boundary}\"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: 7bit",
    "",
    body,
    "",
  ];

  for (const attachmentPath of attachmentPaths) {
    const resolvedAttachmentPath = resolveAttachmentPath(attachmentPath);
    const fileContents = readFileSync(resolvedAttachmentPath);
    const fileName = basename(resolvedAttachmentPath);
    const contentType = inferContentType(fileName);

    lines.push(`--${boundary}`);
    lines.push(`Content-Type: ${contentType}; name=\"${fileName}\"`);
    lines.push("Content-Transfer-Encoding: base64");
    lines.push(`Content-Disposition: attachment; filename=\"${fileName}\"`);
    lines.push("");
    lines.push(toMimeBase64(fileContents));
    lines.push("");
  }

  lines.push(`--${boundary}--`);
  lines.push("");

  return Buffer.from(lines.join("\r\n"), "utf-8");
}

async function main(): Promise<void> {
  const client = new SESv2Client({ region });

  const command =
    attachmentPaths.length > 0
      ? new SendEmailCommand({
          Content: {
            Raw: {
              Data: buildRawMimeEmail(),
            },
          },
        })
      : new SendEmailCommand({
          FromEmailAddress: from,
          Destination: { ToAddresses: [to] },
          Content: {
            Simple: {
              Subject: { Data: subject },
              Body: { Text: { Data: body } },
            },
          },
        });

  const rawData = command.input.Content?.Raw?.Data;
  const commandInputForLog =
    rawData && typeof rawData !== "string"
      ? {
          ...command.input,
          Content: {
            ...(command.input.Content ?? {}),
            Raw: {
              ...(command.input.Content?.Raw ?? {}),
              Data: `<Buffer length: ${rawData.byteLength}>`,
            },
          },
        }
      : command.input;

  console.log("Sending email:", JSON.stringify(commandInputForLog, null, 2));

  const result = await client.send(command);

  console.log(`Email sent to ${to}`);
  console.log(`MessageId: ${result.MessageId}`);
}

void main();
