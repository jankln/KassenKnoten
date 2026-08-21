import { z } from "zod";
import { isCategoryIconName } from "@/components/ui/category-icon";
import { de } from "@/lib/i18n/de";

export const categoryInput = z.object({
  name: z
    .string()
    .trim()
    .min(1, de.validation.nameRequired)
    .max(30, de.validation.nameTooLong),
  icon: z.string().refine(isCategoryIconName, de.validation.iconInvalid),
});

export type CategoryInput = z.infer<typeof categoryInput>;
