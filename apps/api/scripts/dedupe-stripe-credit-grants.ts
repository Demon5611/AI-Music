import { config } from "dotenv";
import { resolve } from "node:path";
import { prisma } from "@ai-music/db";

config({ path: resolve(import.meta.dirname, "../../../.env") });

async function main(): Promise<void> {
  const duplicates = await prisma.$queryRaw<Array<{ stripe_payment_id: string; cnt: bigint }>>`
    SELECT stripe_payment_id, COUNT(*) AS cnt
    FROM credit_transactions
    WHERE stripe_payment_id IS NOT NULL
    GROUP BY stripe_payment_id
    HAVING COUNT(*) > 1
  `;

  if (duplicates.length === 0) {
    console.log("No duplicate stripe_payment_id rows found.");
    await prisma.$disconnect();
    return;
  }

  for (const row of duplicates) {
    const paymentId = row.stripe_payment_id;
    const rows = await prisma.creditTransaction.findMany({
      where: { stripePaymentId: paymentId },
      orderBy: { createdAt: "asc" },
      select: { id: true, amountUnits: true, createdAt: true },
    });

    const [, ...toDelete] = rows;

    for (const tx of toDelete) {
      await prisma.creditTransaction.delete({ where: { id: tx.id } });
      console.log(`Deleted duplicate grant ${tx.id} for ${paymentId} (-${tx.amountUnits})`);
    }
  }

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
