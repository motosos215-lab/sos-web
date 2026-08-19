import { describe, expect, it } from "vitest";
import { listRiderEvidenceByIncident, downloadEvidence, formatFileSize } from "./evidenceService";
import { getRiderEmergencyStatus, DEMO_MONITOR_ALERT_ID } from "./emergencyStatusService";
import { acknowledgeMonitorAlert, createDemoMonitorDashboardAlert, getMonitorAlert } from "./monitorAlertService";
import { SIMULATED_INCIDENT_FOLIO, SIMULATED_TRIP_ID } from "./incidentService";
import { getTripRoutePreview } from "./tripRouteService";

describe("demo integrations", () => {
  it("returns a demo trip route without calling the backend", async () => {
    const route = await getTripRoutePreview(SIMULATED_TRIP_ID);

    expect(route.tripId).toBe(SIMULATED_TRIP_ID);
    expect(route.returnedPoints).toBeGreaterThan(1);
    expect(route.points[0].sequence).toBe(1);
  });

  it("returns unavailable route metadata for real trips while the backend has no route endpoint", async () => {
    const route = await getTripRoutePreview("real-trip-id");

    expect(route.tripId).toBe("real-trip-id");
    expect(route.mode).toBe("unavailable");
    expect(route.points).toHaveLength(0);
  });

  it("returns downloadable demo evidence for the simulated incident", async () => {
    const evidence = await listRiderEvidenceByIncident(SIMULATED_INCIDENT_FOLIO);
    const download = await downloadEvidence("rider", evidence[0].id, evidence[0].fileName);

    expect(evidence).toHaveLength(1);
    expect(download.fileName).toContain(".txt");
    expect(download.contentType).toBe("text/plain");
  });

  it("returns metadata downloads for backend evidence records", async () => {
    const download = await downloadEvidence("rider", "evidence-id", "photo.jpg", {
      id: "evidence-id",
      incidentId: "incident-id",
      alertDispatchId: null,
      emergencyResolutionReportId: null,
      tripId: "trip-id",
      registeredByRole: "Rider",
      evidenceType: "Photo",
      source: "RiderMobileApp",
      status: "Registered",
      fileName: "photo.jpg",
      contentType: "image/jpeg",
      sizeBytes: 1234,
      sha256Hash: null,
      description: null,
      capturedAtUtc: new Date().toISOString(),
      registeredAtUtc: new Date().toISOString(),
    });

    expect(download.fileName).toBe("photo.jpg.metadata.json");
    expect(download.contentType).toBe("application/json");
  });

  it("formats file sizes safely", () => {
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(1536)).toBe("1.5 KB");
  });

  it("supports local monitor demo actions", async () => {
    const dashboardAlert = createDemoMonitorDashboardAlert();
    const acknowledged = await acknowledgeMonitorAlert(DEMO_MONITOR_ALERT_ID, "Voy en camino");
    const loaded = await getMonitorAlert(DEMO_MONITOR_ALERT_ID);

    expect(dashboardAlert.notificationDeliveryAttemptId).toBe(DEMO_MONITOR_ALERT_ID);
    expect(acknowledged.status).toBe("Acknowledged");
    expect(loaded.responseType).toBe("CanAssist");
  });

  it("returns demo emergency status", async () => {
    const status = await getRiderEmergencyStatus(SIMULATED_INCIDENT_FOLIO);

    expect(status.incident.id).toBe(SIMULATED_INCIDENT_FOLIO);
    expect(status.location.available).toBe(true);
  });
});
