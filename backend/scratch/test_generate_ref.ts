import { generateSequentialReference } from '../src/services/reference.service';
import prisma from '../src/config/database';

async function test() {
  try {
    const nextHD = await generateSequentialReference('HD');
    console.log('Next sequential HD reference:', nextHD);

    const nextBATCH = await generateSequentialReference('BATCH');
    console.log('Next sequential BATCH reference:', nextBATCH);

    const nextMD = await generateSequentialReference('MD');
    console.log('Next sequential MD reference:', nextMD);
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
