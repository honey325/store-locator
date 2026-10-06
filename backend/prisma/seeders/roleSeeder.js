const prisma = require('../../src/prisma');

const defaultRoles = ['admin', 'owner', 'customer'];

async function seedRoles() {
  console.log('🌱 Starting Roles Seeder...');

  for (const roleName of defaultRoles) {
    // Check if role already exists (case-insensitive) to prevent duplicate insertion
    const existingRole = await prisma.roles.findFirst({
      where: {
        roleName: {
          equals: roleName,
          mode: 'insensitive',
        },
      },
    });

    if (existingRole) {
      console.log(`ℹ️  Role already exists: "${existingRole.roleName}" (ID: ${existingRole.id}) - skipped`);
    } else {
      const createdRole = await prisma.roles.create({
        data: { roleName },
      });
      console.log(`✅ Created role: "${createdRole.roleName}" (ID: ${createdRole.id})`);
    }
  }

  console.log('✨ Roles Seeder completed successfully.');
}

// Allow running this seeder standalone: node prisma/seeders/roleSeeder.js
if (require.main === module) {
  seedRoles()
    .catch((error) => {
      console.error('❌ Error during role seeding:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = seedRoles;
