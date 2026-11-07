import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { checkCategoryNameAvailable } from './category.rules';
import { newCategorySchema } from './category.schemas';
import type { z } from 'zod';
import { CATEGORY_COLORS, CATEGORY_ICON_KEYS } from './category.types';
import { useCategoryRepository } from './useCategoryRepository';

type CategoryFormValues = z.infer<typeof newCategorySchema>;

// Form to create a custom category (RN-35). It lives here so the screen only paints and sends events.
export function useCreateCategory(onCreated: () => void) {
  const repository = useCategoryRepository();
  const [failed, setFailed] = useState(false);
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(newCategorySchema),
    defaultValues: { name: '', icon: CATEGORY_ICON_KEYS[0], color: CATEGORY_COLORS[0] },
  });

  const submit = form.handleSubmit(async (values) => {
    try {
      const available = checkCategoryNameAvailable(values.name, await repository.list());
      if (!available.ok) {
        form.setError('name', { message: available.error });
        return;
      }

      await repository.create({ ...values, name: available.value });
      setFailed(false);
      onCreated();
    } catch {
      setFailed(true);
    }
  });

  return { form, submit, failed };
}
