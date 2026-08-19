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

function createUnavailableRoute(tripId: string): TripRouteSummary {
  return {
    tripId,
    mode: "unavailable",
    totalPoints: 0,
    returnedPoints: 0,
    points: [],
  };
}

export async function getTripRoutePreview(tripId: string, maxPoints = 50): Promise<TripRouteSummary> {
  if (tripId === SIMULATED_TRIP_ID) {
    return createDemoRoute();
  }

  void maxPoints;
  return createUnavailableRoute(tripId);
}
