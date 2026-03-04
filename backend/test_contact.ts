import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function testCreateContact() {
    try {
        const user = await prisma.user.findFirst();
        if (!user) {
            console.error('No users found to test with');
            return;
        }

        console.log(`Testing with user: ${user.name} (Company: ${user.companyId})`);

        const contact = await prisma.contact.upsert({
            where: {
                companyId_phone: {
                    companyId: user.companyId,
                    phone: '123456789',
                },
            },
            update: { name: 'Test User' },
            create: {
                companyId: user.companyId,
                name: 'Test User',
                phone: '123456789',
            },
        });

        console.log('Contact created/updated:', contact);
    } catch (error) {
        console.error('Prisma Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testCreateContact();
