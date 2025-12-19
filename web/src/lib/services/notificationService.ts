/**
 * Notification Service for displaying success/failure messages
 */
export class NotificationService {
  private static instance: NotificationService;
  private container: HTMLElement | null = null;

  private constructor() {
    this.initializeContainer();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialize the notification container
   */
  private initializeContainer(): void {
    // Create container if it doesn't exist
    this.container = document.getElementById("notification-container");
    if (!this.container) {
      this.container = document.createElement("div");
      this.container.id = "notification-container";
      this.container.style.position = "fixed";
      this.container.style.top = "20px";
      this.container.style.right = "20px";
      this.container.style.zIndex = "9999";
      this.container.style.display = "flex";
      this.container.style.flexDirection = "column";
      this.container.style.gap = "10px";
      document.body.appendChild(this.container);
    }
  }

  /**
   * Show a success notification
   * @param message The message to display
   * @param duration How long to show the notification (ms)
   */
  public showSuccess(message: string, duration: number = 5000): void {
    this.showNotification(message, "success", duration);
  }

  /**
   * Show an error notification
   * @param message The message to display
   * @param duration How long to show the notification (ms)
   */
  public showError(message: string, duration: number = 5000): void {
    this.showNotification(message, "error", duration);
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
    if (!this.container) return;

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

    // Animate in
    setTimeout(() => {
      notification.style.opacity = "1";
      notification.style.transform = "translateX(0)";
    }, 10);

    // Auto remove after duration
    setTimeout(() => {
      notification.style.opacity = "0";
      notification.style.transform = "translateX(100%)";

      // Remove element after animation
      setTimeout(() => {
        if (notification.parentNode === this.container) {
          this.container?.removeChild(notification);
        }
      }, 300);
    }, duration);
  }
}
