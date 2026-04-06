import { Injectable } from "@nestjs/common";
import * as XLSX from "xlsx";

import { ConfigService } from "../../config.service";
import { OpenRouterService } from "../../openrouter/openrouter.service";
import type { SupplierDetectionResult } from "../../../types";
import { normalizeHeader } from "./normalize-headers";

const requiredFields = ["Brand", "Model Code", "Color", "Size", "RRP"] as const;

const deterministicAliases: Record<(typeof requiredFields)[number], string[]> = {
  Brand: ["brand", "brand name", "supplier", "vendor", "label"],
  "Model Code": ["model code", "model", "sku", "article style", "article number", "article", "style code"],
  Color: ["color", "colour", "article color text", "color name"],
  Size: ["size", "article size", "eu size", "size label"],
  RRP: ["rrp", "price retail", "retail price", "recommended retail price", "price"],
};

@Injectable()
export class SupplierDetectionService {
  public constructor(
    private readonly configService: ConfigService,
    private readonly openRouterService: OpenRouterService,
  ) {}

  public async detect(filename: string, content: Buffer): Promise<SupplierDetectionResult> {
    if (!filename.toLowerCase().endsWith(".xlsx")) {
      return { isSupplierFile: false, notes: ["Attachment is not an .xlsx file"] };
    }

    const workbook = XLSX.read(content, { type: "buffer" });

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const matrix = this.normalizeMatrix(XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false }));

      console.log(matrix);
      const [headerRow, ...dataRows] = matrix;

      if (!headerRow || headerRow.length === 0) {
        continue;
      }

      const headers = headerRow.map((cell) => String(cell ?? "").trim()).filter(Boolean);
      const deterministicMapping = this.mapHeadersDeterministically(headers);
      const mapping = deterministicMapping ?? (await this.mapHeadersWithAi(headers));

      if (!mapping) {
        continue;
      }

      const rows = dataRows
        .map((row) => {
          const record: Record<string, unknown> = {};
          headerRow.forEach((header, index) => {
            record[String(header ?? "")] = row[index];
          });
          return record;
        })
        .filter((row) => Object.values(row).some((value) => String(value ?? "").trim() !== ""));

      if (!this.hasValidRows(rows, mapping)) {
        continue;
      }

      const previewRows = rows.slice(0, 5).map((row) => ({
        Brand: row[mapping.Brand] ? String(row[mapping.Brand]) : null,
        "Model Code": row[mapping["Model Code"]] ? String(row[mapping["Model Code"]]) : null,
        Color: row[mapping.Color] ? String(row[mapping.Color]) : null,
        Size: row[mapping.Size] ? String(row[mapping.Size]) : null,
        RRP: row[mapping.RRP] ? Number(row[mapping.RRP]) : null,
      }));

      return {
        isSupplierFile: true,
        filename,
        storedBuffer: content,
        matchingSheet: sheetName,
        columnMapping: mapping,
        rowCount: rows.length,
        previewRows,
        notes: deterministicMapping ? ["Matched with deterministic aliases"] : ["Matched with OpenRouter fallback"],
      };
    }

    return { isSupplierFile: false, notes: ["No sheet matched the supplier file shape"] };
  }

  private mapHeadersDeterministically(headers: string[]): Record<string, string> | null {
    const mapping: Record<string, string> = {};

    for (const field of requiredFields) {
      const match = headers.find((header) => deterministicAliases[field].includes(normalizeHeader(header)));
      if (!match) {
        return null;
      }
      mapping[field] = match;
    }

    return mapping;
  }

  private async mapHeadersWithAi(headers: string[]): Promise<Record<string, string> | null> {
    const config = this.configService.getConfig();

    const content = await this.openRouterService.chatRaw({
      model: config.openRouterModel,
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            'Map incoming sheet headers to required supplier fields and return JSON only with keys Brand, Model Code, Color, Size, RRP.',
        },
        {
          role: "user",
          content: `Required fields: ${requiredFields.join(", ")}\nHeaders: ${JSON.stringify(headers)}`,
        },
      ],
    });

    if (!content) {
      return null;
    }

    try {
      const objectMatch = content.match(/\{[\s\S]*\}/);

      if (!objectMatch) {
        return null;
      }

      const parsed = JSON.parse(objectMatch[0]) as Record<string, string>;
      const hasAllFields = requiredFields.every((field) => typeof parsed[field] === "string" && parsed[field].length > 0);
      return hasAllFields ? parsed : null;
    } catch {
      return null;
    }
  }

  private normalizeMatrix(matrix: unknown[][]): unknown[][] {
    // Trim all cells
    const trimmed = matrix.map((row) =>
      row.map((cell) => (typeof cell === "string" ? cell.trim() : cell)),
    );

    // Remove empty columns (all cells empty across all rows)
    const colCount = Math.max(0, ...trimmed.map((r) => r.length));
    const nonEmptyColIndices = Array.from({ length: colCount }, (_, i) => i).filter((i) =>
      trimmed.some((row) => row[i] !== undefined && row[i] !== null && String(row[i] ?? "").trim() !== ""),
    );

    // Remove empty rows and keep only non-empty columns
    return trimmed
      .map((row) => nonEmptyColIndices.map((i) => row[i] ?? null))
      .filter((row) => row.some((cell) => cell !== null && String(cell ?? "").trim() !== ""));
  }

  private hasValidRows(rows: Array<Record<string, unknown>>, mapping: Record<string, string>): boolean {
    const rrpHeader = mapping.RRP;

    return rows.some((row) => {
      const hasAnyValue = Object.values(mapping).some((header) => {
        const value = row[header];
        return value !== undefined && value !== null && String(value).trim() !== "";
      });
      const parsedRrp = Number(row[rrpHeader]);
      return hasAnyValue && Number.isFinite(parsedRrp);
    });
  }
}
