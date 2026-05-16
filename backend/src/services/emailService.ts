import nodemailer from "nodemailer";
import crypto from "crypto";
import { prisma } from "../utils/prisma";
import { config } from "../config";

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
}

// Strip CR/LF from email header fields to prevent header injection (CVE fix)
function sanitizeHeader(s: string): string {
  return s.replace(/[\r\n]/g, "");
}

export class EmailService {
  private static transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false,
    requireTLS: true,
    auth: {
      user: process.env.SMTP_USER || "",
      pass: process.env.SMTP_PASS || "",
    },
  });

  /**
   * Generate and send OTP to email. Persisted to DB so restarts don't lose pending OTPs.
   */
  static async sendOtp(email: string): Promise<void> {
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await prisma.user.update({
      where: { email },
      data: { pendingOtp: otp, otpExpiresAt: expiresAt },
    });

    if (process.env.NODE_ENV !== "production") {
      console.log(`\n[DEV] OTP for ${email}: ${otp}\n`);
    }

    if (config.email.user && config.email.pass) {
      try {
        await EmailService.transporter.sendMail({
          from: `"Ashnance 🔥" <${config.email.from}>`,
          to: sanitizeHeader(email),
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
      }
    }
  }

  /**
   * Verify OTP for an email. Reads from DB; clears OTP on success or max attempts.
   */
  static async verifyOtp(email: string, otp: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { pendingOtp: true, otpExpiresAt: true, otpAttempts: true },
    });

    if (!user?.pendingOtp || !user.otpExpiresAt) return false;

    if (user.otpExpiresAt < new Date()) {
      await prisma.user.update({
        where: { email },
        data: { pendingOtp: null, otpExpiresAt: null, otpAttempts: 0 },
      });
      return false;
    }

    const attempts = user.otpAttempts + 1;
    if (attempts > 5) {
      await prisma.user.update({
        where: { email },
        data: { pendingOtp: null, otpExpiresAt: null, otpAttempts: 0 },
      });
      return false;
    }

    // Use constant-time comparison to prevent timing attacks
    const storedBuf = Buffer.from(user.pendingOtp);
    const inputBuf  = Buffer.from(otp.slice(0, user.pendingOtp.length).padEnd(user.pendingOtp.length, "\0"));
    const match = storedBuf.length === inputBuf.length &&
      crypto.timingSafeEqual(storedBuf, inputBuf);

    if (!match) {
      await prisma.user.update({ where: { email }, data: { otpAttempts: attempts } });
      return false;
    }

    await prisma.user.update({
      where: { email },
      data: { pendingOtp: null, otpExpiresAt: null, otpAttempts: 0 },
    });
    return true;
  }

  /**
   * Send withdrawal confirmation email
   */
  static async sendWithdrawalAlert(email: string, amount: number, currency: string, address: string): Promise<void> {
    if (!config.email.user) return;

    const safeAmount   = escHtml(String(amount));
    const safeCurrency = escHtml(currency);
    const safeAddress  = escHtml(address);

    try {
      await EmailService.transporter.sendMail({
        from: `"Ashnance 🔥" <${config.email.from}>`,
        to: sanitizeHeader(email),
        subject: "Withdrawal Processed — Ashnance",
        html: `
          <div style="background:#080808;color:#F0E8DC;font-family:monospace;padding:40px;max-width:480px;margin:0 auto;border:1px solid #2A1F10;">
            <h1 style="font-family:sans-serif;color:#FF4D00;letter-spacing:4px;">WITHDRAWAL ALERT</h1>
            <p style="color:#27AE60;font-size:24px;font-weight:700;margin:16px 0;">${safeAmount} ${safeCurrency}</p>
            <p style="font-size:11px;color:#806050;letter-spacing:1px;">Sent to: ${safeAddress}</p>
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
    if (!config.email.user) return;

    const safeUsername = escHtml(username);
    const safeAmount   = escHtml(String(amount));
    const safeTier     = escHtml(tier);

    try {
      await EmailService.transporter.sendMail({
        from: `"Ashnance 🔥" <${config.email.from}>`,
        to: sanitizeHeader(email),
        subject: `YOU WON ${safeAmount} USDC — Ashnance`,
        html: `
          <div style="background:#080808;color:#F0E8DC;font-family:monospace;padding:40px;max-width:480px;margin:0 auto;border:1px solid #FFB800;">
            <h1 style="font-family:sans-serif;color:#FFB800;letter-spacing:4px;font-size:32px;">YOU WON!</h1>
            <p style="color:#F0E8DC;font-size:48px;font-weight:700;margin:16px 0;">${safeAmount} USDC</p>
            <p style="color:#806050;letter-spacing:2px;font-size:12px;">${safeTier} PRIZE · @${safeUsername}</p>
            <p style="font-size:11px;color:#806050;margin-top:24px;">Log in to Ashnance to claim your prize.</p>
          </div>
        `,
      });
    } catch (err) {
      console.error("Email send error:", err);
    }
  }

  /**
   * Send a CRITICAL alert to all owner emails.
   * Used for: withdrawal DB failure after on-chain success, partial owner withdrawal, etc.
   */
  static async sendCriticalAlert(subject: string, body: string): Promise<void> {
    const recipients = config.ownerEmails;
    if (!config.email.user || !recipients.length) return;

    const safeSubject = escHtml(subject);
    const safeBody    = escHtml(body);

    try {
      await EmailService.transporter.sendMail({
        from: `"Ashnance ALERT" <${config.email.from}>`,
        to: sanitizeHeader(recipients.join(",")),
        subject: `[CRITICAL] ${subject}`,
        html: `
          <div style="background:#1a0000;color:#ffcccc;font-family:monospace;padding:32px;max-width:600px;border:2px solid #cc0000;">
            <h2 style="color:#ff4444;margin:0 0 16px;">[CRITICAL] ${safeSubject}</h2>
            <pre style="font-size:13px;line-height:1.6;white-space:pre-wrap;word-break:break-all;">${safeBody}</pre>
            <p style="color:#ff8888;font-size:11px;margin-top:24px;">This requires immediate manual review.</p>
          </div>
        `,
      });
    } catch (err) {
      console.error("[EmailService] Failed to send critical alert:", err);
    }
  }

  /**
   * Send a low-balance warning to all owner emails.
   */
  static async sendLowBalanceAlert(asset: string, balance: number, threshold: number): Promise<void> {
    const recipients = config.ownerEmails;
    if (!config.email.user || !recipients.length) return;
    try {
      await EmailService.transporter.sendMail({
        from: `"Ashnance ALERT" <${config.email.from}>`,
        to: sanitizeHeader(recipients.join(",")),
        subject: `[WARNING] Master wallet ${asset} balance low`,
        html: `
          <div style="background:#1a1000;color:#ffe0aa;font-family:monospace;padding:32px;max-width:480px;border:2px solid #cc8800;">
            <h2 style="color:#ffaa00;margin:0 0 16px;">Low Balance Warning</h2>
            <p style="font-size:14px;">Master wallet <strong>${asset}</strong> balance has dropped below the alert threshold.</p>
            <table style="margin:16px 0;font-size:13px;">
              <tr><td style="padding:4px 16px 4px 0;color:#888;">Current balance:</td><td style="color:#ffaa00;font-weight:700;">${balance.toFixed(4)} ${asset}</td></tr>
              <tr><td style="padding:4px 16px 4px 0;color:#888;">Alert threshold:</td><td>${threshold} ${asset}</td></tr>
            </table>
            <p style="color:#cc8800;font-size:11px;">Top up the master wallet to avoid failed prize payouts or user withdrawals.</p>
          </div>
        `,
      });
    } catch (err) {
      console.error("[EmailService] Failed to send low balance alert:", err);
    }
  }
}
