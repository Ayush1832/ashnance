import { PrismaClient, PrizeTier } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔥 Seeding Ashnance database...\n");

  // ==== Prize Config ====
  const prizeConfigs = [
    { tier: PrizeTier.JACKPOT, value: 2500, poolPercent: 0.10, probability: 0.01 },
    { tier: PrizeTier.BIG, value: 500, poolPercent: 0.05, probability: 0.04 },
    { tier: PrizeTier.MEDIUM, value: 200, poolPercent: 0.02, probability: 0.15 },
    { tier: PrizeTier.SMALL, value: 50, poolPercent: 0.01, probability: 0.80 },
  ];

  for (const config of prizeConfigs) {
    await prisma.prizeConfig.upsert({
      where: { tier: config.tier },
      update: config,
      create: { ...config, isActive: true },
    });
  }
  console.log("✅ Prize configs seeded");

  // ==== Platform Config ====
  const platformConfigs = [
    { key: "REWARD_POOL_SPLIT", value: "0.5", description: "% of burn going to reward pool" },
    { key: "PROFIT_POOL_SPLIT", value: "0.5", description: "% of burn going to profit pool" },
    { key: "REFERRAL_COMMISSION", value: "0.1", description: "Referral reward % (10%)" },
    { key: "CONSTANT_FACTOR", value: "100", description: "Win probability denominator" },
    { key: "MIN_BURN_AMOUNT", value: "4.99", description: "Min burn in USDC" },
    { key: "ASH_REWARD_MIN", value: "200", description: "Min ASH on lose" },
    { key: "ASH_REWARD_MAX", value: "500", description: "Max ASH on lose" },
    { key: "VIP_PRICE", value: "24.99", description: "Holy Fire monthly price" },
    { key: "BOOST_COST_ASH", value: "1000", description: "ASH cost for burn boost" },
    { key: "BOOST_DURATION_MS", value: "3600000", description: "Boost duration (1 hr)" },
    { key: "MIN_WITHDRAWAL", value: "10", description: "Min withdrawal in USDC" },
  ];

  for (const cfg of platformConfigs) {
    await prisma.platformConfig.upsert({
      where: { key: cfg.key },
      update: { value: cfg.value, description: cfg.description },
      create: cfg,
    });
  }
  console.log("✅ Platform configs seeded");

  // ==== Reward Pool ====
  const pool = await prisma.rewardPool.findFirst();
  if (!pool) {
    await prisma.rewardPool.create({
      data: { totalBalance: 0, totalPaidOut: 0 },
    });
    console.log("✅ Reward pool created");
  }

  console.log("\n🔥 Seeding complete!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
