const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    try {
        const deleted = await prisma.courseMessage.deleteMany({});
        console.log('Successfully deleted all messages:', deleted);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
