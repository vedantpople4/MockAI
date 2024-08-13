/** @type { import("drizzle-kit").Config } */
export default {
    schema: "./utils/schema.js",
    dialect: 'postgresql',
    dbCredentials: {
      url: 'postgresql://ai-interview-mocker_owner:R4It5fpFiAdc@ep-young-fire-a5oco93b.us-east-2.aws.neon.tech/ai-interview-mocker?sslmode=require',
    }
  };