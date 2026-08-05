import { QRCodeSVG } from "qrcode.react";

interface DeviceQrCodeProps {
  activationLink: string;
}

export function DeviceQrCode({ activationLink }: DeviceQrCodeProps) {
  return (
    <div className="device-qr" role="img" aria-label="Código QR para vincular la aplicación móvil MotoSOS">
      <QRCodeSVG value={activationLink} size={188} />
    </div>
  );
}
