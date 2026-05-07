import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting email normalization...');

  const profiles = await prisma.profile.findMany({
    select: { id: true, email: true }
  });

  let count = 0;
  for (const profile of profiles) {
    const lowerEmail = profile.email.toLowerCase();
    if (lowerEmail !== profile.email) {
      await prisma.profile.update({
        where: { id: profile.id },
        data: { email: lowerEmail }
      });
      console.log(`Updated: ${profile.email} -> ${lowerEmail}`);
      count++;
    }
  }

  console.log(`Finished. Updated ${count} profiles.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
