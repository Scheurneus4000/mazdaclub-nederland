import type { PrismaClient } from "@prisma/client";

/** Webshopcategorieën waarmee de vereniging start (aan te passen via Beheer → Producten). */
export const defaultCategories = [
  { slug: "kentekenplaathouders", name: "Kentekenplaathouders", description: "Kentekenplaathouders met MazdaClub-belettering." },
  { slug: "stickers", name: "Stickers", description: "Weerbestendige stickers voor auto, laptop en gereedschapskist." },
  { slug: "drinkbekers", name: "Drinkbekers", description: "Mokken en bekers voor onderweg en in de garage." },
  { slug: "sleutelhangers", name: "Sleutelhangers", description: "Sleutelhangers met het clublogo." },
  { slug: "kleding", name: "Kleding", description: "Clubkleding, geborduurd en bedrukt." },
  { slug: "accessoires", name: "Overige accessoires", description: "Overige clubartikelen en accessoires." },
];

/** Maakt de standaardcategorieën aan als er nog geen enkele categorie bestaat. Veilig om vaker te draaien. */
export async function ensureDefaultCategories(db: Pick<PrismaClient, "productCategory">): Promise<number> {
  if ((await db.productCategory.count()) > 0) return 0;
  await db.productCategory.createMany({ data: defaultCategories.map((c, i) => ({ ...c, sortOrder: i })) });
  return defaultCategories.length;
}
