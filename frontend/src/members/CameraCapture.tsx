import { useEffect, useRef, useState } from "react";
import { CameraSwitchIcon } from "../components/icons";

type Props = {
  onCapture: (photo: Blob) => void;
  onCancel: () => void;
};

type Facing = "user" | "environment";

function cameraErrorMessage(error: unknown) {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Sem permissão para usar a câmera. Libere o acesso nas configurações do navegador.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "Nenhuma câmera encontrada.";
  }
  return "Não foi possível abrir a câmera.";
}

/**
 * Câmera ao vivo num quadro 2:3 (o mesmo do recorte). A câmera frontal aparece espelhada, como um
 * espelho, e a foto sai igual ao que se vê. Com mais de uma câmera (celular), dá para trocar.
 */
export function CameraCapture({ onCapture, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [facing, setFacing] = useState<Facing>("user");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canSwitch, setCanSwitch] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: facing }, audio: false })
      .then(async (media) => {
        if (cancelled) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = media;
        const video = videoRef.current;
        if (video) {
          video.srcObject = media;
        }
        // Os nomes e a quantidade de câmeras só aparecem depois da permissão
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (!cancelled) {
          setCanSwitch(devices.filter((device) => device.kind === "videoinput").length > 1);
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(cameraErrorMessage(reason));
        }
      });
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [facing]);

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setError("Não foi possível abrir a câmera.");
      return;
    }
    if (facing === "user") {
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
    }
    context.drawImage(video, 0, 0);
    canvas.toBlob((blob) => blob && onCapture(blob), "image/jpeg", 0.92);
  }

  return (
    <>
      <div className="cropper camera">
        {error ? (
          <p role="alert" className="camera-error">
            {error}
          </p>
        ) : (
          <video
            ref={videoRef}
            className={facing === "user" ? "is-mirrored" : undefined}
            aria-label="Imagem da câmera"
            autoPlay
            playsInline
            muted
            onLoadedData={() => setReady(true)}
          />
        )}
        {canSwitch && !error && (
          <button
            type="button"
            className="icon-button camera-switch"
            aria-label="Trocar de câmera"
            onClick={() => {
              setReady(false);
              setFacing(facing === "user" ? "environment" : "user");
            }}
          >
            <CameraSwitchIcon className="icon" aria-hidden />
          </button>
        )}
      </div>

      <footer className="sheet-actions">
        <button type="button" className="button" onClick={onCancel}>
          Cancelar
        </button>
        <button
          type="button"
          className="button primary"
          disabled={!ready || Boolean(error)}
          onClick={capture}
        >
          Tirar foto
        </button>
      </footer>
    </>
  );
}
