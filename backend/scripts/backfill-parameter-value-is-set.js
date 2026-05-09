import dotenv from 'dotenv';
import { join } from 'node:path';
import { PrismaClient } from '../src/generated/prisma/index.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { decryptParameterValue } from '../src/crypto/envelope.js';

dotenv.config({ path: join(import.meta.dirname, '..', '.env') });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const BATCH_SIZE = Number.parseInt(process.env.BACKFILL_BATCH_SIZE || '100', 10);

async function main() {
  let cursor = null;
  let updated = 0;

  for (;;) {
    const rows = await prisma.parameterValue.findMany({
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: BATCH_SIZE,
      orderBy: { id: 'asc' }
    });

    if (rows.length === 0) break;

    for (const row of rows) {
      const decrypted = decryptParameterValue(row);
      const isSet = decrypted !== '';
      if (row.isSet !== isSet) {
        await prisma.parameterValue.update({
          where: { id: row.id },
          data: { isSet }
        });
        updated += 1;
      }
    }

    cursor = rows[rows.length - 1].id;
    console.log(`Scanned through ${cursor}; updated ${updated} rows so far...`);
  }

  console.log(`Backfill complete. Updated ${updated} parameter values.`);
}

main()
  .catch((error) => {
    console.error('is_set backfill failed:', error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
