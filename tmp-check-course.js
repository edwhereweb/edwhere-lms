const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const courseId = '69c0decdb90eb5a283d959e6';
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      modules: {
        include: {
          chapters: true
        }
      },
      chapters: {
        where: { moduleId: null }
      }
    }
  });

  console.log(JSON.stringify(course, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
