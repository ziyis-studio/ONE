import { describe, expect, it } from "vitest";
import { authProblem } from "../src/lib/auth-feedback";

describe("authentication provider messages", () => {
  it("gives actionable rate-limit, confirmation, network and fallback advice without exposing provider text", () => {
    expect(authProblem({ status: 429 })).toContain("Wait a minute");
    expect(authProblem({ code: "email_not_confirmed" })).toContain(
      "Confirm your email",
    );
    expect(authProblem(new TypeError("Failed to fetch"))).toContain(
      "Check your connection",
    );
    expect(authProblem(new Error("database says user <private> exists"))).toBe(
      "We couldn’t complete that request. Please try again in a moment.",
    );
    expect(authProblem({ code: "same_password" })).toContain(
      "different password",
    );
  });
});
