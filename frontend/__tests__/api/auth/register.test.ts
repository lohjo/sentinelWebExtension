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
  registerUser: jest.fn(),
  AuthError,
}));

import { POST } from "@/app/api/auth/register/route";
import { registerUser } from "@/lib/services/auth.service";
const mockRegister = registerUser as jest.Mock;

function makeRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeInvalidJsonRequest(): Request {
  return new Request("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "not json{{{",
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("POST /api/auth/register", () => {
  it("returns 201 with user and token on success", async () => {
    const mockResult = {
      user: { id: "uuid-1", email: "test@example.com", displayName: null },
      token: "jwt-token",
    };
    mockRegister.mockResolvedValue(mockResult);

    const response = await POST(
      makeRequest({ email: "test@example.com", password: "password123" })
    );
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.user.email).toBe("test@example.com");
    expect(data.token).toBe("jwt-token");
  });

  it("returns 400 for validation errors (invalid email)", async () => {
    const response = await POST(
      makeRequest({ email: "bad-email", password: "password123" })
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation failed");
    expect(data.details).toBeDefined();
  });

  it("returns 400 for validation errors (short password)", async () => {
    const response = await POST(
      makeRequest({ email: "test@example.com", password: "short" })
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 for validation errors (missing fields)", async () => {
    const response = await POST(makeRequest({}));

    expect(response.status).toBe(400);
  });

  it("returns 409 when email already exists", async () => {
    mockRegister.mockRejectedValue(
      new AuthError("Email already registered", 409)
    );

    const response = await POST(
      makeRequest({ email: "exists@example.com", password: "password123" })
    );
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe("Email already registered");
  });

  it("returns 400 for invalid JSON body", async () => {
    const response = await POST(makeInvalidJsonRequest());
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid JSON body");
  });

  it("returns 500 for unexpected errors", async () => {
    mockRegister.mockRejectedValue(new Error("DB connection failed"));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    const response = await POST(
      makeRequest({ email: "test@example.com", password: "password123" })
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
    consoleSpy.mockRestore();
  });

  it("calls registerUser with validated input", async () => {
    mockRegister.mockResolvedValue({
      user: { id: "uuid", email: "test@example.com", displayName: "Name" },
      token: "tok",
    });

    await POST(
      makeRequest({
        email: "test@example.com",
        password: "password123",
        displayName: "Name",
      })
    );

    expect(mockRegister).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "password123",
      displayName: "Name",
    });
  });

  it("does not call registerUser if validation fails", async () => {
    await POST(makeRequest({ email: "bad", password: "x" }));

    expect(mockRegister).not.toHaveBeenCalled();
  });
});
