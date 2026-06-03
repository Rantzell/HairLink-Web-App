import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Migrating any legacy child wigs with old naming (2026-WIG-xxx-W{n} or 2026-BATCH xxx-W{n})...');

    // Fix child wigs that still have the old year-prefixed format
    const childWigs = await prisma.wigProduction.findMany({
      where: {
        taskCode: {
          contains: '-W'
        }
      },
      orderBy: { id: 'asc' }
    });

    console.log(`Found ${childWigs.length} child wig(s) to check.`);

    for (const cw of childWigs) {
      const code = cw.taskCode;
      // Old formats:  "2026-WIG-E145A5-W1"  or  "2026-BATCH 2026-0001-W1"
      // New format:   "BATCH 2026-0001-W1"
      // Detect by checking if it starts with a 4-digit year
      if (/^\d{4}-/.test(code)) {
        // Strip the leading year and hyphen: "2026-BATCH 2026-0001-W1" -> "BATCH 2026-0001-W1"
        const newCode = code.replace(/^\d{4}-/, '');
        console.log(`  Fixing ID ${cw.id}: "${code}" -> "${newCode}"`);
        await prisma.wigProduction.update({
          where: { id: cw.id },
          data: { taskCode: newCode }
        });
      } else {
        console.log(`  ID ${cw.id}: "${code}" — already correct format, skipping.`);
      }
    }

    console.log('Child wig migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
