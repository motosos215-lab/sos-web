interface EmptyDeviceStateProps {
  description: string;
  title: string;
}

export function EmptyDeviceState({ description, title }: EmptyDeviceStateProps) {
  return (
    <section className="device-empty" aria-labelledby="device-empty-title">
      <h3 id="device-empty-title">{title}</h3>
      <p>{description}</p>
    </section>
  );
}
