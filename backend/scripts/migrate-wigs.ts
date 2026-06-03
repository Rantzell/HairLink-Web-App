import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Starting migration of legacy WIG- codes to BATCH sequential references...');

    // 1. Get all parent wig productions that start with 'WIG-'
    const parentWigs = await prisma.wigProduction.findMany({
      where: {
        taskCode: {
          startsWith: 'WIG-',
          not: { contains: '-W' }
        }
      },
      orderBy: { id: 'asc' } // migrate oldest to newest
    });

    console.log(`Found ${parentWigs.length} legacy parent tasks to migrate.`);

    let batchSeq = 1;
    const currentYear = new Date().getFullYear();

    for (const pw of parentWigs) {
      const oldCode = pw.taskCode;
      const newCode = `BATCH ${currentYear}-${batchSeq.toString().padStart(4, '0')}`;
      batchSeq++;

      console.log(`Migrating parent task ID ${pw.id}: "${oldCode}" -> "${newCode}"`);

      // Update parent task
      await prisma.wigProduction.update({
        where: { id: pw.id },
        data: { taskCode: newCode }
      });

      // Find and update all child wigs linked to this parent task code
      const childWigs = await prisma.wigProduction.findMany({
        where: {
          taskCode: {
            contains: oldCode,
            endsWith: '-W' // or containing -W
          }
        }
      });

      console.log(`Found ${childWigs.length} child wigs linked to "${oldCode}".`);

      for (const cw of childWigs) {
        const oldChildCode = cw.taskCode;
        // Format of child wig code: {year}-{parentTaskCode}-W{index}
        // e.g. "2026-WIG-E145A5-W1" -> "2026-BATCH 2026-0001-W1"
        const newChildCode = oldChildCode.replace(oldCode, newCode);
        console.log(`  Updating child wig ID ${cw.id}: "${oldChildCode}" -> "${newChildCode}"`);

        await prisma.wigProduction.update({
          where: { id: cw.id },
          data: { taskCode: newChildCode }
        });
      }
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
