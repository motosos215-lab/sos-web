import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertMessage } from "../../../components/common/AlertMessage/AlertMessage";
import { Button } from "../../../components/common/Button/Button";
import { SetupLayout } from "../../../layouts/SetupLayout/SetupLayout";
import {
  checkDeviceDuplicate,
  generateMobileActivationCode,
  refreshDeviceStatus,
  regenerateMobileActivationCode,
  revokeDevice,
  simulateMobileAppLink,
  simulateSmartwatchStatus,
} from "../../../services/deviceService";
import { getStoredDevicesState, saveStoredDevicesState, updateStoredDevicesState } from "../../../services/deviceStorageService";
import { updateSession } from "../../../services/sessionService";
import type { ActivationCode, DevicesSetupState, LinkedDevice } from "../../../types/device";
import { copyTextToClipboard } from "../../../utils/clipboard";
import { DeviceStatusCard } from "./DeviceStatusCard";
import { EmptyDeviceState } from "./EmptyDeviceState";
import { MobileAppLinkCard } from "./MobileAppLinkCard";
import { RevokeDeviceModal } from "./RevokeDeviceModal";
import { SmartwatchStatusCard } from "./SmartwatchStatusCard";
import "./DevicesSetup.css";

function getInitialDevicesState(): DevicesSetupState {
  return getStoredDevicesState();
}

function isCodeUsable(activationCode: ActivationCode | null) {
  return Boolean(
    activationCode && activationCode.status === "active" && new Date(activationCode.expiresAt).getTime() > Date.now(),
  );
}

export function DevicesSetup() {
  const navigate = useNavigate();
  const [devicesState, setDevicesState] = useState<DevicesSetupState>(getInitialDevicesState);
  const [successMessage, setSuccessMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [warningMessage, setWarningMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [isLinkingMobile, setIsLinkingMobile] = useState(false);
  const [isSimulatingWatch, setIsSimulatingWatch] = useState(false);
  const [refreshingDeviceId, setRefreshingDeviceId] = useState<string | null>(null);
  const [deviceToRevoke, setDeviceToRevoke] = useState<LinkedDevice | null>(null);
  const [isRevokingDevice, setIsRevokingDevice] = useState(false);

  const { activationCode, mobileDevice, smartwatchDevice } = devicesState;
  const hasLinkedMobileDevice = mobileDevice?.status === "linked";
  const hasLinkedSmartwatch = smartwatchDevice?.status === "linked";
  const canUseCode = isCodeUsable(activationCode) && !hasLinkedMobileDevice;

  useEffect(() => {
    const storedState = getStoredDevicesState();
    setDevicesState(storedState);
  }, []);

  const clearMessages = () => {
    setSuccessMessage("");
    setInfoMessage("");
    setWarningMessage("");
    setErrorMessage("");
  };

  const applyState = (state: DevicesSetupState) => {
    setDevicesState(state);
  };

  const handleGenerateCode = async () => {
    if (hasLinkedMobileDevice) {
      setWarningMessage("Ya existe una aplicación móvil vinculada");
      return;
    }

    clearMessages();
    setIsGeneratingCode(true);

    try {
      const response = await generateMobileActivationCode();
      if (!response.success || !response.data) {
        setWarningMessage(response.message);
        return;
      }

      setDevicesState((current) => ({ ...current, activationCode: response.data }));
      setSuccessMessage(response.message);
    } catch {
      setErrorMessage("No pudimos generar el código de activación. Inténtalo nuevamente.");
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleRegenerateCode = async () => {
    if (hasLinkedMobileDevice) {
      setWarningMessage("Ya existe una aplicación móvil vinculada");
      return;
    }

    clearMessages();
    setIsGeneratingCode(true);

    try {
      const response = await regenerateMobileActivationCode();
      if (!response.success || !response.data) {
        setWarningMessage(response.message);
        return;
      }

      setDevicesState((current) => ({ ...current, activationCode: response.data }));
      setSuccessMessage(response.message);
    } catch {
      setErrorMessage("No pudimos regenerar el código de activación. Inténtalo nuevamente.");
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleExpireCode = () => {
    if (!activationCode || activationCode.status !== "active") {
      return;
    }

    const expiredCode: ActivationCode = { ...activationCode, status: "expired" };
    updateStoredDevicesState({ activationCode: expiredCode });
    setDevicesState((current) => ({ ...current, activationCode: expiredCode }));
    setWarningMessage("El código de activación ha expirado");
  };

  const handleCopyCode = async () => {
    if (!activationCode || !canUseCode) {
      return;
    }

    clearMessages();
    const didCopy = await copyTextToClipboard(activationCode.code);
    setSuccessMessage(didCopy ? "Código de activación copiado" : "No pudimos copiar el código automáticamente");
  };

  const handleCopyLink = async () => {
    if (!activationCode || !canUseCode) {
      return;
    }

    clearMessages();
    const didCopy = await copyTextToClipboard(activationCode.activationLink);
    setSuccessMessage(didCopy ? "Enlace de activación copiado" : "No pudimos copiar el enlace automáticamente");
  };

  const handleSimulateMobileLink = async () => {
    if (!activationCode || !canUseCode || hasLinkedMobileDevice) {
      return;
    }

    clearMessages();
    setIsLinkingMobile(true);

    try {
      const duplicateResponse = await checkDeviceDuplicate("MOBILE-DEMO-001");
      if (!duplicateResponse.success) {
        setErrorMessage(duplicateResponse.message);
        return;
      }

      const response = await simulateMobileAppLink(activationCode.code);
      if (!response.success || !response.data) {
        setErrorMessage(response.message);
        return;
      }

      applyState(response.data);
      updateSession({ mobileDeviceLinked: true, mobileDeviceId: response.data.mobileDevice?.id ?? null });
      setSuccessMessage(response.message);
      setInfoMessage("La app móvil reportará el estado del smartwatch cuando se sincronice.");
    } catch {
      setErrorMessage("No pudimos simular la vinculación de la app móvil.");
    } finally {
      setIsLinkingMobile(false);
    }
  };

  const handleSimulateSmartwatch = async () => {
    if (!hasLinkedMobileDevice) {
      setWarningMessage("Vincula la aplicación móvil antes de consultar el smartwatch");
      return;
    }

    clearMessages();
    setIsSimulatingWatch(true);

    try {
      const response = await simulateSmartwatchStatus();
      if (!response.success || !response.data) {
        setErrorMessage(response.message);
        return;
      }

      setDevicesState((current) => ({ ...current, smartwatchDevice: response.data }));
      updateSession({ smartwatchLinked: true, smartwatchDeviceId: response.data.id });
      setSuccessMessage(response.message);
    } catch {
      setErrorMessage("No pudimos consultar el estado reportado por la app móvil.");
    } finally {
      setIsSimulatingWatch(false);
    }
  };

  const handleRefreshDevice = async (deviceId: string) => {
    clearMessages();
    setRefreshingDeviceId(deviceId);

    try {
      const response = await refreshDeviceStatus(deviceId);
      if (!response.success || !response.data) {
        setErrorMessage(response.message);
        return;
      }

      if (response.data.type === "mobile_app") {
        const mobileApp = response.data;
        setDevicesState((current) => ({ ...current, mobileDevice: mobileApp }));
      } else {
        const smartwatch = response.data;
        setDevicesState((current) => ({ ...current, smartwatchDevice: smartwatch }));
      }

      setSuccessMessage(response.message);
    } catch {
      setErrorMessage("No pudimos actualizar el estado del dispositivo.");
    } finally {
      setRefreshingDeviceId(null);
    }
  };

  const confirmRevokeDevice = async () => {
    if (!deviceToRevoke) {
      return;
    }

    clearMessages();
    setIsRevokingDevice(true);

    try {
      const response = await revokeDevice(deviceToRevoke.id);
      if (!response.success || !response.data) {
        setErrorMessage(response.message);
        return;
      }

      applyState(response.data);

      if (deviceToRevoke.type === "mobile_app") {
        updateSession({
          devicesConfigured: false,
          mobileDeviceLinked: false,
          mobileDeviceId: null,
          smartwatchLinked: false,
          smartwatchDeviceId: null,
        });
      } else {
        updateSession({ smartwatchLinked: false, smartwatchDeviceId: null });
      }

      setSuccessMessage(response.message);
    } catch {
      setErrorMessage("No pudimos revocar el dispositivo.");
    } finally {
      setIsRevokingDevice(false);
      setDeviceToRevoke(null);
    }
  };

  const handleSaveState = () => {
    clearMessages();
    const savedState = saveStoredDevicesState(devicesState);
    applyState(savedState);
    setSuccessMessage("Estado de dispositivos guardado correctamente");
  };

  const handleContinue = () => {
    clearMessages();

    if (!hasLinkedMobileDevice) {
      setErrorMessage("Vincula la aplicación móvil antes de continuar");
      return;
    }

    if (!hasLinkedSmartwatch) {
      setWarningMessage("Continuarás sin un smartwatch vinculado");
    }

    updateSession({
      currentSetupStep: "plan",
      devicesConfigured: true,
      mobileDeviceLinked: true,
      mobileDeviceId: mobileDevice?.id ?? null,
      smartwatchLinked: hasLinkedSmartwatch,
      smartwatchDeviceId: hasLinkedSmartwatch ? smartwatchDevice?.id ?? null : null,
    });

    window.setTimeout(() => navigate("/configuracion/plan"), hasLinkedSmartwatch ? 0 : 700);
  };

  return (
    <SetupLayout activeStep="dispositivos">
      <div className="devices-setup">
        <header className="devices-setup__header">
          <p>Configuración inicial</p>
          <h1>Vinculación de dispositivos</h1>
          <span>Conecta tu cuenta MotoSOS con la aplicación móvil y revisa el estado de tu smartwatch.</span>
          <strong>
            La app móvil se vincula mediante un código QR o código de activación. El smartwatch se conecta desde la aplicación móvil.
          </strong>
        </header>

        <section className="devices-setup__notice" aria-label="Información de privacidad y seguridad">
          <p>
            Los dispositivos vinculados se utilizarán únicamente para monitoreo, alertas y sincronización autorizada en MotoSOS.
          </p>
        </section>

        <div className="devices-setup__messages" aria-live="polite">
          {errorMessage ? <AlertMessage variant="error">{errorMessage}</AlertMessage> : null}
          {warningMessage ? <AlertMessage variant="warning">{warningMessage}</AlertMessage> : null}
          {infoMessage ? <AlertMessage variant="info">{infoMessage}</AlertMessage> : null}
          {successMessage ? <AlertMessage variant="success">{successMessage}</AlertMessage> : null}
        </div>

        <MobileAppLinkCard
          activationCode={activationCode}
          canUseCode={canUseCode}
          isGenerating={isGeneratingCode}
          isLinking={isLinkingMobile}
          mobileDevice={mobileDevice}
          onCopyCode={handleCopyCode}
          onCopyLink={handleCopyLink}
          onExpire={handleExpireCode}
          onGenerate={handleGenerateCode}
          onRegenerate={handleRegenerateCode}
          onSimulateLink={handleSimulateMobileLink}
        />

        <section className="devices-setup__status" aria-labelledby="devices-status-title">
          <header>
            <p>Dispositivos vinculados</p>
            <h2 id="devices-status-title">Estado de dispositivos</h2>
          </header>
          <div className="devices-setup__status-grid">
            {mobileDevice ? (
              <DeviceStatusCard
                device={mobileDevice}
                isRefreshing={refreshingDeviceId === mobileDevice.id}
                onRefresh={handleRefreshDevice}
                onRevoke={setDeviceToRevoke}
                title="App móvil"
              />
            ) : (
              <EmptyDeviceState
                title="App móvil no vinculada"
                description="Genera un código de activación y vincula la app MotoSOS para continuar."
              />
            )}

            <SmartwatchStatusCard
              isRefreshing={Boolean(smartwatchDevice && refreshingDeviceId === smartwatchDevice.id)}
              isSimulating={isSimulatingWatch}
              mobileDevice={mobileDevice}
              onRefresh={handleRefreshDevice}
              onRevoke={setDeviceToRevoke}
              onSimulate={handleSimulateSmartwatch}
              smartwatchDevice={smartwatchDevice}
            />
          </div>
        </section>

        {!hasLinkedMobileDevice ? (
          <AlertMessage variant="info">Vincula la aplicación móvil antes de continuar</AlertMessage>
        ) : !hasLinkedSmartwatch ? (
          <AlertMessage variant="warning">
            Puedes continuar sin smartwatch, pero algunas funciones de monitoreo podrían ser limitadas.
          </AlertMessage>
        ) : null}

        <section className="devices-setup__actions" aria-label="Navegación de configuración">
          <Button onClick={handleSaveState} type="button" variant="secondary">Guardar estado</Button>
          <div>
            <Button onClick={() => navigate("/configuracion/contactos")} type="button" variant="secondary">Anterior</Button>
            <Button disabled={!hasLinkedMobileDevice} onClick={handleContinue} type="button">
              Guardar y continuar
            </Button>
          </div>
        </section>

        {deviceToRevoke ? (
          <RevokeDeviceModal
            device={deviceToRevoke}
            isProcessing={isRevokingDevice}
            onCancel={() => setDeviceToRevoke(null)}
            onConfirm={confirmRevokeDevice}
          />
        ) : null}
      </div>
    </SetupLayout>
  );
}
