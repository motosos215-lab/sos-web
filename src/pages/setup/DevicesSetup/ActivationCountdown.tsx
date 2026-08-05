import { useEffect, useState } from "react";
import { formatMinutesSeconds } from "../../../utils/timeFormat";

interface ActivationCountdownProps {
  expiresAt: string | null;
  onExpire: () => void;
}

export function ActivationCountdown({ expiresAt, onExpire }: ActivationCountdownProps) {
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
    return <span>El código de activación ha expirado</span>;
  }

  return <span aria-live="off">El código expira en {formatMinutesSeconds(remaining)}</span>;
}
