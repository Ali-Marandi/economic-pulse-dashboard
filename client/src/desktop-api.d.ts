export {};

declare global {
  interface Window {
    economicPulseDesktop?: {
      isDesktop: true;
      platform: string;
      version: string;
      getRuntimeInfo: () => Promise<{
        appVersion: string;
        isPackaged: boolean;
        platform: string;
      } | null>;
      saveTextFile: (payload: {
        suggestedName: string;
        extension?: string;
        content: string;
      }) => Promise<{
        ok: boolean;
        canceled?: boolean;
        filePath?: string;
        reason?: string;
      }>;
      exportPdf: (suggestedName: string) => Promise<{
        ok: boolean;
        canceled?: boolean;
        filePath?: string;
        reason?: string;
      }>;
    };
  }
}
