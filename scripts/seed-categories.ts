/**
 * Seed script: add default course categories to the database.
 *
 * Run with:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/seed-categories.ts
 *
 * Or on Windows:
 *   npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" scripts/seed-categories.ts
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const DEFAULT_CATEGORIES = [
    "Web Development",
    "Mobile Development",
    "Data Science & AI",
    "Design & UX",
    "Business & Entrepreneurship",
    "Marketing & SEO",
    "Personal Development",
    "Finance & Accounting",
];

async function main() {
    console.log("Seeding categories...");
    let created = 0;
    let skipped = 0;

    for (const name of DEFAULT_CATEGORIES) {
        const existing = await db.category.findFirst({ where: { name } });
        if (existing) {
            console.log(`  ⇒ Skipped (already exists): ${name}`);
            skipped++;
        } else {
            await db.category.create({ data: { name } });
            console.log(`  ✓ Created: ${name}`);
            created++;
        }
    }

    console.log(`\nDone. Created: ${created}, Skipped: ${skipped}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await db.$disconnect();
    });
