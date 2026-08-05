import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { logout } from "../services/authService";

export function useLogout() {
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const performLogout = () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    void logout().finally(() => {
      setIsLoggingOut(false);
      navigate("/login", { replace: true });
    });
  };

  return { isLoggingOut, performLogout };
}
