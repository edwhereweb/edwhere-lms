const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();
const cats = [
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
    for (const name of cats) {
        const ex = await db.category.findFirst({ where: { name } });
        if (ex) { console.log("Skip:", name); continue; }
        await db.category.create({ data: { name } });
        console.log("Created:", name);
    }
    await db.$disconnect();
    console.log("Done");
}
main().catch(function (e) { console.error(e); process.exit(1); });
