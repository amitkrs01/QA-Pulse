import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

let _transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return _transporter;
}

function getAppUrl() {
  return process.env.APP_URL || "http://localhost:5173";
}

function getFrom() {
  return process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@qapulse.com";
}

export async function sendWelcomeEmail(to: string, name: string, password: string) {
  const APP_URL = getAppUrl();
  const subject = "Welcome to QA Pulse — Your Account is Ready";
  const text = `Hi ${name},

You have been added to QA Pulse — BE/FE Lifecycle Tracking Tool.

Your login credentials:
  Email: ${to}
  Password: ${password}

Login here: ${APP_URL}/login

Please reset your password after your first login.

— QA Pulse`;

  const html = `
    <div style="font-family: sans-serif; max-width: 480px;">
      <h2 style="color: #4f46e5;">Welcome to QA Pulse</h2>
      <p>Hi ${name},</p>
      <p>You have been added to <strong>QA Pulse</strong> — BE/FE Lifecycle Tracking Tool.</p>
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>Email:</strong> ${to}</p>
        <p style="margin: 4px 0;"><strong>Password:</strong> ${password}</p>
      </div>
      <p><a href="${APP_URL}/login" style="color: #4f46e5;">Login to QA Pulse</a></p>
      <p style="color: #6b7280; font-size: 13px;">Please reset your password after your first login.</p>
    </div>`;

  try {
    await getTransporter().sendMail({ from: getFrom(), to, subject, text, html });
    return { success: true };
  } catch (err) {
    console.error(`Failed to send email to ${to}:`, err);
    return { success: false, error: String(err) };
  }
}

export async function sendPasswordResetEmail(to: string, name: string, token: string) {
  const APP_URL = getAppUrl();
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;
  const subject = "QA Pulse — Password Reset";
  const text = `Hi ${name},

You requested a password reset. Click the link below to set a new password:

${resetUrl}

This link expires in 1 hour. If you didn't request this, ignore this email.

— QA Pulse`;

  const html = `
    <div style="font-family: sans-serif; max-width: 480px;">
      <h2 style="color: #4f46e5;">Password Reset</h2>
      <p>Hi ${name},</p>
      <p>You requested a password reset. Click the button below to set a new password:</p>
      <p style="margin: 20px 0;">
        <a href="${resetUrl}" style="background: #4f46e5; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600;">
          Reset Password
        </a>
      </p>
      <p style="color: #6b7280; font-size: 13px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
    </div>`;

  try {
    await getTransporter().sendMail({ from: getFrom(), to, subject, text, html });
    return { success: true };
  } catch (err) {
    console.error(`Failed to send reset email to ${to}:`, err);
    return { success: false, error: String(err) };
  }
}
