import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function restoreFromFiles() {
    try {
        const user = await prisma.user.findFirst({
            where: { role: 'admin' }
        });

        if (!user) {
            console.log('No se encontró un usuario administrador.');
            return;
        }

        const companyId = user.companyId;
        const sessionsDir = path.join(process.cwd(), 'sessions');

        if (!fs.existsSync(sessionsDir)) {
            console.log('La carpeta /sessions no existe.');
            return;
        }

        const folders = fs.readdirSync(sessionsDir);
        console.log(`Carpetas en /sessions: ${folders.length}`);

        for (const folderId of folders) {
            const credsFile = path.join(sessionsDir, folderId, 'creds.json');
            if (fs.existsSync(credsFile)) {
                console.log(`Restaurando sesión ${folderId} para la empresa ${companyId}...`);

                await prisma.whatsappSession.upsert({
                    where: { id: folderId },
                    update: {
                        companyId: companyId,
                        sessionStatus: 'connected'
                    },
                    create: {
                        id: folderId,
                        companyId: companyId,
                        sessionName: 'Sesión Recuperada',
                        sessionStatus: 'connected',
                        phoneNumber: '51925772943', // Visto en los archivos
                        campaignType: 'general'
                    }
                });
                console.log(`Sesión ${folderId} restaurada exitosamente.`);
            }
        }

        console.log('¡Proceso de restauración completado!');
    } catch (error) {
        console.error('Error al restaurar sesiones:', error);
    } finally {
        await prisma.$disconnect();
    }
}

restoreFromFiles();
