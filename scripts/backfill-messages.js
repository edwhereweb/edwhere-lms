const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Finding messages with missing threadStudentId...');
        // We find all messages. Since Prisma might crash on strict typing if we query required fields
        // that are missing in Mongo, we use raw aggregation or just fetch them and see.

        // Actually, since Prisma threw P2032 (found null instead of String), it's exactly the same
        // coercion issue we saw with MentorLastRead.

        // We will execute a raw MongoDB update.
        const updated = await prisma.$runCommandRaw({
            update: "CourseMessage",
            updates: [
                {
                    q: { threadStudentId: { $exists: false } },
                    u: [{ $set: { threadStudentId: "$authorId" } }],
                    multi: true
                }
            ]
        });

        console.log('Updated legacy messages:', updated);

        // Also fix any where it's explicitly null
        const updatedNull = await prisma.$runCommandRaw({
            update: "CourseMessage",
            updates: [
                {
                    q: { threadStudentId: null },
                    u: [{ $set: { threadStudentId: "$authorId" } }],
                    multi: true
                }
            ]
        });

        console.log('Updated null legacy messages:', updatedNull);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
