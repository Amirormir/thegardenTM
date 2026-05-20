import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

const ACCOUNT_COUNT = 10;
const EMAIL_DOMAIN = 'garden.local';

function generatePassword(length = 18) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const bytes = randomBytes(length);
  let password = '';

  for (let index = 0; index < length; index += 1) {
    password += alphabet[bytes[index] % alphabet.length];
  }

  return password;
}

async function main() {
  const credentials: { name: string; email: string; password: string; status: string }[] = [];

  for (let index = 1; index <= ACCOUNT_COUNT; index += 1) {
    const padded = index.toString().padStart(2, '0');
    const name = `Compte Capitaine ${padded}`;
    const email = `capitaine${padded}@${EMAIL_DOMAIN}`;
    const password = generatePassword();

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      credentials.push({ name, email, password: '(deja existant)', status: 'SKIPPED' });
      continue;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: UserRole.TEAM_CAPTAIN,
      },
    });

    credentials.push({ name, email, password, status: 'CREATED' });
  }

  console.table(credentials);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
