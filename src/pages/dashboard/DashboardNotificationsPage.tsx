import { useEffect, useState } from "react";
import { RefreshCw, Save } from "lucide-react";
import { AlertMessage } from "../../components/common/AlertMessage/AlertMessage";
import { Button } from "../../components/common/Button/Button";
import {
  getNotificationAttempts,
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationAttempt,
  type NotificationPreferences,
} from "../../services/notificationService";
import { getApiErrorMessage } from "../../utils/apiErrors";
import { formatReadableDate } from "../../utils/dateFormat";
import "./DashboardUtilityPages.css";

const preferenceLabels: Array<{ key: keyof NotificationPreferences; label: string }> = [
  { key: "pushEnabled", label: "Push" },
  { key: "emailEnabled", label: "Correo" },
  { key: "smsEnabled", label: "SMS" },
  { key: "criticalAlertsEnabled", label: "Alertas críticas" },
  { key: "tripUpdatesEnabled", label: "Actualizaciones de viaje" },
  { key: "securityAlertsEnabled", label: "Seguridad" },
  { key: "marketingEnabled", label: "Marketing" },
];

export function DashboardNotificationsPage() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [attempts, setAttempts] = useState<NotificationAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const load = async () => {
    setErrorMessage("");
    setIsLoading(true);
    try {
      const [nextPreferences, nextAttempts] = await Promise.all([getNotificationPreferences(), getNotificationAttempts()]);
      setPreferences(nextPreferences);
      setAttempts(nextAttempts);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const updateBoolean = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences((current) => {
      if (!current) {
        return current;
      }

      if (key === "quietHoursEnabled" && value) {
        return {
          ...current,
          quietHoursEnabled: true,
          quietHoursStartLocal: current.quietHoursStartLocal ?? "22:00",
          quietHoursEndLocal: current.quietHoursEndLocal ?? "06:00",
        };
      }

      return { ...current, [key]: value };
    });
  };

  const save = async () => {
    if (!preferences) {
      return;
    }

    setIsSaving(true);
    setMessage("");
    setErrorMessage("");
    try {
      const next = await updateNotificationPreferences(preferences);
      setPreferences(next);
      setMessage("Preferencias actualizadas correctamente");
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="dashboard-utility">
      <header className="dashboard-utility__header">
        <div>
          <p>Canales reales</p>
          <h1>Notificaciones</h1>
          <span>Preferencias propias e intentos de notificación registrados por MotoSOS.</span>
        </div>
        <Button isLoading={isLoading} loadingText="Actualizando..." onClick={() => void load()} type="button" variant="secondary">
          <RefreshCw aria-hidden="true" size={16} /> Actualizar
        </Button>
      </header>

      {message ? <AlertMessage variant="success">{message}</AlertMessage> : null}
      {errorMessage ? <AlertMessage variant="error">{errorMessage}</AlertMessage> : null}

      <section className="dashboard-utility__grid">
        <article className="dashboard-utility__panel">
          <h2>Preferencias</h2>
          {isLoading ? (
            <p>Cargando preferencias...</p>
          ) : !preferences ? (
            <p>No pudimos cargar tus preferencias. Intenta actualizar la vista.</p>
          ) : (
            <form
              className="dashboard-utility__form"
              onSubmit={(event) => {
                event.preventDefault();
                void save();
              }}
            >
              {preferenceLabels.map((item) => (
                <label key={item.key}>
                  <span>{item.label}</span>
                  <input
                    checked={Boolean(preferences[item.key])}
                    onChange={(event) => updateBoolean(item.key, event.target.checked)}
                    type="checkbox"
                  />
                </label>
              ))}
              <label>
                <span>Horario silencioso</span>
                <input
                  checked={preferences.quietHoursEnabled}
                  onChange={(event) => updateBoolean("quietHoursEnabled", event.target.checked)}
                  type="checkbox"
                />
              </label>
              {preferences.quietHoursEnabled ? (
                <>
                  <label>
                    <span>Inicio</span>
                    <input
                      onChange={(event) => setPreferences({ ...preferences, quietHoursStartLocal: event.target.value })}
                      type="time"
                      value={preferences.quietHoursStartLocal ?? "22:00"}
                    />
                  </label>
                  <label>
                    <span>Fin</span>
                    <input
                      onChange={(event) => setPreferences({ ...preferences, quietHoursEndLocal: event.target.value })}
                      type="time"
                      value={preferences.quietHoursEndLocal ?? "06:00"}
                    />
                  </label>
                </>
              ) : null}
              <label>
                <span>Zona horaria</span>
                <input
                  onChange={(event) => setPreferences({ ...preferences, timeZone: event.target.value })}
                  type="text"
                  value={preferences.timeZone}
                />
              </label>
              <Button isLoading={isSaving} loadingText="Guardando..." type="submit">
                <Save aria-hidden="true" size={16} /> Guardar
              </Button>
            </form>
          )}
        </article>

        <article className="dashboard-utility__panel">
          <h2>Intentos recientes</h2>
          {isLoading ? <p>Cargando intentos...</p> : null}
          {!isLoading && attempts.length === 0 ? <p>No hay intentos de notificación registrados.</p> : null}
          {!isLoading && attempts.length > 0 ? (
            <ul className="dashboard-utility__list">
              {attempts.map((attempt) => (
                <li key={attempt.id}>
                  <strong>{attempt.contactFullName}</strong>
                  <p>
                    {attempt.channel} · {attempt.status} · {attempt.provider}
                  </p>
                  <p>{formatReadableDate(attempt.preparedAtUtc)}</p>
                </li>
              ))}
            </ul>
          ) : null}
        </article>
      </section>
    </div>
  );
}
