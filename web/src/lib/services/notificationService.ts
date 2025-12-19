/**
 * Notification Service for displaying success/failure messages
 */
export class NotificationService {
  private static instance: NotificationService;
  private container: HTMLElement | null = null;

  private constructor() {
    // Only initialize container in browser environment
    if (typeof window !== "undefined" && typeof document !== "undefined") {
      this.initializeContainer();
    }
  }

  public static getInstance(): NotificationService {
    console.log("[NotificationService] Getting instance");
    if (!NotificationService.instance) {
      console.log("[NotificationService] Creating new instance");
      NotificationService.instance = new NotificationService();
    }
    console.log("[NotificationService] Returning instance");
    return NotificationService.instance;
  }

  /**
   * Initialize the notification container
   */
  private initializeContainer(): void {
    // Check if we're in a browser environment
    if (typeof document === "undefined") {
      console.log("[NotificationService] Not in browser environment, skipping container initialization");
      return;
    }

    // Create container if it doesn't exist
    this.container = document.getElementById("notification-container");
    if (!this.container) {
      console.log("[NotificationService] Creating notification container");
      this.container = document.createElement("div");
      this.container.id = "notification-container";
      this.container.style.position = "fixed";
      this.container.style.top = "20px";
      this.container.style.right = "20px";
      this.container.style.zIndex = "9999";
      this.container.style.display = "flex";
      this.container.style.flexDirection = "column";
      this.container.style.gap = "10px";
      if (typeof document !== "undefined" && document.body) {
        document.body.appendChild(this.container);
        console.log("[NotificationService] Container appended to body");
      } else {
        console.log("[NotificationService] Cannot append container to body");
      }
    } else {
      console.log("[NotificationService] Using existing container");
    }
  }

  /**
   * Show a success notification
   * @param message The message to display
   * @param duration How long to show the notification (ms)
   */
  public showSuccess(message: string, duration: number = 5000): void {
    console.log(
      `[NotificationService] Showing success notification: ${message}`
    );
    // Only show notifications in browser environment
    if (typeof window !== "undefined" && typeof document !== "undefined") {
      this.showNotification(message, "success", duration);
    } else {
      console.log("[NotificationService] Not in browser environment, skipping notification");
    }
  }

  /**
   * Show an error notification
   * @param message The message to display
   * @param duration How long to show the notification (ms)
   */
  public showError(message: string, duration: number = 5000): void {
    console.log(
      `[NotificationService] Showing error notification: ${message}`
    );
    // Only show notifications in browser environment
    if (typeof window !== "undefined" && typeof document !== "undefined") {
      this.showNotification(message, "error", duration);
    } else {
      console.log("[NotificationService] Not in browser environment, skipping notification");
    }
  }

  /**
   * Show a notification
   * @param message The message to display
   * @param type The type of notification
   * @param duration How long to show the notification (ms)
   */
  private showNotification(
    message: string,
    type: "success" | "error",
    duration: number
  ): void {
    console.log(
      `[NotificationService] Displaying ${type} notification: ${message}`
    );
    // Check if we're in a browser environment and have a container
    if (typeof document === "undefined" || !this.container) {
      console.log(
        "[NotificationService] Cannot display notification - no document or container"
      );
      // Try to initialize container again
      if (typeof document !== "undefined") {
        console.log("[NotificationService] Attempting to reinitialize container");
        this.initializeContainer();
        if (!this.container) {
          console.log("[NotificationService] Failed to initialize container");
          return;
        }
      } else {
        console.log("[NotificationService] Still not in browser environment");
        return;
      }
    }

    // Create notification element
    const notification = document.createElement("div");
    notification.style.padding = "12px 20px";
    notification.style.borderRadius = "4px";
    notification.style.color = "white";
    notification.style.fontWeight = "500";
    notification.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
    notification.style.opacity = "0";
    notification.style.transform = "translateX(100%)";
    notification.style.transition = "all 0.3s ease-in-out";
    notification.style.maxWidth = "300px";
    notification.style.wordWrap = "break-word";
    notification.textContent = message;

    // Set styles based on type
    if (type === "success") {
      notification.style.backgroundColor = "#10b981"; // green-500
    } else {
      notification.style.backgroundColor = "#ef4444"; // red-500
    }

    // Add to container
    this.container.appendChild(notification);
    console.log(`[NotificationService] Added notification to container`);

    // Animate in
    setTimeout(() => {
      notification.style.opacity = "1";
      notification.style.transform = "translateX(0)";
      console.log(`[NotificationService] Animated notification in`);
    }, 10);

    // Auto remove after duration
    setTimeout(() => {
      notification.style.opacity = "0";
      notification.style.transform = "translateX(100%)";
      console.log(`[NotificationService] Starting notification fade out`);

      // Remove element after animation
      setTimeout(() => {
        if (notification.parentNode === this.container) {
          this.container?.removeChild(notification);
          console.log(
            `[NotificationService] Removed notification from container`
          );
        }
      }, 300);
    }, duration);
  }
}