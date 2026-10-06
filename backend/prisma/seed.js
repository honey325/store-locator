const prisma = require('../src/prisma');
const seedRoles = require('./seeders/roleSeeder');
const seedAdmin = require('./seeders/adminSeeder');

async function main() {
  console.log('🚀 Running database seeders...\n');

  // Step 1: Seed default roles
  await seedRoles();
  console.log('');

  // Step 2: Seed admin user
  await seedAdmin();
  console.log('');

  console.log('🎉 All seeders executed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Database seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
