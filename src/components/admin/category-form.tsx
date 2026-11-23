"use client";

import * as React from "react";
import { Loader2, Plus } from "lucide-react";
import { createCategory } from "@/app/admin/actions/products";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";
import { useFormAction } from "./use-form-action";

export function CategoryForm() {
  const { onSubmit, pending, errors, state } = useFormAction(createCategory);
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-2">
      <label htmlFor="category-name" className="text-sm font-medium">
        Nieuwe categorie
      </label>
      <div className="flex gap-2">
        <Input id="category-name" name="name" placeholder="Bijv. Kleding" className="h-10" aria-invalid={!!errors.name} />
        <Button type="submit" variant="outline" className="h-10" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Plus />}
          Toevoegen
        </Button>
      </div>
      <FieldError message={errors.name} />
    </form>
  );
}
