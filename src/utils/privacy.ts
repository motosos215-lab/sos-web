export function maskEmail(email: string): string {
  const value = email.trim();

  if (!value) {
    return "";
  }

  const atIndex = value.indexOf("@");

  if (atIndex <= 0) {
    return "****";
  }

  const localPart = value.slice(0, atIndex);
  const domain = value.slice(atIndex + 1);
  const visibleLocal = localPart.slice(0, 4);
  const hiddenLocal = "****";

  if (!domain) {
    return `${visibleLocal}${hiddenLocal}`;
  }

  return `${visibleLocal}${hiddenLocal}@${domain}`;
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  if (digits.length <= 4) {
    return phone ? "****" : "";
  }

  const lastFour = digits.slice(-4);
  const maskLength = Math.max(digits.length - 4, 4);

  return `${"*".repeat(maskLength)}${lastFour}`;
}

export function maskLicensePlate(plate: string): string {
  const value = plate.trim().replace(/\s+/g, "-");

  if (!value) {
    return "";
  }

  const lastThree = value.slice(-3);
  const maskLength = Math.max(value.length - 3, 3);

  return `${"*".repeat(maskLength)}-${lastThree}`;
}

export function safeDisplayValue(value: string | null | undefined, fallback = "No disponible"): string {
  const normalized = value?.trim() ?? "";

  return normalized.length > 0 ? normalized : fallback;
}