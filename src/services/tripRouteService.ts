import type { ApiResponse } from "../types/auth";
import { api, unwrap } from "./api";
import { SIMULATED_TRIP_ID } from "./incidentService";

export interface TripRoutePoint {
  id: string;
  clientRoutePointId: string;
  sequence: number;
  recordedAtUtc: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  speedMetersPerSecond: number | null;
  bearingDegrees: number | null;
}

export interface TripRouteSummary {
  tripId: string;
  mode: string;
  totalPoints: number;
  returnedPoints: number;
  points: TripRoutePoint[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function readNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readPoint(value: unknown): TripRoutePoint | null {
  if (!isRecord(value)) {
    return null;
  }

  const latitude = readNumber(value.latitude, Number.NaN);
  const longitude = readNumber(value.longitude, Number.NaN);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    id: readString(value.id, readString(value.clientRoutePointId, "route-point")),
    clientRoutePointId: readString(value.clientRoutePointId),
    sequence: readNumber(value.sequence),
    recordedAtUtc: readString(value.recordedAtUtc, new Date().toISOString()),
    latitude,
    longitude,
    accuracyMeters: readNumber(value.accuracyMeters),
    speedMetersPerSecond: readNullableNumber(value.speedMetersPerSecond),
    bearingDegrees: readNullableNumber(value.bearingDegrees),
  };
}

function readRoute(value: unknown, tripId: string): TripRouteSummary {
  const source = isRecord(value) ? value : {};
  const points = Array.isArray(source.points) ? source.points.map(readPoint).filter((item): item is TripRoutePoint => Boolean(item)) : [];

  return {
    tripId: readString(source.tripId, tripId),
    mode: readString(source.mode, "preview"),
    totalPoints: readNumber(source.totalPoints, points.length),
    returnedPoints: readNumber(source.returnedPoints, points.length),
    points,
  };
}

function createDemoRoute(): TripRouteSummary {
  const baseTime = Date.now() - 14 * 60 * 1000;
  const coordinates = [
    [20.0839, -98.7704],
    [20.0861, -98.7685],
    [20.0882, -98.7662],
    [20.0901, -98.7641],
    [20.0911, -98.7624],
  ] as const;

  const points = coordinates.map(([latitude, longitude], index) => ({
    id: `demo-route-point-${index + 1}`,
    clientRoutePointId: `demo-client-route-point-${index + 1}`,
    sequence: index + 1,
    recordedAtUtc: new Date(baseTime + index * 90 * 1000).toISOString(),
    latitude,
    longitude,
    accuracyMeters: index === coordinates.length - 1 ? 8 : 12,
    speedMetersPerSecond: index === coordinates.length - 1 ? 0 : 8.4,
    bearingDegrees: 68,
  }));

  return {
    tripId: SIMULATED_TRIP_ID,
    mode: "preview",
    totalPoints: points.length,
    returnedPoints: points.length,
    points,
  };
}

export async function getTripRoutePreview(tripId: string, maxPoints = 50): Promise<TripRouteSummary> {
  if (tripId === SIMULATED_TRIP_ID) {
    return createDemoRoute();
  }

  const response = await api.get<ApiResponse<unknown>>(`/api/v1/trips/${encodeURIComponent(tripId)}/route`, {
    params: { mode: "preview", maxPoints },
  });
  return readRoute(unwrap<unknown>(response), tripId);
}
