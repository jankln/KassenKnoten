import { z } from "zod";
import { isCategoryIconName } from "@/components/ui/category-icon";
import type { Messages } from "@/lib/i18n";

export const categoryInput = (t: Messages) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(1, t.validation.nameRequired)
      .max(30, t.validation.nameTooLong),
    icon: z.string().refine(isCategoryIconName, t.validation.iconInvalid),
  });

export type CategoryInput = z.infer<ReturnType<typeof categoryInput>>;
