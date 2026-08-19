import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw, Send } from "lucide-react";
import { AlertMessage } from "../../components/common/AlertMessage/AlertMessage";
import { Button } from "../../components/common/Button/Button";
import { sendContactInvitation, syncEmergencyContacts } from "../../services/contactService";
import { getStoredEmergencyContacts } from "../../services/contactStorageService";
import type { EmergencyContact } from "../../types/contact";
import { getApiErrorMessage } from "../../utils/apiErrors";
import "./DashboardUtilityPages.css";

export function DashboardContactsPage() {
  const [contacts, setContacts] = useState<EmergencyContact[]>(getStoredEmergencyContacts);
  const [isLoading, setIsLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadContacts = async () => {
    setErrorMessage("");
    setIsLoading(true);
    try {
      await syncEmergencyContacts();
      setContacts(getStoredEmergencyContacts());
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadContacts();
  }, []);

  const handleInvite = async (contact: EmergencyContact) => {
    setSendingId(contact.id);
    setMessage("");
    setErrorMessage("");
    try {
      const response = await sendContactInvitation(contact);
      if (!response.success) {
        setErrorMessage(response.message);
        return;
      }
      setMessage("Invitación generada correctamente");
      setContacts(getStoredEmergencyContacts());
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div className="dashboard-utility">
      <header className="dashboard-utility__header">
        <div>
          <p>Red de emergencia</p>
          <h1>Contactos</h1>
          <span>Consulta contactos reales, estados de invitación y genera nuevos códigos.</span>
        </div>
        <Button isLoading={isLoading} loadingText="Actualizando..." onClick={() => void loadContacts()} type="button" variant="secondary">
          <RefreshCw aria-hidden="true" size={16} /> Actualizar
        </Button>
      </header>

      {message ? <AlertMessage variant="success">{message}</AlertMessage> : null}
      {errorMessage ? <AlertMessage variant="error">{errorMessage}</AlertMessage> : null}

      <section className="dashboard-utility__panel">
        {isLoading ? <p>Cargando contactos...</p> : null}
        {!isLoading && contacts.length === 0 ? (
          <div className="dashboard-utility__card">
            <h2>Sin contactos registrados</h2>
            <p>Agrega tu contacto principal para completar la red de emergencia.</p>
            <Link to="/configuracion/contactos">Administrar contactos</Link>
          </div>
        ) : null}
        {!isLoading && contacts.length > 0 ? (
          <ul className="dashboard-utility__list">
            {contacts.map((contact) => (
              <li key={contact.id}>
                <strong>{contact.fullName}</strong>
                <p>
                  {contact.relationship} · {contact.email} · {contact.phone}
                </p>
                <p>Estado: {contact.invitationStatus}</p>
                {contact.invitationCode ? <p>Código: {contact.invitationCode}</p> : null}
                <Button
                  isLoading={sendingId === contact.id}
                  loadingText="Generando..."
                  onClick={() => void handleInvite(contact)}
                  type="button"
                  variant="secondary"
                >
                  <Send aria-hidden="true" size={16} /> Generar invitación
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
