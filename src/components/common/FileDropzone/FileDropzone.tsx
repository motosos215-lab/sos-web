import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { Button } from "../Button/Button";
import "./FileDropzone.css";

interface FileDropzoneProps {
  accept?: string;
  allowedExtensions?: readonly string[];
  allowedMimeTypes?: readonly string[];
  error?: string;
  fileTypesLabel?: string;
  helpText: string;
  id: string;
  invalidTypeMessage?: string;
  label: string;
  onChange: (file: File | null, error?: string) => void;
  recommendationText?: string;
  value: File | null;
}

const defaultAllowedMimeTypes = ["image/jpeg", "image/png", "application/pdf"];
const defaultAllowedExtensions = [".jpg", ".jpeg", ".png", ".pdf"];
const maxFileSize = 5 * 1024 * 1024;

function formatFileSize(size: number) {
  const megabytes = size / (1024 * 1024);
  return `${megabytes.toFixed(megabytes >= 1 ? 1 : 2)} MB`;
}

function getFileExtension(fileName: string) {
  const extensionStart = fileName.lastIndexOf(".");
  return extensionStart >= 0 ? fileName.slice(extensionStart).toLowerCase() : "";
}

function validateFile(file: File, allowedExtensions: readonly string[], allowedMimeTypes: readonly string[], invalidTypeMessage: string) {
  const hasAllowedExtension = allowedExtensions.includes(getFileExtension(file.name));
  const hasAllowedMimeType = !file.type || allowedMimeTypes.includes(file.type);

  if (!hasAllowedExtension || !hasAllowedMimeType) {
    return invalidTypeMessage;
  }

  if (file.size > maxFileSize) {
    return "El archivo no debe superar 5 MB.";
  }

  return "";
}

export function FileDropzone({
  accept = ".jpg,.jpeg,.png,.pdf",
  allowedExtensions = defaultAllowedExtensions,
  allowedMimeTypes = defaultAllowedMimeTypes,
  error,
  fileTypesLabel = "JPG, PNG o PDF. Máximo 5 MB.",
  helpText,
  id,
  invalidTypeMessage = "Selecciona un archivo JPG, PNG o PDF.",
  label,
  onChange,
  recommendationText = "Recomendación: agrega una licencia o identificación vigente para acelerar la validación.",
  value,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const errorId = error ? `${id}-error` : undefined;
  const helpId = `${id}-help`;

  const handleFile = (file: File | null) => {
    if (!file) {
      onChange(null);
      return;
    }

    const validationError = validateFile(file, allowedExtensions, allowedMimeTypes, invalidTypeMessage);
    onChange(validationError ? null : file, validationError || undefined);
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleFile(event.target.files?.[0] ?? null);
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    handleFile(event.dataTransfer.files?.[0] ?? null);
  };

  return (
    <div className="file-dropzone">
      <label className="file-dropzone__label" htmlFor={id}>
        {label}
      </label>
      <div
        aria-describedby={[helpId, errorId].filter(Boolean).join(" ") || undefined}
        aria-invalid={Boolean(error)}
        className={`file-dropzone__box ${isDragging ? "file-dropzone__box--dragging" : ""}`.trim()}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <input
          accept={accept}
          className="file-dropzone__input"
          data-field={id}
          id={id}
          onChange={handleInputChange}
          ref={inputRef}
          type="file"
        />
        <p id={helpId}>{helpText}</p>
        <span>{fileTypesLabel}</span>
        <Button onClick={() => inputRef.current?.click()} type="button" variant="secondary">
          Seleccionar archivo
        </Button>
      </div>
      {value ? (
        <div className="file-dropzone__file" aria-live="polite">
          <div>
            <strong>{value.name}</strong>
            <span>{formatFileSize(value.size)}</span>
          </div>
          <button onClick={() => onChange(null)} type="button">
            Eliminar
          </button>
        </div>
      ) : (
        <p className="file-dropzone__recommendation">{recommendationText}</p>
      )}
      {error ? (
        <p className="file-dropzone__error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
