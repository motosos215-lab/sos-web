import { Button } from "../../../components/common/Button/Button";
import type { ActivationCode } from "../../../types/device";
import { ActivationCountdown } from "./ActivationCountdown";
import { DeviceQrCode } from "./DeviceQrCode";

interface ActivationCodePanelProps {
  activationCode: ActivationCode;
  canUseCode: boolean;
  isGenerating: boolean;
  isLinking: boolean;
  onCopyCode: () => void;
  onCopyLink: () => void;
  onExpire: () => void;
  onRegenerate: () => void;
  onLinkMobileApp: () => void;
}

export function ActivationCodePanel({
  activationCode,
  canUseCode,
  isGenerating,
  isLinking,
  onCopyCode,
  onCopyLink,
  onExpire,
  onRegenerate,
  onLinkMobileApp,
}: ActivationCodePanelProps) {
  const isExpired = activationCode.status === "expired" || new Date(activationCode.expiresAt).getTime() <= Date.now();
  const isRevoked = activationCode.status === "revoked";

  return (
    <section className="activation-panel" aria-labelledby="activation-code-title">
      <div className="activation-panel__header">
        <h3 id="activation-code-title">Código de activación</h3>
        <span className={`activation-panel__status activation-panel__status--${activationCode.status}`}>
          Estado:{" "}
          {isExpired
            ? "Expirado"
            : activationCode.status === "used"
              ? "Usado"
              : activationCode.status === "revoked"
                ? "Revocado"
                : "Activo"}
        </span>
      </div>

      {!isRevoked ? <DeviceQrCode activationLink={activationCode.activationLink} /> : null}
      <code>{activationCode.code}</code>
      <ActivationCountdown expiresAt={activationCode.expiresAt} onExpire={onExpire} />

      <div className="activation-panel__actions">
        <Button aria-label="Copiar código de activación" disabled={!canUseCode} onClick={onCopyCode} type="button" variant="secondary">
          Copiar código
        </Button>
        <Button aria-label="Copiar enlace de activación" disabled={!canUseCode} onClick={onCopyLink} type="button" variant="secondary">
          Copiar enlace
        </Button>
        <Button
          disabled={isGenerating}
          isLoading={isGenerating}
          loadingText="Generando código..."
          onClick={onRegenerate}
          type="button"
          variant="secondary"
        >
          {isExpired ? "Generar nuevo código" : "Regenerar código"}
        </Button>
        <Button
          disabled={!canUseCode || isLinking}
          isLoading={isLinking}
          loadingText="Vinculando aplicación..."
          onClick={onLinkMobileApp}
          type="button"
        >
          Vincular app móvil
        </Button>
      </div>
      <p className="activation-panel__dev-note">Usa este código desde la app móvil MotoSOS para completar la vinculación.</p>
    </section>
  );
}
