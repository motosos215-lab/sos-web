import type { AxiosResponseHeaders, RawAxiosResponseHeaders } from "axios";
import type { ApiResponse } from "../types/auth";
import { api, unwrap } from "./api";
import { SIMULATED_INCIDENT_FOLIO } from "./incidentService";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf", "text/plain"]);
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "pdf", "txt"]);
const DEMO_MONITOR_INCIDENT_ID = "DEMO-MONITOR-INCIDENT-001";

export type EvidenceActorRole = "rider" | "monitor" | "admin";

export interface EvidenceAttachment {
  id: string;
  incidentId: string | null;
  alertDispatchId: string | null;
  emergencyResolutionReportId: string | null;
  tripId: string | null;
  registeredByRole: string;
  evidenceType: string;
  source: string;
  status: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  sha256Hash: string | null;
  description: string | null;
  capturedAtUtc: string;
  registeredAtUtc: string;
}

export interface EvidenceUploadResult {
  evidenceAttachment: EvidenceAttachment;
  isDuplicate: boolean;
}

export interface EvidenceDownload {
  blob: Blob;
  fileName: string;
  contentType: string;
}

export interface UploadEvidenceInput {
  role: Extract<EvidenceActorRole, "rider" | "monitor">;
  incidentId: string;
  file: File;
  description?: string;
  evidenceType?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function readNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readBoolean(value: unknown): boolean {
  return typeof value === "boolean" ? value : false;
}

function readEvidence(value: unknown): EvidenceAttachment | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readString(value.id);

  if (!id) {
    return null;
  }

  return {
    id,
    incidentId: readNullableString(value.incidentId),
    alertDispatchId: readNullableString(value.alertDispatchId),
    emergencyResolutionReportId: readNullableString(value.emergencyResolutionReportId),
    tripId: readNullableString(value.tripId),
    registeredByRole: readString(value.registeredByRole, "Unknown"),
    evidenceType: readString(value.evidenceType, "Photo"),
    source: readString(value.source, "Web"),
    status: readString(value.status, "Registered"),
    fileName: readString(value.fileName, "evidence"),
    contentType: readString(value.contentType, "application/octet-stream"),
    sizeBytes: readNumber(value.sizeBytes),
    sha256Hash: readNullableString(value.sha256Hash),
    description: readNullableString(value.description),
    capturedAtUtc: readString(value.capturedAtUtc, new Date().toISOString()),
    registeredAtUtc: readString(value.registeredAtUtc, new Date().toISOString()),
  };
}

function readEvidenceList(value: unknown): EvidenceAttachment[] {
  const list = isRecord(value) && Array.isArray(value.evidenceAttachments) ? value.evidenceAttachments : Array.isArray(value) ? value : [];

  return list.map(readEvidence).filter((item): item is EvidenceAttachment => Boolean(item));
}

function assertSafeUploadFile(file: File) {
  const extension = file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase() : "";

  if (!extension || !ALLOWED_EXTENSIONS.has(extension)) {
    throw new Error("El archivo debe ser JPG, PNG, WEBP, PDF o TXT.");
  }

  if (!ALLOWED_CONTENT_TYPES.has(file.type)) {
    throw new Error("El tipo de archivo no está permitido.");
  }

  if (file.size <= 0) {
    throw new Error("El archivo está vacío.");
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("El archivo supera el límite de 10 MB.");
  }
}

function makeEvidenceBasePath(role: EvidenceActorRole): string {
  return `/api/v1/${role}/evidence-attachments`;
}

function headerValue(headers: RawAxiosResponseHeaders | AxiosResponseHeaders, name: string): string {
  const value = headers[name] ?? headers[name.toLowerCase()];
  return typeof value === "string" ? value : Array.isArray(value) ? value.join(",") : "";
}

function readDownloadFileName(headers: RawAxiosResponseHeaders | AxiosResponseHeaders, fallback: string): string {
  const disposition = headerValue(headers, "content-disposition");
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  const decoded = (() => {
    try {
      return match?.[1] ? decodeURIComponent(match[1]) : "";
    } catch {
      return "";
    }
  })();

  return decoded.replace(/[\\/]/g, "").trim() || fallback;
}

function isDemoIncident(incidentId: string): boolean {
  return incidentId === SIMULATED_INCIDENT_FOLIO || incidentId === DEMO_MONITOR_INCIDENT_ID;
}

function createDemoEvidence(incidentId = SIMULATED_INCIDENT_FOLIO): EvidenceAttachment[] {
  const now = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  return [
    {
      id: incidentId === SIMULATED_INCIDENT_FOLIO ? "demo-evidence-photo" : "demo-monitor-evidence-note",
      incidentId,
      alertDispatchId: incidentId === SIMULATED_INCIDENT_FOLIO ? null : "DEMO-MONITOR-DISPATCH-001",
      emergencyResolutionReportId: null,
      tripId: incidentId === SIMULATED_INCIDENT_FOLIO ? "demo-trip" : "demo-monitor-trip",
      registeredByRole: incidentId === SIMULATED_INCIDENT_FOLIO ? "Rider" : "Monitor",
      evidenceType: incidentId === SIMULATED_INCIDENT_FOLIO ? "Photo" : "Text",
      source: "MotoSOS Demo",
      status: "Uploaded",
      fileName: incidentId === SIMULATED_INCIDENT_FOLIO ? "foto-incidente-demo.txt" : "nota-monitor-demo.txt",
      contentType: "text/plain",
      sizeBytes: 196,
      sha256Hash: null,
      description: "Evidencia de demostración generada localmente para validar el flujo web.",
      capturedAtUtc: now,
      registeredAtUtc: now,
    },
  ];
}

function createDemoUpload(input: UploadEvidenceInput): EvidenceUploadResult {
  const now = new Date().toISOString();
  const evidenceAttachment: EvidenceAttachment = {
    id: `demo-upload-${crypto.randomUUID()}`,
    incidentId: input.incidentId,
    alertDispatchId: input.role === "monitor" ? "DEMO-MONITOR-DISPATCH-001" : null,
    emergencyResolutionReportId: null,
    tripId: input.incidentId === SIMULATED_INCIDENT_FOLIO ? "demo-trip" : "demo-monitor-trip",
    registeredByRole: input.role === "monitor" ? "Monitor" : "Rider",
    evidenceType: input.evidenceType ?? "Photo",
    source: "MotoSOS Web Demo",
    status: "Uploaded",
    fileName: input.file.name,
    contentType: input.file.type,
    sizeBytes: input.file.size,
    sha256Hash: null,
    description: input.description?.trim() || "Archivo demo validado localmente.",
    capturedAtUtc: now,
    registeredAtUtc: now,
  };

  return { evidenceAttachment, isDuplicate: false };
}

function createDemoDownload(evidenceId: string, fallbackFileName: string): EvidenceDownload {
  const body = [
    "MotoSOS demo evidence",
    `Evidence ID: ${evidenceId}`,
    "Este archivo fue generado localmente para validar descarga segura desde la web.",
  ].join("\n");

  return {
    blob: new Blob([body], { type: "text/plain" }),
    fileName: fallbackFileName.endsWith(".txt") ? fallbackFileName : `${fallbackFileName}.txt`,
    contentType: "text/plain",
  };
}

export async function listRiderEvidenceByIncident(incidentId: string): Promise<EvidenceAttachment[]> {
  if (isDemoIncident(incidentId)) {
    return createDemoEvidence(incidentId);
  }

  const response = await api.get<ApiResponse<unknown>>(makeEvidenceBasePath("rider"), {
    params: { incidentId, pageNumber: 1, pageSize: 100 },
  });
  return readEvidenceList(unwrap<unknown>(response));
}

export async function uploadEvidence({
  description,
  evidenceType = "Photo",
  file,
  incidentId,
  role,
}: UploadEvidenceInput): Promise<EvidenceUploadResult> {
  assertSafeUploadFile(file);

  if (isDemoIncident(incidentId)) {
    return createDemoUpload({ description, evidenceType, file, incidentId, role });
  }

  const form = new FormData();
  form.append("file", file);
  form.append("incidentId", incidentId);
  form.append("evidenceType", evidenceType);
  form.append("clientEvidenceId", crypto.randomUUID());

  if (description?.trim()) {
    form.append("description", description.trim().slice(0, 1000));
  }

  const response = await api.post<ApiResponse<unknown>>(`${makeEvidenceBasePath(role)}/upload`, form);
  const data = unwrap<unknown>(response);
  const source = isRecord(data) ? data : {};
  const evidence = readEvidence(source.evidenceAttachment);

  if (!evidence) {
    throw new Error("No pudimos leer la evidencia devuelta por MotoSOS.");
  }

  return { evidenceAttachment: evidence, isDuplicate: readBoolean(source.isDuplicate) };
}

export async function downloadEvidence(
  role: EvidenceActorRole,
  evidenceId: string,
  fallbackFileName = "evidence",
): Promise<EvidenceDownload> {
  if (evidenceId.startsWith("demo-")) {
    return createDemoDownload(evidenceId, fallbackFileName);
  }

  const response = await api.get<Blob>(`${makeEvidenceBasePath(role)}/${encodeURIComponent(evidenceId)}/download`, {
    responseType: "blob",
  });
  const contentType = headerValue(response.headers, "content-type") || response.data.type || "application/octet-stream";
  return {
    blob: response.data,
    fileName: readDownloadFileName(response.headers, fallbackFileName),
    contentType,
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
