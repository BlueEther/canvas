import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// eslint-disable-next-line no-console
const log = (...msg: any[]) => console.log(...msg);

async function main() {
  // pxls palette 13
  // https://github.com/pxlsspace/Pxls/commit/1e0d85ddfc1258e6fc0ff9a0c1b1bff06cd9ee21
  const palette: { name: string; hex: string }[] = [
    {
      name: "White",
      hex: "FFFFFF",
    },
    {
      name: "Light Grey",
      hex: "B9C3CF",
    },
    {
      name: "Medium Grey",
      hex: "777F8C",
    },
    {
      name: "Deep Grey",
      hex: "424651",
    },
    {
      name: "Dark Grey",
      hex: "1F1E26",
    },
    {
      name: "Black",
      hex: "000000",
    },
    {
      name: "Dark Chocolate",
      hex: "382215",
    },
    {
      name: "Chocolate",
      hex: "7C3F20",
    },
    {
      name: "Brown",
      hex: "C06F37",
    },
    {
      name: "Peach",
      hex: "FEAD6C",
    },
    {
      name: "Beige",
      hex: "FFD2B1",
    },
    {
      name: "Pink",
      hex: "FFA4D0",
    },
    {
      name: "Magenta",
      hex: "F14FB4",
    },
    {
      name: "Mauve",
      hex: "E973FF",
    },
    {
      name: "Purple",
      hex: "A630D2",
    },
    {
      name: "Dark Purple",
      hex: "531D8C",
    },
    {
      name: "Navy",
      hex: "242367",
    },
    {
      name: "Blue",
      hex: "0334BF",
    },
    {
      name: "Azure",
      hex: "149CFF",
    },
    {
      name: "Aqua",
      hex: "8DF5FF",
    },
    {
      name: "Light Teal",
      hex: "01BFA5",
    },
    {
      name: "Dark Teal",
      hex: "16777E",
    },
    {
      name: "Forest",
      hex: "054523",
    },
    {
      name: "Dark Green",
      hex: "18862F",
    },
    {
      name: "Green",
      hex: "61E021",
    },
    {
      name: "Lime",
      hex: "B1FF37",
    },
    {
      name: "Pastel Yellow",
      hex: "FFFFA5",
    },
    {
      name: "Yellow",
      hex: "FDE111",
    },
    {
      name: "Orange",
      hex: "FF9F17",
    },
    {
      name: "Rust",
      hex: "F66E08",
    },
    {
      name: "Maroon",
      hex: "550022",
    },
    {
      name: "Rose",
      hex: "99011A",
    },
    {
      name: "Red",
      hex: "F30F0C",
    },
    {
      name: "Watermelon",
      hex: "FF7872",
    },
  ];

  if (process.argv?.[2] === "sql") {
    log(`ALTER SEQUENCE "PaletteColor_id_seq" RESTART WITH 1;`);
    for (const { name, hex } of palette) {
      log(
        `INSERT INTO "PaletteColor" (name, hex) VALUES ('${name}', '${hex}');`
      );
    }
  } else {
    for (const { name, hex } of palette) {
      log("Ensuring color", { name, hex });
      await prisma.paletteColor.upsert({
        where: { hex },
        update: {},
        create: {
          name,
          hex,
        },
      });
    }
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
