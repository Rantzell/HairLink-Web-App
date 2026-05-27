import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  try {
    const heroValue = {
      heading: 'Every Strand,<br />a Story of <em>Hope.</em>',
      subheading: 'Supporting cancer patients through hair donation, wig crafting, and compassionate community.',
      ctaLabel: 'Donate Now'
    };

    console.log('Upserting hero site setting in database...');
    const result = await (prisma as any).siteSetting.upsert({
      where: { key: 'hero' },
      update: { value: heroValue },
      create: { key: 'hero', value: heroValue }
    });

    console.log('Successfully set default hero setting:', JSON.stringify(result, null, 2));
  } catch (error: any) {
    console.error('Error updating site settings:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
