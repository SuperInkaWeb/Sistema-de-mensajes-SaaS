import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const email = 'admin@novatech.com';
    const password = 'Proyecto2026!';
    const name = 'Admin Novatech';

    const passwordHash = await bcrypt.hash(password, 12);

    const company = await prisma.company.create({
        data: {
            name: 'Novatech',
            planStatus: 'active',
        },
    });

    const user = await prisma.user.create({
        data: {
            companyId: company.id,
            email,
            passwordHash,
            name,
            role: 'admin',
        },
    });

    console.log('User created successfully');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
