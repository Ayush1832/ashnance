import nodemailer from "nodemailer";
import crypto from "crypto";
import { prisma } from "../utils/prisma";

// In-memory OTP store (use Redis in production)
const otpStore = new Map<string, { otp: string; expiresAt: Date; attempts: number }>();

export class EmailService {
  private static transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false,
    auth: {
      user: process.env.SMTP_USER || "",
      pass: process.env.SMTP_PASS || "",
    },
  });

  /**
   * Generate and send OTP to email
   */
  static async sendOtp(email: string): Promise<void> {
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    otpStore.set(email, { otp, expiresAt, attempts: 0 });

    // In dev/test, log OTP to console
    if (process.env.NODE_ENV !== "production") {
      console.log(`\n[DEV] OTP for ${email}: ${otp}\n`);
    }

    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        await EmailService.transporter.sendMail({
          from: `"Ashnance 🔥" <${process.env.SMTP_USER}>`,
          to: email,
          subject: "Your Ashnance Login Code",
          html: `
            <div style="background:#080808;color:#F0E8DC;font-family:monospace;padding:40px;max-width:480px;margin:0 auto;border:1px solid #2A1F10;">
              <h1 style="font-family:sans-serif;color:#FF4D00;letter-spacing:4px;margin-bottom:8px;">ASHNANCE</h1>
              <p style="color:#806050;font-size:12px;letter-spacing:2px;margin-bottom:32px;">BURN TO WIN</p>
              <p style="font-size:14px;color:#888;letter-spacing:1px;margin-bottom:16px;">YOUR VERIFICATION CODE</p>
              <div style="background:#161008;border:1px solid #2A1F10;padding:24px;text-align:center;font-size:48px;letter-spacing:16px;color:#FFB800;font-weight:700;margin-bottom:24px;">
                ${otp}
              </div>
              <p style="font-size:11px;color:#806050;letter-spacing:1px;line-height:1.8;">
                This code expires in 10 minutes. Do not share it with anyone.<br>
                If you did not request this code, ignore this email.
              </p>
            </div>
          `,
        });
      } catch (err) {
        console.error("Email send error:", err);
        // Fall through — OTP is still in memory for dev testing
      }
    }
  }

  /**
   * Verify OTP for an email
   */
  static verifyOtp(email: string, otp: string): boolean {
    const stored = otpStore.get(email);
    if (!stored) return false;

    // Expired
    if (stored.expiresAt < new Date()) {
      otpStore.delete(email);
      return false;
    }

    // Too many attempts
    stored.attempts++;
    if (stored.attempts > 5) {
      otpStore.delete(email);
      return false;
    }

    if (stored.otp !== otp) return false;

    // Valid — remove from store
    otpStore.delete(email);
    return true;
  }

  /**
   * Send withdrawal confirmation email
   */
  static async sendWithdrawalAlert(email: string, amount: number, currency: string, address: string): Promise<void> {
    if (!process.env.SMTP_USER) return;

    try {
      await EmailService.transporter.sendMail({
        from: `"Ashnance 🔥" <${process.env.SMTP_USER}>`,
        to: email,
        subject: "Withdrawal Processed — Ashnance",
        html: `
          <div style="background:#080808;color:#F0E8DC;font-family:monospace;padding:40px;max-width:480px;margin:0 auto;border:1px solid #2A1F10;">
            <h1 style="font-family:sans-serif;color:#FF4D00;letter-spacing:4px;">WITHDRAWAL ALERT</h1>
            <p style="color:#27AE60;font-size:24px;font-weight:700;margin:16px 0;">${amount} ${currency}</p>
            <p style="font-size:11px;color:#806050;letter-spacing:1px;">Sent to: ${address}</p>
          </div>
        `,
      });
    } catch (err) {
      console.error("Email send error:", err);
    }
  }

  /**
   * Send win celebration email
   */
  static async sendWinEmail(email: string, username: string, amount: number, tier: string): Promise<void> {
    if (!process.env.SMTP_USER) return;

    try {
      await EmailService.transporter.sendMail({
        from: `"Ashnance 🔥" <${process.env.SMTP_USER}>`,
        to: email,
        subject: `🏆 YOU WON ${amount} USDC — Ashnance`,
        html: `
          <div style="background:#080808;color:#F0E8DC;font-family:monospace;padding:40px;max-width:480px;margin:0 auto;border:1px solid #FFB800;">
            <h1 style="font-family:sans-serif;color:#FFB800;letter-spacing:4px;font-size:32px;">YOU WON!</h1>
            <p style="color:#F0E8DC;font-size:48px;font-weight:700;margin:16px 0;">${amount} USDC</p>
            <p style="color:#806050;letter-spacing:2px;font-size:12px;">${tier} PRIZE · @${username}</p>
            <p style="font-size:11px;color:#806050;margin-top:24px;">Log in to Ashnance to claim your prize.</p>
          </div>
        `,
      });
    } catch (err) {
      console.error("Email send error:", err);
    }
  }
}
