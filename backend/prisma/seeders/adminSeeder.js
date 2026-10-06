const bcrypt = require('bcryptjs');
const prisma = require('../../src/prisma');

async function seedAdmin() {
  console.log('🌱 Starting Admin User Seeder...');

  // 1. Ensure the admin role exists
  let adminRole = await prisma.roles.findFirst({
    where: {
      roleName: {
        equals: 'admin',
        mode: 'insensitive',
      },
    },
  });

  if (!adminRole) {
    console.log('ℹ️  Admin role not found. Creating "admin" role first...');
    adminRole = await prisma.roles.create({
      data: { roleName: 'admin' },
    });
    console.log(`✅ Created "admin" role (ID: ${adminRole.id})`);
  }

  // 2. Admin user credentials (loaded from .env)
  const adminName = process.env.ADMIN_NAME || 'Super Admin';
  const adminEmail = process.env.ADMIN_EMAIL;
  const rawPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !rawPassword) {
    throw new Error('Missing ADMIN_EMAIL or ADMIN_PASSWORD in environment variables (.env)');
  }

  // 3. Check for existing admin user by email to prevent duplicates
  const existingUser = await prisma.users.findUnique({
    where: { email: adminEmail },
  });

  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10;
  const hashedPassword = await bcrypt.hash(rawPassword, saltRounds);

  // 4. Upsert admin user (creates if doesn't exist, updates if already present)
  const adminUser = await prisma.users.upsert({
    where: { email: adminEmail },
    update: {
      name: adminName,
      roleId: adminRole.id,
      // Keep existing password or update if desired
    },
    create: {
      name: adminName,
      email: adminEmail,
      password: hashedPassword,
      roleId: adminRole.id,
    },
  });

  if (existingUser) {
    console.log(`ℹ️  Admin user already exists with email: "${adminEmail}" (ID: ${adminUser.id}). Duplicate prevented / profile verified.`);
  } else {
    console.log(`✅ Admin user created successfully:`);
    console.log(`   - ID: ${adminUser.id}`);
    console.log(`   - Name: ${adminUser.name}`);
    console.log(`   - Email: ${adminUser.email}`);
    console.log(`   - Role ID: ${adminUser.roleId} (admin)`);
  }

  console.log('✨ Admin User Seeder completed successfully.');
}

// Allow running this seeder standalone: node prisma/seeders/adminSeeder.js
if (require.main === module) {
  seedAdmin()
    .catch((error) => {
      console.error('❌ Error during admin seeding:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = seedAdmin;
