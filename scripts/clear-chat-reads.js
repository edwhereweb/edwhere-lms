const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    try {
        const deletedMentor = await prisma.mentorLastRead.deleteMany({});
        console.log('Successfully deleted all mentor last reads:', deletedMentor);

        const deletedStudent = await prisma.studentLastRead.deleteMany({});
        console.log('Successfully deleted all student last reads:', deletedStudent);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
