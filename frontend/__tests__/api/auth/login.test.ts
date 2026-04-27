class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "AuthError";
  }
}

jest.mock("@/lib/services/auth.service", () => ({
  loginUser: jest.fn(),
  AuthError,
}));

import { POST } from "@/app/api/auth/login/route";
import { loginUser } from "@/lib/services/auth.service";
const mockLogin = loginUser as jest.Mock;

function makeRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeInvalidJsonRequest(): Request {
  return new Request("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "not json{{{",
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("POST /api/auth/login", () => {
  it("returns 200 with user and token on success", async () => {
    const mockResult = {
      user: {
        id: "uuid-1",
        email: "test@example.com",
        displayName: "Test User",
      },
      token: "jwt-token",
    };
    mockLogin.mockResolvedValue(mockResult);

    const response = await POST(
      makeRequest({ email: "test@example.com", password: "password123" })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.user.email).toBe("test@example.com");
    expect(data.token).toBe("jwt-token");
  });

  it("returns 401 for invalid credentials", async () => {
    mockLogin.mockRejectedValue(
      new AuthError("Invalid email or password", 401)
    );

    const response = await POST(
      makeRequest({ email: "test@example.com", password: "wrongpass" })
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Invalid email or password");
  });

  it("returns 400 for validation errors (invalid email)", async () => {
    const response = await POST(
      makeRequest({ email: "not-email", password: "password123" })
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation failed");
  });

  it("returns 400 for validation errors (empty password)", async () => {
    const response = await POST(
      makeRequest({ email: "test@example.com", password: "" })
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 for missing fields", async () => {
    const response = await POST(makeRequest({}));

    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid JSON body", async () => {
    const response = await POST(makeInvalidJsonRequest());
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid JSON body");
  });

  it("returns 500 for unexpected errors", async () => {
    mockLogin.mockRejectedValue(new Error("DB connection failed"));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    const response = await POST(
      makeRequest({ email: "test@example.com", password: "password123" })
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
    consoleSpy.mockRestore();
  });

  it("calls loginUser with validated input", async () => {
    mockLogin.mockResolvedValue({
      user: { id: "uuid", email: "test@example.com", displayName: null },
      token: "tok",
    });

    await POST(
      makeRequest({ email: "test@example.com", password: "password123" })
    );

    expect(mockLogin).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "password123",
    });
  });

  it("does not call loginUser if validation fails", async () => {
    await POST(makeRequest({ email: "bad", password: "" }));

    expect(mockLogin).not.toHaveBeenCalled();
  });
});
