// Environment variables required by modules loaded during tests
process.env.JWT_SECRET = "test-secret-for-jest";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.STRIPE_SECRET_KEY = "sk_test_fake";
