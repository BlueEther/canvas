import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// eslint-disable-next-line no-console
const log = (...msg: any[]) => console.log(...msg);

async function main() {
  const SETTINGS: { key: string; defaultValue: any }[] = [
    {
      key: "canvas.size",
      defaultValue: {
        width: 100,
        height: 100,
      },
    },
  ];

  for (const setting of SETTINGS) {
    log("Ensuring setting", setting.key);
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: {
        key: setting.key,
        value: JSON.stringify(setting.defaultValue),
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
