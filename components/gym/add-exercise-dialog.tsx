"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createExercise } from "@/app/(app)/gym/exercises/actions";
import type { ExerciseCategory } from "@/lib/generated/prisma/client";

export function AddExerciseDialog({ categories }: { categories: ExerciseCategory[] }) {
  const [open, setOpen] = useState(false);

  async function handleSubmit(formData: FormData) {
    await createExercise(formData);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>Add exercise</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add exercise</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required placeholder="Bench press" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="categoryId">Category (optional)</Label>
            <Select
              name="categoryId"
              items={categories.map((category) => ({ value: category.id, label: category.name }))}
            >
              <SelectTrigger id="categoryId" className="w-full">
                <SelectValue placeholder="No category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full">
            Create
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
