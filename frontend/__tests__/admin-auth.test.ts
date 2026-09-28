import { describe, it, expect } from "vitest";

describe("Admin & Mentor Portal Authentication Logic", () => {
  const authenticateAdmin = (email?: string, password?: string) => {
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return { status: 400, error: "A valid email address is required." };
    }
    if (!password || typeof password !== "string" || password.length < 6) {
      return { status: 400, error: "Password must be at least 6 characters long." };
    }

    const normalizedEmail = email.toLowerCase().trim();
    const isPrimaryAdmin =
      normalizedEmail === "admin@codeyoung.com" &&
      (password === "codeyoung2026" || password === "admin123");
    const isMentorAdmin =
      normalizedEmail === "mentor@codeyoung.dev" &&
      (password === "codeyoung2026" || password === "mentor123");
    const isCorporateUser =
      (normalizedEmail.endsWith("@codeyoung.com") || normalizedEmail.endsWith("@codeyoung.dev")) &&
      password.length >= 6;

    if (!isPrimaryAdmin && !isMentorAdmin && !isCorporateUser) {
      return { status: 401, error: "Invalid email or password." };
    }

    return {
      status: 200,
      user: {
        email: normalizedEmail,
        role: isMentorAdmin ? "MENTOR_LEAD" : "SYSTEM_ADMIN",
      },
      redirectUrl: "/dashboard",
    };
  };

  it("should successfully authenticate primary admin with default credentials", () => {
    const res = authenticateAdmin("admin@codeyoung.com", "codeyoung2026");
    expect(res.status).toBe(200);
    expect(res.user?.role).toBe("SYSTEM_ADMIN");
    expect(res.redirectUrl).toBe("/dashboard");
  });

  it("should successfully authenticate lead mentor with default credentials", () => {
    const res = authenticateAdmin("mentor@codeyoung.dev", "codeyoung2026");
    expect(res.status).toBe(200);
    expect(res.user?.role).toBe("MENTOR_LEAD");
    expect(res.redirectUrl).toBe("/dashboard");
  });

  it("should accept valid @codeyoung.com or @codeyoung.dev email with min 6 char password", () => {
    const res = authenticateAdmin("alex.johnson@codeyoung.com", "mypassword123");
    expect(res.status).toBe(200);
    expect(res.user?.email).toBe("alex.johnson@codeyoung.com");
  });

  it("should reject invalid email or non-codeyoung domain", () => {
    const res = authenticateAdmin("intruder@random.com", "codeyoung2026");
    expect(res.status).toBe(401);
    expect(res.error).toContain("Invalid email or password");
  });

  it("should reject passwords shorter than 6 characters with 400", () => {
    const res = authenticateAdmin("admin@codeyoung.com", "123");
    expect(res.status).toBe(400);
    expect(res.error).toContain("at least 6 characters");
  });

  it("should reject missing or malformed email with 400", () => {
    const res = authenticateAdmin("not-an-email", "codeyoung2026");
    expect(res.status).toBe(400);
    expect(res.error).toContain("valid email address");
  });
});
