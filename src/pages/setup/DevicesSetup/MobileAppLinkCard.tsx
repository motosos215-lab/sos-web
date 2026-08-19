import { Button } from "../../../components/common/Button/Button";
import type { ActivationCode, MobileDevice } from "../../../types/device";
import { ActivationCodePanel } from "./ActivationCodePanel";

interface MobileAppLinkCardProps {
  activationCode: ActivationCode | null;
  canUseCode: boolean;
  isGenerating: boolean;
  isLinking: boolean;
  mobileDevice: MobileDevice | null;
  onCopyCode: () => void;
  onCopyLink: () => void;
  onExpire: () => void;
  onGenerate: () => void;
  onRegenerate: () => void;
  onLinkMobileApp: () => void;
}

export function MobileAppLinkCard({
  activationCode,
  canUseCode,
  isGenerating,
  isLinking,
  mobileDevice,
  onCopyCode,
  onCopyLink,
  onExpire,
  onGenerate,
  onRegenerate,
  onLinkMobileApp,
}: MobileAppLinkCardProps) {
  const hasLinkedMobileDevice = mobileDevice?.status === "linked";

  return (
    <article className="device-link-card" aria-labelledby="mobile-link-title">
      <header>
        <p>Aplicación móvil</p>
        <h2 id="mobile-link-title">Vincular app móvil</h2>
        <span>Abre la app MotoSOS en tu teléfono y escanea este código o ingresa el código manualmente.</span>
      </header>

      {hasLinkedMobileDevice ? (
        <p className="device-link-card__locked">Ya existe una aplicación móvil vinculada.</p>
      ) : activationCode ? (
        <ActivationCodePanel
          activationCode={activationCode}
          canUseCode={canUseCode}
          isGenerating={isGenerating}
          isLinking={isLinking}
          onCopyCode={onCopyCode}
          onCopyLink={onCopyLink}
          onExpire={onExpire}
          onRegenerate={onRegenerate}
          onLinkMobileApp={onLinkMobileApp}
        />
      ) : (
        <section className="device-link-card__empty" aria-labelledby="activation-empty-title">
          <h3 id="activation-empty-title">Genera un código para vincular tu aplicación móvil</h3>
          <p>El código tendrá vigencia temporal y podrá usarse desde la app MotoSOS.</p>
          <Button disabled={isGenerating} isLoading={isGenerating} loadingText="Generando código..." onClick={onGenerate} type="button">
            Generar código de activación
          </Button>
        </section>
      )}
    </article>
  );
}
