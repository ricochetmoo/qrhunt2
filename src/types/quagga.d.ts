declare module "quagga" {
  interface QuaggaResult {
    codeResult?: {
      code?: string;
    };
  }

  interface QuaggaApi {
    init(
      config: Record<string, unknown>,
      callback: (error?: Error) => void,
    ): void;
    start(): void;
    stop(): void;
    onDetected(callback: (result: QuaggaResult) => void): void;
    offDetected?(callback: (result: QuaggaResult) => void): void;
  }

  const quagga: QuaggaApi;
  export = quagga;
}
