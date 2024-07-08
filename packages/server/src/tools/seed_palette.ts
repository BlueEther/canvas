import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// eslint-disable-next-line no-console
const log = (...msg: any[]) => console.log(...msg);

async function main() {
  const palette: { name: string; hex: string }[] = [
    {
      name: "White",
      hex: "FFFFFF",
    },
    {
      name: "Light Grey",
      hex: "C2CBD4",
    },
    {
      name: "Medium Grey",
      hex: "858D98",
    },
    {
      name: "Deep Grey",
      hex: "4B4F58",
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
      hex: "38271D",
    },
    {
      name: "Chocolate",
      hex: "6C422C",
    },
    {
      name: "Brown",
      hex: "BC7541",
    },
    {
      name: "Peach",
      hex: "FFB27F",
    },
    {
      name: "Beige",
      hex: "FFD68F",
    },
    {
      name: "Pink",
      hex: "FEB2D9",
    },
    {
      name: "Magenta",
      hex: "F854CF",
    },
    {
      name: "Mauve",
      hex: "C785F3",
    },
    {
      name: "Purple",
      hex: "9C29BC",
    },
    {
      name: "Dark Purple",
      hex: "562972",
    },
    {
      name: "Navy",
      hex: "1E1E5B",
    },
    {
      name: "Blue",
      hex: "153FA2",
    },
    {
      name: "Azure",
      hex: "1C95DF",
    },
    {
      name: "Aqua",
      hex: "A0E8FF",
    },
    {
      name: "Light Teal",
      hex: "17A8A3",
    },
    {
      name: "Dark Teal",
      hex: "226677",
    },
    {
      name: "Forest",
      hex: "094C45",
    },
    {
      name: "Dark Green",
      hex: "278242",
    },
    {
      name: "Green",
      hex: "43C91E",
    },
    {
      name: "Lime",
      hex: "B7F954",
    },
    {
      name: "Pastel Yellow",
      hex: "FFFFAF",
    },
    {
      name: "Yellow",
      hex: "FAE70F",
    },
    {
      name: "Orange",
      hex: "FEA815",
    },
    {
      name: "Rust",
      hex: "EA5B15",
    },
    {
      name: "Maroon",
      hex: "5A0400",
    },
    {
      name: "Rose",
      hex: "990700",
    },
    {
      name: "Red",
      hex: "D81515",
    },
    {
      name: "Watermelon",
      hex: "FF635E",
    },
  ];

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
