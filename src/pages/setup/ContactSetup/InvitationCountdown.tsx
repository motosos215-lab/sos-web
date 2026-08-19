import { useEffect, useState } from "react";

interface InvitationCountdownProps {
  expiresAt: string | null;
  onExpire: () => void;
}

function formatRemaining(milliseconds: number) {
  const totalSeconds = Math.max(Math.ceil(milliseconds / 1000), 0);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function InvitationCountdown({ expiresAt, onExpire }: InvitationCountdownProps) {
  const [remaining, setRemaining] = useState(() => (expiresAt ? new Date(expiresAt).getTime() - Date.now() : 0));

  useEffect(() => {
    if (!expiresAt) {
      setRemaining(0);
      return;
    }

    let didExpire = false;
    const updateRemaining = () => {
      const nextRemaining = new Date(expiresAt).getTime() - Date.now();
      setRemaining(nextRemaining);

      if (nextRemaining <= 0 && !didExpire) {
        didExpire = true;
        onExpire();
      }
    };

    updateRemaining();
    const intervalId = window.setInterval(updateRemaining, 1000);

    return () => window.clearInterval(intervalId);
  }, [expiresAt, onExpire]);

  if (!expiresAt || remaining <= 0) {
    return <span>La invitación ha expirado</span>;
  }

  return <span aria-live="off">Expira en {formatRemaining(remaining)}</span>;
}
