import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import authRouter from "../../routes/auth";
import prisma from "../../utils/prisma";

jest.mock("../../utils/prisma");
jest.mock("../../services/imageUpload", () => ({
  uploadImage: jest
    .fn()
    .mockResolvedValue({ url: "https://cdn.example.com/img.jpg" }),
  deleteImage: jest.fn().mockResolvedValue(undefined),
  extractPublicIdFromUrl: jest.fn().mockReturnValue("public-id"),
}));
jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("hashed_password"),
  compare: jest.fn(),
}));

import bcrypt from "bcryptjs";

const db = prisma as jest.Mocked<typeof prisma>;
const mockCompare = bcrypt.compare as jest.Mock;

const SECRET = process.env.JWT_SECRET!;

// Build a minimal Express app for route testing
const app = express();
app.use(express.json({ limit: "10mb" }));
app.use("/auth", authRouter);

// ---------------------------------------------------------------------------
// POST /auth/register-student
// ---------------------------------------------------------------------------
describe("POST /auth/register-student", () => {
  it("returns 400 when required fields are missing", async () => {
    const res = await request(app)
      .post("/auth/register-student")
      .send({ email: "a@test.com" }); // missing username and password

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Missing/);
  });

  it("returns 400 when email is already registered", async () => {
    (db.student.findUnique as jest.Mock).mockResolvedValueOnce({
      id: "existing",
    });
    (db.organisation.findUnique as jest.Mock).mockResolvedValueOnce(null);

    const res = await request(app).post("/auth/register-student").send({
      email: "taken@test.com",
      username: "user1",
      password: "pass123",
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Email already exists/);
  });

  it("returns 400 when username is already taken", async () => {
    (db.student.findUnique as jest.Mock)
      .mockResolvedValueOnce(null) // email check (student)
      .mockResolvedValueOnce({ id: "existing" }); // username check
    (db.organisation.findUnique as jest.Mock).mockResolvedValueOnce(null); // email check (org)

    const res = await request(app).post("/auth/register-student").send({
      email: "new@test.com",
      username: "taken_username",
      password: "pass123",
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Username already exists/);
  });

  it("returns 201 with token and user on success", async () => {
    const newStudent = {
      id: "stu1",
      email: "new@test.com",
      username: "newuser",
      name: null,
      createdAt: new Date(),
      profileImageUrl: null,
      password: "hashed_password",
    };

    // emailExists → Promise.all([student.findUnique, org.findUnique])
    (db.student.findUnique as jest.Mock)
      .mockResolvedValueOnce(null) // email check (emailExists)
      .mockResolvedValueOnce(null); // username uniqueness check
    (db.organisation.findUnique as jest.Mock).mockResolvedValueOnce(null); // email check (emailExists)
    (db.student.create as jest.Mock).mockResolvedValue(newStudent);

    const res = await request(app).post("/auth/register-student").send({
      email: "new@test.com",
      username: "newuser",
      password: "pass123",
    });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe("new@test.com");
    expect(res.body.user.role).toBe("STUDENT");
    expect(res.body.user).not.toHaveProperty("password");
  });
});

// ---------------------------------------------------------------------------
// POST /auth/register-org
// ---------------------------------------------------------------------------
describe("POST /auth/register-org", () => {
  it("returns 400 when required fields are missing", async () => {
    const res = await request(app)
      .post("/auth/register-org")
      .send({ email: "org@test.com" }); // missing password, name, location

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Missing/);
  });

  it("returns 201 with token and org user on success", async () => {
    const newOrg = {
      id: "org1",
      email: "org@test.com",
      name: "Test Society",
      location: "Plymouth",
      createdAt: new Date(),
      profileImageUrl: null,
      evidenceImageUrl: null,
      password: "hashed_password",
    };

    (db.student.findUnique as jest.Mock).mockResolvedValueOnce(null);
    (db.organisation.findUnique as jest.Mock).mockResolvedValueOnce(null);
    (db.organisation.create as jest.Mock).mockResolvedValue(newOrg);

    const res = await request(app).post("/auth/register-org").send({
      email: "org@test.com",
      password: "pass123",
      name: "Test Society",
      location: "Plymouth",
    });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe("ORGANISATION");
    expect(res.body.user).not.toHaveProperty("password");
  });
});

// ---------------------------------------------------------------------------
// POST /auth/login-student
// ---------------------------------------------------------------------------
describe("POST /auth/login-student", () => {
  it("returns 400 when credentials are missing", async () => {
    const res = await request(app).post("/auth/login-student").send({});
    expect(res.status).toBe(400);
  });

  it("returns 404 when student does not exist", async () => {
    (db.student.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post("/auth/login-student")
      .send({ email: "ghost@test.com", password: "pass" });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it("returns 401 when password is incorrect", async () => {
    (db.student.findUnique as jest.Mock).mockResolvedValue({
      id: "stu1",
      email: "s@test.com",
      password: "hashed",
    });
    mockCompare.mockResolvedValue(false);

    const res = await request(app)
      .post("/auth/login-student")
      .send({ email: "s@test.com", password: "wrong" });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Invalid password/);
  });

  it("returns 200 with token on successful login", async () => {
    const student = {
      id: "stu1",
      email: "s@test.com",
      username: "stu1",
      name: "Stu",
      createdAt: new Date(),
      profileImageUrl: null,
      password: "hashed",
    };
    (db.student.findUnique as jest.Mock).mockResolvedValue(student);
    mockCompare.mockResolvedValue(true);

    const res = await request(app)
      .post("/auth/login-student")
      .send({ email: "s@test.com", password: "correct" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe("STUDENT");
  });
});

// ---------------------------------------------------------------------------
// POST /auth/login-org
// ---------------------------------------------------------------------------
describe("POST /auth/login-org", () => {
  it("returns 404 when org does not exist", async () => {
    (db.organisation.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post("/auth/login-org")
      .send({ email: "ghost@test.com", password: "pass" });

    expect(res.status).toBe(404);
  });

  it("returns 200 with token on successful org login", async () => {
    const org = {
      id: "org1",
      email: "org@test.com",
      name: "Society",
      location: "Plymouth",
      createdAt: new Date(),
      profileImageUrl: null,
      evidenceImageUrl: null,
      password: "hashed",
    };
    (db.organisation.findUnique as jest.Mock).mockResolvedValue(org);
    mockCompare.mockResolvedValue(true);

    const res = await request(app)
      .post("/auth/login-org")
      .send({ email: "org@test.com", password: "correct" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe("ORGANISATION");
  });
});

// ---------------------------------------------------------------------------
// GET /auth/me
// ---------------------------------------------------------------------------
describe("GET /auth/me", () => {
  it("returns 401 when no token is provided", async () => {
    const res = await request(app).get("/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns the authenticated student's profile", async () => {
    const student = {
      id: "stu1",
      email: "s@test.com",
      username: "stu1",
      name: "Student One",
      createdAt: new Date(),
      profileImageUrl: null,
    };
    (db.student.findUnique as jest.Mock).mockResolvedValue(student);

    const token = jwt.sign(
      { id: "stu1", email: "s@test.com", role: "STUDENT" },
      SECRET,
    );

    const res = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("s@test.com");
    expect(res.body.user.role).toBe("STUDENT");
  });

  it("returns the authenticated organisation's profile", async () => {
    const org = {
      id: "org1",
      email: "org@test.com",
      name: "Society",
      location: "Plymouth",
      createdAt: new Date(),
      profileImageUrl: null,
      evidenceImageUrl: null,
    };
    (db.organisation.findUnique as jest.Mock).mockResolvedValue(org);

    const token = jwt.sign(
      { id: "org1", email: "org@test.com", role: "ORGANISATION" },
      SECRET,
    );

    const res = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe("ORGANISATION");
  });
});

// ---------------------------------------------------------------------------
// PUT /auth/password
// ---------------------------------------------------------------------------
describe("PUT /auth/password", () => {
  it("returns 401 when not authenticated", async () => {
    const res = await request(app).put("/auth/password").send({
      currentPassword: "old",
      newPassword: "new",
      confirmPassword: "new",
    });
    expect(res.status).toBe(401);
  });

  it("returns 400 when new passwords do not match", async () => {
    const token = jwt.sign(
      { id: "stu1", email: "s@test.com", role: "STUDENT" },
      SECRET,
    );

    const res = await request(app)
      .put("/auth/password")
      .set("Authorization", `Bearer ${token}`)
      .send({
        currentPassword: "old",
        newPassword: "abc",
        confirmPassword: "xyz",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/do not match/);
  });

  it("returns 401 when current password is wrong", async () => {
    (db.student.findUnique as jest.Mock).mockResolvedValue({
      id: "stu1",
      password: "hashed",
    });
    mockCompare.mockResolvedValue(false);

    const token = jwt.sign(
      { id: "stu1", email: "s@test.com", role: "STUDENT" },
      SECRET,
    );

    const res = await request(app)
      .put("/auth/password")
      .set("Authorization", `Bearer ${token}`)
      .send({
        currentPassword: "wrong",
        newPassword: "new123",
        confirmPassword: "new123",
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/incorrect/);
  });

  it("updates password and returns success", async () => {
    (db.student.findUnique as jest.Mock).mockResolvedValue({
      id: "stu1",
      password: "hashed",
    });
    mockCompare.mockResolvedValue(true);
    (db.student.update as jest.Mock).mockResolvedValue({});

    const token = jwt.sign(
      { id: "stu1", email: "s@test.com", role: "STUDENT" },
      SECRET,
    );

    const res = await request(app)
      .put("/auth/password")
      .set("Authorization", `Bearer ${token}`)
      .send({
        currentPassword: "correct",
        newPassword: "new123",
        confirmPassword: "new123",
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Password updated");
  });
});

// ---------------------------------------------------------------------------
// GET /auth/user/:userId
// ---------------------------------------------------------------------------
describe("GET /auth/user/:userId", () => {
  it("returns 401 when no token is provided", async () => {
    const res = await request(app).get("/auth/user/stu1");
    expect(res.status).toBe(401);
  });

  it("returns a student profile when userId belongs to a student", async () => {
    const student = {
      id: "stu1",
      email: "s@test.com",
      username: "stu1",
      name: "Student One",
      createdAt: new Date(),
      profileImageUrl: null,
    };
    (db.student.findUnique as jest.Mock).mockResolvedValue(student);

    const token = jwt.sign(
      { id: "stu1", email: "s@test.com", role: "STUDENT" },
      SECRET,
    );
    const res = await request(app)
      .get("/auth/user/stu1")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe("STUDENT");
    expect(res.body.user).not.toHaveProperty("password");
  });

  it("returns an organisation profile when userId belongs to an org", async () => {
    const org = {
      id: "org1",
      email: "org@test.com",
      name: "Society",
      location: "Plymouth",
      createdAt: new Date(),
      profileImageUrl: null,
      evidenceImageUrl: null,
    };
    (db.student.findUnique as jest.Mock).mockResolvedValue(null);
    (db.organisation.findUnique as jest.Mock).mockResolvedValue(org);

    const token = jwt.sign(
      { id: "stu1", email: "s@test.com", role: "STUDENT" },
      SECRET,
    );
    const res = await request(app)
      .get("/auth/user/org1")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe("ORGANISATION");
  });

  it("returns 404 when userId is not found in either table", async () => {
    (db.student.findUnique as jest.Mock).mockResolvedValue(null);
    (db.organisation.findUnique as jest.Mock).mockResolvedValue(null);

    const token = jwt.sign(
      { id: "stu1", email: "s@test.com", role: "STUDENT" },
      SECRET,
    );
    const res = await request(app)
      .get("/auth/user/ghost")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });
});

// ---------------------------------------------------------------------------
// PUT /auth/profile-image
// ---------------------------------------------------------------------------
describe("PUT /auth/profile-image", () => {
  it("returns 401 when not authenticated", async () => {
    const res = await request(app)
      .put("/auth/profile-image")
      .send({ image: "base64" });
    expect(res.status).toBe(401);
  });

  it("returns 400 when image field is missing", async () => {
    const token = jwt.sign(
      { id: "stu1", email: "s@test.com", role: "STUDENT" },
      SECRET,
    );
    const res = await request(app)
      .put("/auth/profile-image")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Missing image/);
  });

  it("updates and returns the student profile with new image URL", async () => {
    const student = {
      id: "stu1",
      email: "s@test.com",
      username: "stu1",
      name: "Student One",
      createdAt: new Date(),
      profileImageUrl: "https://cdn.example.com/new.jpg",
    };
    (db.student.findUnique as jest.Mock).mockResolvedValue({
      ...student,
      profileImageUrl: null,
    });
    (db.student.update as jest.Mock).mockResolvedValue(student);

    const token = jwt.sign(
      { id: "stu1", email: "s@test.com", role: "STUDENT" },
      SECRET,
    );
    const res = await request(app)
      .put("/auth/profile-image")
      .set("Authorization", `Bearer ${token}`)
      .send({ image: "base64encodeddata" });

    expect(res.status).toBe(200);
    expect(res.body.user.profileImageUrl).toBe(
      "https://cdn.example.com/new.jpg",
    );
  });

  it("updates and returns the organisation profile with new image URL", async () => {
    const org = {
      id: "org1",
      email: "org@test.com",
      name: "Society",
      location: "Plymouth",
      createdAt: new Date(),
      profileImageUrl: "https://cdn.example.com/org-new.jpg",
      evidenceImageUrl: null,
    };
    (db.organisation.findUnique as jest.Mock).mockResolvedValue({
      ...org,
      profileImageUrl: null,
    });
    (db.organisation.update as jest.Mock).mockResolvedValue(org);

    const token = jwt.sign(
      { id: "org1", email: "org@test.com", role: "ORGANISATION" },
      SECRET,
    );
    const res = await request(app)
      .put("/auth/profile-image")
      .set("Authorization", `Bearer ${token}`)
      .send({ image: "base64encodeddata" });

    expect(res.status).toBe(200);
    expect(res.body.user.profileImageUrl).toBe(
      "https://cdn.example.com/org-new.jpg",
    );
  });
});

// ---------------------------------------------------------------------------
// DELETE /auth/me
// ---------------------------------------------------------------------------
describe("DELETE /auth/me", () => {
  it("returns 401 when not authenticated", async () => {
    const res = await request(app).delete("/auth/me");
    expect(res.status).toBe(401);
  });

  it("deletes student account and returns success message", async () => {
    (db.student.delete as jest.Mock).mockResolvedValue(undefined);

    const token = jwt.sign(
      { id: "stu1", email: "s@test.com", role: "STUDENT" },
      SECRET,
    );
    const res = await request(app)
      .delete("/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(db.student.delete).toHaveBeenCalledWith({ where: { id: "stu1" } });
    expect(res.body.message).toMatch(/deleted/i);
  });

  it("deletes organisation account and returns success message", async () => {
    (db.organisation.delete as jest.Mock).mockResolvedValue(undefined);

    const token = jwt.sign(
      { id: "org1", email: "org@test.com", role: "ORGANISATION" },
      SECRET,
    );
    const res = await request(app)
      .delete("/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(db.organisation.delete).toHaveBeenCalledWith({
      where: { id: "org1" },
    });
    expect(res.body.message).toMatch(/deleted/i);
  });
});
