import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'anikkhanpathan685@gmail.com';
  const password = '123456';

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const superadmin = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      role: 'superadmin',
    },
    create: {
      name: 'Super Admin',
      email: email,
      password: hashedPassword,
      role: 'superadmin',
    },
  });

  console.log('Superadmin created successfully:');
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  console.log('Please login using these credentials and change the password.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
