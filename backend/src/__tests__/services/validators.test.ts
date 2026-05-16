/**
 * Input Validation Tests (§6.2, §6.10)
 *
 * Tests Zod schemas for boundary conditions, negative values,
 * NaN/Infinity, and oversized inputs.
 */

import {
  burnSchema,
  depositSchema,
  withdrawSchema,
  registerSchema,
  otpVerifySchema,
} from "../../utils/validators";

describe("burnSchema", () => {
  test("valid $5 burn accepted", () => {
    expect(() => burnSchema.parse({ amount: 5 })).not.toThrow();
  });

  test("below $5 minimum rejected", () => {
    expect(() => burnSchema.parse({ amount: 4.99 })).toThrow();
  });

  test("exactly $5 accepted", () => {
    expect(() => burnSchema.parse({ amount: 5.0 })).not.toThrow();
  });

  test("above $10000 max rejected", () => {
    expect(() => burnSchema.parse({ amount: 10001 })).toThrow();
  });

  test("exactly $10000 accepted", () => {
    expect(() => burnSchema.parse({ amount: 10000 })).not.toThrow();
  });

  test("negative amount rejected", () => {
    expect(() => burnSchema.parse({ amount: -100 })).toThrow();
  });

  test("zero rejected", () => {
    expect(() => burnSchema.parse({ amount: 0 })).toThrow();
  });

  test("NaN rejected", () => {
    expect(() => burnSchema.parse({ amount: NaN })).toThrow();
  });

  test("Infinity rejected", () => {
    expect(() => burnSchema.parse({ amount: Infinity })).toThrow();
  });

  test("Number.MAX_SAFE_INTEGER rejected (above max_burn_amount)", () => {
    expect(() => burnSchema.parse({ amount: Number.MAX_SAFE_INTEGER })).toThrow();
  });

  test("string amount rejected", () => {
    expect(() => burnSchema.parse({ amount: "100" })).toThrow();
  });
});

describe("withdrawSchema", () => {
  const validWithdraw = {
    amount: 10,
    address: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    twoFaCode: "123456",
  };

  test("valid withdrawal accepted", () => {
    expect(() => withdrawSchema.parse(validWithdraw)).not.toThrow();
  });

  test("negative amount rejected", () => {
    expect(() => withdrawSchema.parse({ ...validWithdraw, amount: -10 })).toThrow();
  });

  test("below $10 minimum rejected", () => {
    expect(() => withdrawSchema.parse({ ...validWithdraw, amount: 9.99 })).toThrow();
  });

  test("zero rejected", () => {
    expect(() => withdrawSchema.parse({ ...validWithdraw, amount: 0 })).toThrow();
  });

  test("NaN amount rejected", () => {
    expect(() => withdrawSchema.parse({ ...validWithdraw, amount: NaN })).toThrow();
  });

  test("Infinity amount rejected", () => {
    expect(() => withdrawSchema.parse({ ...validWithdraw, amount: Infinity })).toThrow();
  });

  test("5-digit OTP code rejected (must be 6)", () => {
    expect(() => withdrawSchema.parse({ ...validWithdraw, twoFaCode: "12345" })).toThrow();
  });

  test("7-digit OTP code rejected (must be 6)", () => {
    expect(() => withdrawSchema.parse({ ...validWithdraw, twoFaCode: "1234567" })).toThrow();
  });

  test("short address rejected (min 32)", () => {
    expect(() => withdrawSchema.parse({ ...validWithdraw, address: "short" })).toThrow();
  });
});

describe("depositSchema", () => {
  const validDeposit = { amount: 10, txHash: "validhash123" };

  test("valid deposit accepted", () => {
    expect(() => depositSchema.parse(validDeposit)).not.toThrow();
  });

  test("negative amount rejected", () => {
    expect(() => depositSchema.parse({ ...validDeposit, amount: -1 })).toThrow();
  });

  test("zero amount rejected", () => {
    expect(() => depositSchema.parse({ ...validDeposit, amount: 0 })).toThrow();
  });

  test("NaN amount rejected", () => {
    expect(() => depositSchema.parse({ ...validDeposit, amount: NaN })).toThrow();
  });

  test("empty txHash rejected", () => {
    expect(() => depositSchema.parse({ ...validDeposit, txHash: "" })).toThrow();
  });
});

describe("registerSchema", () => {
  const validUser = { email: "test@example.com", username: "TestUser1", password: "password123" };

  test("valid registration accepted", () => {
    expect(() => registerSchema.parse(validUser)).not.toThrow();
  });

  test("password below 8 chars rejected", () => {
    expect(() => registerSchema.parse({ ...validUser, password: "short" })).toThrow();
  });

  test("password exactly 8 chars accepted", () => {
    expect(() => registerSchema.parse({ ...validUser, password: "12345678" })).not.toThrow();
  });

  test("password exactly 256 chars accepted", () => {
    const p256 = "a".repeat(256);
    expect(() => registerSchema.parse({ ...validUser, password: p256 })).not.toThrow();
  });

  test("password 257 chars rejected (bcrypt DoS protection)", () => {
    const p257 = "a".repeat(257);
    expect(() => registerSchema.parse({ ...validUser, password: p257 })).toThrow();
  });

  test("no password accepted (OAuth/wallet users)", () => {
    expect(() => registerSchema.parse({ email: "test@example.com", username: "TestUser1" })).not.toThrow();
  });

  test("invalid email rejected", () => {
    expect(() => registerSchema.parse({ ...validUser, email: "not-an-email" })).toThrow();
  });

  test("username too short (< 3) rejected", () => {
    expect(() => registerSchema.parse({ ...validUser, username: "ab" })).toThrow();
  });

  test("username too long (> 20) rejected", () => {
    expect(() => registerSchema.parse({ ...validUser, username: "a".repeat(21) })).toThrow();
  });

  test("username with special chars rejected", () => {
    expect(() => registerSchema.parse({ ...validUser, username: "test user" })).toThrow();
    expect(() => registerSchema.parse({ ...validUser, username: "test@user" })).toThrow();
  });

  test("username with underscore accepted", () => {
    expect(() => registerSchema.parse({ ...validUser, username: "test_user" })).not.toThrow();
  });
});

describe("otpVerifySchema", () => {
  test("valid 6-digit OTP accepted", () => {
    expect(() => otpVerifySchema.parse({ email: "test@example.com", otp: "123456" })).not.toThrow();
  });

  test("5-digit OTP rejected", () => {
    expect(() => otpVerifySchema.parse({ email: "test@example.com", otp: "12345" })).toThrow();
  });

  test("7-digit OTP rejected", () => {
    expect(() => otpVerifySchema.parse({ email: "test@example.com", otp: "1234567" })).toThrow();
  });
});
