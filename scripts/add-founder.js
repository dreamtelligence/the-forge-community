// Script um einen Founder direkt zur Datenbank hinzuzufügen
// Usage: node scripts/add-founder.js "Name" "email@example.com"

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addFounder(name, email) {
  try {
    console.log(`🔍 Checking if user exists: ${email}`);

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email }
    });

    if (user) {
      console.log(`✅ User exists! Updating role to FOUNDER...`);
      user = await prisma.user.update({
        where: { email },
        data: {
          role: 'FOUNDER',
          name: name || user.name,
          emailVerified: new Date()
        }
      });
    } else {
      console.log(`➕ Creating new user as FOUNDER...`);
      user = await prisma.user.create({
        data: {
          email,
          name,
          role: 'FOUNDER',
          emailVerified: new Date()
        }
      });
    }

    console.log(`\n✅ SUCCESS! Founder added/updated:`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   ID: ${user.id}`);
    console.log(`\n🎉 ${user.name} kann sich jetzt einloggen!\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Parse command line arguments
const name = process.argv[2];
const email = process.argv[3];

if (!name || !email) {
  console.log('Usage: node scripts/add-founder.js "Name" "email@example.com"');
  process.exit(1);
}

addFounder(name, email);
