const { PrismaClient } = require("@prisma/client");

const database = new PrismaClient();

async function main() {
  try {
    console.log("Seeding blog categories...");
    const categories = [
      { name: "Cybersecurity", slug: "cybersecurity" },
      { name: "C Programming", slug: "c-programming" },
      { name: "IoT & Electronics", slug: "iot-electronics" },
      { name: "Web Development", slug: "web-development" },
      { name: "Career Guidance", slug: "career-guidance" },
    ];

    for (const cat of categories) {
      await database.blogCategory.upsert({
        where: { name: cat.name },
        update: {},
        create: cat
      });
    }

    console.log("Seeding blog authors...");
    // Check if author exists first
    const existingAuthor = await database.blogAuthor.findFirst({
      where: { name: "Dr. Joel K." }
    });

    if (!existingAuthor) {
      await database.blogAuthor.create({
        data: {
          name: "Dr. Joel K.",
          bio: "Senior Cybersecurity Researcher with 10+ years of experience in penetration testing and secure code analysis.",
          imageUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200",
          credentials: ["EC-Council CEI", "ISO 27001 Lead Auditor", "OSCP"],
        },
      });
    }

    console.log("Success: Blog data seeded.");
  } catch (error) {
    console.log("Error seeding blog data", error);
  } finally {
    await database.$disconnect();
  }
}

main();
