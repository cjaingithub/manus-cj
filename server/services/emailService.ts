import nodemailer from "nodemailer";
import { tasks as tasksTable } from "../../drizzle/schema";

type Task = typeof tasksTable.$inferSelect;

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

interface EmailNotification {
  to: string;
  subject: string;
  template: "taskCompleted" | "taskFailed" | "taskStarted";
  data: Record<string, unknown>;
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private config: EmailConfig | null = null;

  constructor(config?: EmailConfig) {
    if (config) {
      this.config = config;
      this.initializeTransporter();
    }
  }

  private initializeTransporter() {
    if (!this.config) return;

    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: {
        user: this.config.auth.user,
        pass: this.config.auth.pass,
      },
    });
  }

  private getEmailTemplate(
    template: string,
    data: Record<string, unknown>
  ): { subject: string; html: string } {
    switch (template) {
      case "taskCompleted":
        return {
          subject: `✅ Task Completed: ${data.taskTitle}`,
          html: `
            <h2>Task Completed Successfully</h2>
            <p>Your task "<strong>${data.taskTitle}</strong>" has completed successfully.</p>
            <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Task ID:</strong> ${data.taskId}</p>
              <p><strong>Duration:</strong> ${data.duration}</p>
              <p><strong>Status:</strong> Completed</p>
              <p><strong>Tokens Used:</strong> ${data.tokensUsed}</p>
              <p><strong>Cost:</strong> $${data.estimatedCost}</p>
            </div>
            <p><a href="${data.taskUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Task Details</a></p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
            <p style="color: #666; font-size: 12px;">Hunter Agent Platform</p>
          `,
        };

      case "taskFailed":
        return {
          subject: `❌ Task Failed: ${data.taskTitle}`,
          html: `
            <h2>Task Failed</h2>
            <p>Your task "<strong>${data.taskTitle}</strong>" has failed.</p>
            <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
              <p><strong>Task ID:</strong> ${data.taskId}</p>
              <p><strong>Status:</strong> Failed</p>
              <p><strong>Error:</strong> ${data.error}</p>
            </div>
            <p><a href="${data.taskUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Task Details</a></p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
            <p style="color: #666; font-size: 12px;">Hunter Agent Platform</p>
          `,
        };

      case "taskStarted":
        return {
          subject: `🚀 Task Started: ${data.taskTitle}`,
          html: `
            <h2>Task Started</h2>
            <p>Your task "<strong>${data.taskTitle}</strong>" has started executing.</p>
            <div style="background-color: #d1ecf1; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #17a2b8;">
              <p><strong>Task ID:</strong> ${data.taskId}</p>
              <p><strong>Status:</strong> Executing</p>
              <p><strong>Started at:</strong> ${data.startedAt}</p>
            </div>
            <p><a href="${data.taskUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Monitor Task</a></p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
            <p style="color: #666; font-size: 12px;">Hunter Agent Platform</p>
          `,
        };

      default:
        return {
          subject: "Hunter Agent Platform Notification",
          html: "<p>Notification from Hunter Agent Platform</p>",
        };
    }
  }

  async sendNotification(notification: EmailNotification): Promise<boolean> {
    if (!this.transporter || !this.config) {
      console.warn("Email service not configured");
      return false;
    }

    try {
      const { subject, html } = this.getEmailTemplate(
        notification.template,
        notification.data
      );

      await this.transporter.sendMail({
        from: this.config.from,
        to: notification.to,
        subject,
        html,
      });

      return true;
    } catch (error) {
      console.error("Failed to send email:", error);
      return false;
    }
  }

  async sendTaskCompletedNotification(
    email: string,
    task: Task,
    duration: number,
    tokensUsed: number,
    estimatedCost: number
  ): Promise<boolean> {
    return this.sendNotification({
      to: email,
      subject: `Task Completed: ${task.title}`,
      template: "taskCompleted",
      data: {
        taskTitle: task.title,
        taskId: task.id,
        duration: `${Math.round(duration / 1000)}s`,
        tokensUsed,
        estimatedCost: estimatedCost.toFixed(4),
        taskUrl: `${process.env.VITE_FRONTEND_URL || "http://localhost:3000"}/tasks/${task.id}`,
      },
    });
  }

  async sendTaskFailedNotification(
    email: string,
    task: Task,
    error: string
  ): Promise<boolean> {
    return this.sendNotification({
      to: email,
      subject: `Task Failed: ${task.title}`,
      template: "taskFailed",
      data: {
        taskTitle: task.title,
        taskId: task.id,
        error,
        taskUrl: `${process.env.VITE_FRONTEND_URL || "http://localhost:3000"}/tasks/${task.id}`,
      },
    });
  }

  async sendTaskStartedNotification(
    email: string,
    task: Task
  ): Promise<boolean> {
    return this.sendNotification({
      to: email,
      subject: `Task Started: ${task.title}`,
      template: "taskStarted",
      data: {
        taskTitle: task.title,
        taskId: task.id,
        startedAt: new Date().toLocaleString(),
        taskUrl: `${process.env.VITE_FRONTEND_URL || "http://localhost:3000"}/tasks/${task.id}`,
      },
    });
  }

  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) return false;

    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error("Email service verification failed:", error);
      return false;
    }
  }
}

// Singleton instance
let emailService: EmailService | null = null;

export function getEmailService(): EmailService {
  if (!emailService) {
    const config = {
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: parseInt(process.env.EMAIL_PORT || "587"),
      secure: process.env.EMAIL_SECURE === "true",
      auth: {
        user: process.env.EMAIL_USER || "",
        pass: process.env.EMAIL_PASSWORD || "",
      },
      from: process.env.EMAIL_FROM || "noreply@hunteragent.com",
    };

    emailService = new EmailService(config);
  }

  return emailService;
}
