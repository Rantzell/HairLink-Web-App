const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const functions = await prisma.$queryRawUnsafe(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public';
    `);
    console.log("Functions in public schema:");
    console.log(JSON.stringify(functions, null, 2));

    const triggers = await prisma.$queryRawUnsafe(`
      SELECT trigger_name, event_manipulation, event_object_table
      FROM information_schema.triggers
      WHERE event_object_schema = 'public' OR event_object_schema = 'auth';
    `);
    console.log("Triggers:");
    console.log(JSON.stringify(triggers, null, 2));
  } catch (err) {
    console.error('Failed to list DB logic:', err);
  } finally {
    await prisma.$disconnect();
  }
}
check();
