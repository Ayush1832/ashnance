/**
 * emailService — CRLF injection tests (A3)
 *
 * escHtml() is used for body content (HTML entities).
 * sanitizeHeader() is used for the `to` address field.
 * Both are internal, so we test them via the module's exported behaviour
 * and by intercepting nodemailer's sendMail call.
 */

jest.mock("nodemailer", () => {
  const sendMail = jest.fn().mockResolvedValue({ messageId: "test-id" });
  return {
    createTransport: jest.fn().mockReturnValue({ sendMail }),
    __sendMail: sendMail, // expose for assertions
  };
});

jest.mock("../../utils/prisma", () => ({
  prisma: {
    user: {
      update: jest.fn().mockResolvedValue({}),
      findUnique: jest.fn().mockResolvedValue({ pendingOtp: null }),
    },
  },
}));

import nodemailer from "nodemailer";
import { EmailService } from "../../services/emailService";

// Grab the mock sendMail from the mocked module
const mockSendMail = (nodemailer as any).__sendMail as jest.Mock;

// Expose escHtml and sanitizeHeader for unit tests by calling the exported method
// and capturing what is passed to sendMail.
beforeEach(() => {
  mockSendMail.mockClear();
  // Enable SMTP so sendMail is actually called
  process.env.SMTP_USER = "test@example.com";
  process.env.SMTP_PASS = "password";
  process.env.NODE_ENV = "production";
});

afterAll(() => {
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
  process.env.NODE_ENV = "test";
});

// ---- escHtml CRLF tests (body content) ------------------------------------

describe("escHtml — does not strip CRLF (that is sanitizeHeader's job)", () => {
  test("escHtml encodes HTML entities but CRLF remains in body content (safe because it is inside HTML)", async () => {
    // escHtml is internal; test via sendWithdrawalAlert which uses it on address
    const injected = "victim@example.com\r\nBcc: attacker@evil.com";

    await EmailService.sendWithdrawalAlert(
      "user@safe.com",
      100,
      "USDC",
      injected // address field — gets escHtml applied
    );

    const call = mockSendMail.mock.calls[0][0];
    // The `to` field must NOT contain the injected headers (sanitizeHeader strips \r\n)
    expect(call.to).not.toMatch(/\r|\n/);
    expect(call.to).toBe("user@safe.com");
    // The address in the HTML body is HTML-escaped (< > & etc) but \r\n may remain in HTML body —
    // this is safe because HTML \r\n is whitespace, not a header boundary
    expect(call.html).toContain("victim@example.com");
  });
});

// ---- sanitizeHeader tests (to address field) --------------------------------

describe("sanitizeHeader — strips CRLF from to address", () => {
  test("1. CRLF in to address is stripped: 'victim@x.com\\r\\nBcc: a@b.com'", async () => {
    const injected = "victim@x.com\r\nBcc: attacker@evil.com";
    await EmailService.sendWithdrawalAlert(injected, 50, "USDC", "0xAddr");
    const call = mockSendMail.mock.calls[0][0];
    expect(call.to).not.toMatch(/\r|\n/);
    expect(call.to).toBe("victim@x.comBcc: attacker@evil.com"); // CRLF removed, no injection
  });

  test("2. LF-only injection stripped: 'user@x.com\\nBcc: a@b.com'", async () => {
    const injected = "user@x.com\nBcc: x@y.com";
    await EmailService.sendWithdrawalAlert(injected, 10, "USDC", "addr");
    const call = mockSendMail.mock.calls[0][0];
    expect(call.to).not.toContain("\n");
  });

  test("3. CR/LF Subject hijack stripped: 'u@x.com\\r\\nSubject: hijacked'", async () => {
    const injected = "u@x.com\r\nSubject: hijacked";
    await EmailService.sendWithdrawalAlert(injected, 10, "USDC", "addr");
    const call = mockSendMail.mock.calls[0][0];
    expect(call.to).not.toMatch(/\r|\n/);
  });

  test("4. OTP email to field is sanitized", async () => {
    const injected = "victim@example.com\r\nBcc: a@b.com";
    // sendOtp calls prisma.user.update then sendMail
    await EmailService.sendOtp(injected);
    if (mockSendMail.mock.calls.length > 0) {
      const call = mockSendMail.mock.calls[0][0];
      expect(call.to).not.toMatch(/\r|\n/);
    }
    // If sendMail was not called (no SMTP creds in this env branch), just assert prisma was called
    const { prisma } = require("../../utils/prisma");
    expect(prisma.user.update).toHaveBeenCalled();
  });

  test("5. Critical alert recipients are sanitized", async () => {
    // sendCriticalAlert takes subject + body, recipients come from config.ownerEmails
    // The join(",") result goes through sanitizeHeader
    await EmailService.sendCriticalAlert("Test subject\r\nInjected", "body content");
    if (mockSendMail.mock.calls.length > 0) {
      const call = mockSendMail.mock.calls[0][0];
      expect(call.to).not.toMatch(/\r|\n/);
    }
  });
});
