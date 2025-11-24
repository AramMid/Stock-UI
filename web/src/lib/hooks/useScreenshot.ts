import { useCallback } from "react";
import { ScreenshotService, ScreenshotOptions } from "@/lib/screenshot-service";

export interface UseScreenshotOptions extends ScreenshotOptions {
  onSuccess?: (dataUrl: string) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook for capturing screenshots of DOM elements
 */
export function useScreenshot() {
  const captureElement = useCallback(
    async (element: HTMLElement | null, options: UseScreenshotOptions = {}) => {
      if (!element) {
        const error = new Error("Element not found");
        options.onError?.(error);
        throw error;
      }

      try {
        const dataUrl = await ScreenshotService.captureElement(
          element,
          options
        );
        options.onSuccess?.(dataUrl);
        return dataUrl;
      } catch (error) {
        const screenshotError =
          error instanceof Error ? error : new Error("Screenshot failed");
        options.onError?.(screenshotError);
        throw screenshotError;
      }
    },
    []
  );

  const downloadScreenshot = useCallback(
    async (
      element: HTMLElement | null,
      filename?: string,
      options: UseScreenshotOptions = {}
    ) => {
      try {
        const dataUrl = await captureElement(element, options);
        ScreenshotService.downloadImage(dataUrl, filename);
        return dataUrl;
      } catch (error) {
        console.error("Download screenshot failed:", error);
        throw error;
      }
    },
    [captureElement]
  );

  const copyToClipboard = useCallback(
    async (element: HTMLElement | null, options: UseScreenshotOptions = {}) => {
      try {
        const dataUrl = await captureElement(element, options);
        await ScreenshotService.copyToClipboard(dataUrl);
        return dataUrl;
      } catch (error) {
        console.error("Copy to clipboard failed:", error);
        throw error;
      }
    },
    [captureElement]
  );

  return {
    captureElement,
    downloadScreenshot,
    copyToClipboard,
  };
}
