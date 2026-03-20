import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import * as schema from "./schema";

const { ADMIN_EMAIL, ADMIN_PASSWORD, DATABASE_URL } = process.env;

if (!DATABASE_URL) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error("Missing ADMIN_EMAIL or ADMIN_PASSWORD in .env");
  process.exit(1);
}

async function main() {
  // Convert pooler URL to direct URL for neon() HTTP driver
  const directUrl = DATABASE_URL!
    .replace(/-pooler\./, ".")
    .replace(/[&?]channel_binding=[^&]*/g, "");
  const sql = neon(directUrl);
  const db = drizzle({ client: sql, schema });

  const existing = await db.query.users.findFirst({
    where: eq(schema.users.email, ADMIN_EMAIL!),
  });

  if (existing) {
    console.log(`User ${ADMIN_EMAIL} already exists, skipping.`);
    return;
  }

  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD!, 12);

  await db.insert(schema.users).values({
    email: ADMIN_EMAIL!,
    name: "Admin",
    hashedPassword,
  });

  console.log(`Created admin user: ${ADMIN_EMAIL}`);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
