import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const company = await prisma.company.findFirst();
    if (!company) {
        console.log('No company found. Please register an admin first.');
        return;
    }

    const passwordHash = await bcrypt.hash('password123', 12);
    const agents = [
        { name: 'Agente 1', email: 'agente1@test.com' },
        { name: 'Agente 2', email: 'agente2@test.com' },
        { name: 'Agente 3', email: 'agente3@test.com' },
        { name: 'Agente 4', email: 'agente4@test.com' },
    ];

    for (const agentData of agents) {
        await prisma.user.upsert({
            where: { email: agentData.email },
            update: {},
            create: {
                companyId: company.id,
                email: agentData.email,
                name: agentData.name,
                passwordHash,
                role: 'agent',
            },
        });
        console.log(`User created: ${agentData.email}`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
