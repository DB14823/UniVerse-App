import { requireRole, requireAnyRole } from "../../middleware/roleMiddleware";
import { mockRequest, mockResponse, mockNext } from "../helpers";

describe("requireRole", () => {
  it("returns 401 when req.user is missing (unauthenticated)", () => {
    const middleware = requireRole("STUDENT");
    const req = mockRequest();
    const res = mockResponse();

    middleware(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Not authenticated" });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("returns 403 when user role does not match required role", () => {
    const middleware = requireRole("ORGANISATION");
    const req = mockRequest({
      user: { id: "u1", email: "a@test.com", role: "STUDENT" },
    });
    const res = mockResponse();

    middleware(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: "Insufficient permissions",
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("calls next() when user role matches required role", () => {
    const middleware = requireRole("STUDENT");
    const req = mockRequest({
      user: { id: "u1", email: "a@test.com", role: "STUDENT" },
    });
    const res = mockResponse();

    middleware(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe("requireAnyRole", () => {
  it("returns 401 when req.user is missing", () => {
    const middleware = requireAnyRole(["STUDENT", "ORGANISATION"]);
    const req = mockRequest();
    const res = mockResponse();

    middleware(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 403 when role is not in the allowed list", () => {
    const middleware = requireAnyRole(["ORGANISATION"]);
    const req = mockRequest({
      user: { id: "u1", email: "a@test.com", role: "STUDENT" },
    });
    const res = mockResponse();

    middleware(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("calls next() when role is in the allowed list", () => {
    const middleware = requireAnyRole(["STUDENT", "ORGANISATION"]);
    const req = mockRequest({
      user: { id: "u1", email: "a@test.com", role: "ORGANISATION" },
    });
    const res = mockResponse();

    middleware(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });
});
