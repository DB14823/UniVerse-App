import jwt from "jsonwebtoken";
import { authMiddleware } from "../../middleware/authMiddleware";
import { mockRequest, mockResponse, mockNext } from "../helpers";

const SECRET = "test-secret-for-jest";

describe("authMiddleware", () => {
  it("returns 401 when Authorization header is missing", () => {
    const req = mockRequest({ headers: {} });
    const res = mockResponse();

    authMiddleware(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "Missing authorization header",
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("returns 401 when Bearer token is empty", () => {
    const req = mockRequest({
      headers: { authorization: "Bearer " },
    });
    const res = mockResponse();

    authMiddleware(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Missing token" });
  });

  it("attaches decoded payload and calls next() for a valid Bearer token", () => {
    const payload = {
      id: "user1",
      email: "a@test.com",
      role: "STUDENT" as const,
    };
    const token = jwt.sign(payload, SECRET);

    const req = mockRequest({
      headers: { authorization: `Bearer ${token}` },
    });
    const res = mockResponse();

    authMiddleware(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(req.user).toMatchObject(payload);
  });

  it("accepts a raw token without 'Bearer ' prefix", () => {
    const payload = {
      id: "user2",
      email: "b@test.com",
      role: "ORGANISATION" as const,
    };
    const token = jwt.sign(payload, SECRET);

    const req = mockRequest({ headers: { authorization: token } });
    const res = mockResponse();

    authMiddleware(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(req.user).toMatchObject(payload);
  });

  it("returns 401 with 'Token expired' for an expired token", () => {
    const token = jwt.sign(
      { id: "u1", email: "x@x.com", role: "STUDENT" },
      SECRET,
      {
        expiresIn: -1,
      },
    );

    const req = mockRequest({
      headers: { authorization: `Bearer ${token}` },
    });
    const res = mockResponse();

    authMiddleware(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Token expired" });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("returns 403 with 'Invalid token' for a tampered token", () => {
    const req = mockRequest({
      headers: { authorization: "Bearer this.is.not.a.valid.jwt" },
    });
    const res = mockResponse();

    authMiddleware(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid token" });
    expect(mockNext).not.toHaveBeenCalled();
  });
});
