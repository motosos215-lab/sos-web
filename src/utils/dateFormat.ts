export function formatRelativeDate(isoDate: string | null): string {
  if (!isoDate) {
    return "Sin información";
  }

  const date = new Date(isoDate);
  const milliseconds = Date.now() - date.getTime();
  const seconds = Math.max(Math.floor(milliseconds / 1000), 0);

  if (seconds < 45) {
    return "Hace unos segundos";
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `Hace ${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `Hace ${hours} ${hours === 1 ? "hora" : "horas"}`;
  }

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatReadableDate(isoDate: string | null): string {
  if (!isoDate) {
    return "Sin información";
  }

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(isoDate));
}
