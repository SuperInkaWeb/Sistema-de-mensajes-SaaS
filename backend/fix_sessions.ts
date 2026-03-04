import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fixSessions() {
    try {
        const user = await prisma.user.findFirst({
            where: { role: 'admin' }
        });

        if (!user) {
            console.log('No se encontró un usuario administrador.');
            return;
        }

        console.log(`Usuario encontrado: ${user.name} (Empresa ID: ${user.companyId})`);

        const sessions = await prisma.whatsappSession.findMany();
        console.log(`Sesiones encontradas: ${sessions.length}`);

        for (const session of sessions) {
            if (session.companyId !== user.companyId) {
                console.log(`Corrigiendo sesión "${session.sessionName}" (de ${session.companyId} a ${user.companyId})`);
                await prisma.whatsappSession.update({
                    where: { id: session.id },
                    data: { companyId: user.companyId }
                });
            } else {
                console.log(`Sesión "${session.sessionName}" ya tiene el ID correcto.`);
            }
        }

        console.log('¡Proceso completado!');
    } catch (error) {
        console.error('Error al corregir sesiones:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixSessions();
