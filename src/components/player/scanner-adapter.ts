export type ScannerStatus =
  | "idle"
  | "starting"
  | "running"
  | "permission-denied"
  | "unsupported"
  | "error";

export interface ScannerHandle {
  stop: () => void;
}

interface QuaggaResult {
  codeResult?: {
    code?: string;
  };
}

interface QuaggaApi {
  init: (config: Record<string, unknown>, callback: (error?: Error) => void) => void;
  start: () => void;
  stop: () => void;
  onDetected: (callback: (result: QuaggaResult) => void) => void;
  offDetected?: (callback: (result: QuaggaResult) => void) => void;
}

export const SCANNER_COMPATIBILITY = {
  decoder: "QuaggaJS 0.12.1",
  qrPayloadSupported: false,
  note:
    "QuaggaJS is a 1D barcode decoder. The adapter keeps QR payload handling isolated so a QR-capable decoder can replace it.",
} as const;

function resolveQuagga(module: unknown): QuaggaApi {
  const candidate = module as { default?: QuaggaApi } | QuaggaApi;
  if ("default" in candidate && candidate.default) {
    return candidate.default;
  }
  return candidate as QuaggaApi;
}

function isPermissionError(error: Error): boolean {
  return /permission|denied|notallowed|not allowed/i.test(error.message);
}

export class ScannerStartError extends Error {
  readonly status: Extract<ScannerStatus, "permission-denied" | "unsupported" | "error">;

  constructor(
    message: string,
    status: Extract<ScannerStatus, "permission-denied" | "unsupported" | "error">,
  ) {
    super(message);
    this.name = "ScannerStartError";
    this.status = status;
  }
}

export async function startQuaggaScanner({
  targetId,
  onDetected,
}: {
  targetId: string;
  onDetected: (code: string) => void;
}): Promise<ScannerHandle> {
  if (typeof window === "undefined") {
    throw new ScannerStartError("Camera scanning is only available in the browser.", "unsupported");
  }

  let quagga: QuaggaApi;

  try {
    const quaggaModule = await import("quagga");
    quagga = resolveQuagga(quaggaModule);
  } catch {
    throw new ScannerStartError("The camera scanner could not be loaded.", "unsupported");
  }

  const detectedHandler = (result: QuaggaResult) => {
    const code = result.codeResult?.code?.trim();
    if (code) onDetected(code);
  };

  await new Promise<void>((resolve, reject) => {
    quagga.init(
      {
        inputStream: {
          name: "QR Hunt camera",
          type: "LiveStream",
          target: `#${targetId}`,
          constraints: {
            facingMode: "environment",
            width: { min: 320, ideal: 720, max: 1280 },
            height: { min: 240, ideal: 540, max: 960 },
          },
        },
        locator: {
          halfSample: true,
          patchSize: "medium",
        },
        locate: true,
        numOfWorkers: Math.min(2, navigator.hardwareConcurrency || 2),
        frequency: 10,
        decoder: {
          readers: ["code_128_reader", "code_39_reader"],
        },
      },
      (error) => {
        if (error) {
          reject(
            new ScannerStartError(
              error.message || "The camera could not be started.",
              isPermissionError(error) ? "permission-denied" : "error",
            ),
          );
          return;
        }

        quagga.onDetected(detectedHandler);
        quagga.start();
        resolve();
      },
    );
  });

  return {
    stop: () => {
      quagga.offDetected?.(detectedHandler);
      quagga.stop();
    },
  };
}
