import "dotenv/config";
import postgres from "postgres";
import { readFileSync } from "fs";

const jsonPath = process.argv[2];
if (!jsonPath) {
  console.error("Usage: npx tsx scripts/import-challenge.ts <path-to-json>");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL!);

async function main() {
  // 1. Get user
  const [user] = await sql`SELECT id, timezone FROM users LIMIT 1`;
  if (!user) throw new Error("No user found");
  console.log(`User: ${user.id} (tz: ${user.timezone})`);

  // 2. Read challenge JSON
  const data = JSON.parse(readFileSync(jsonPath, "utf-8"));
  console.log(`Challenge: ${data.challenge} (${data.tasks.length} tasks)`);

  // 3. Create project
  const [project] = await sql`
    INSERT INTO projects ("userId", name, color)
    VALUES (${user.id}, ${data.challenge}, ${data.color || "#6366F1"})
    RETURNING id, name
  `;
  console.log(`Created project: ${project.name} (${project.id})`);

  // 4. Compute startDates and insert tasks
  const today = new Date().toLocaleDateString("en-CA", { timeZone: user.timezone });
  const todayDate = new Date(today + "T00:00:00");

  let inserted = 0;
  for (const t of data.tasks) {
    const startDate = new Date(todayDate);
    startDate.setDate(startDate.getDate() + (t.day - 1));
    const dateStr = startDate.toLocaleDateString("en-CA");

    await sql`
      INSERT INTO tasks ("userId", "projectId", title, description, "startDate", "timeBlock", priority, "estimatedMinutes", position)
      VALUES (
        ${user.id},
        ${project.id},
        ${t.title},
        ${t.description || null},
        ${dateStr},
        ${t.timeBlock || "morning"},
        ${t.priority || "none"},
        ${t.estimatedMinutes || null},
        ${t.day}
      )
    `;
    inserted++;
  }

  const lastDate = new Date(todayDate);
  lastDate.setDate(lastDate.getDate() + (data.tasks.length - 1));

  console.log(`Inserted ${inserted} tasks (${today} → ${lastDate.toLocaleDateString("en-CA")})`);
  await sql.end();
}

main().catch((e) => {
  console.error("Error:", e.message);
  sql.end();
  process.exit(1);
});
