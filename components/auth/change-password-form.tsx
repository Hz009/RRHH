"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function ChangePasswordForm() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError("La contrasena debe tener al menos 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Las contrasenas no coinciden.");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createSupabaseBrowserClient();

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
        data: { must_change_password: false },
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-zinc-600">
        Es tu primer inicio de sesion. Por favor, establece una nueva contrasena
        para continuar.
      </p>

      <div>
        <label className="mb-1 block text-sm text-zinc-700">
          Nueva contrasena
        </label>
        <Input
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          placeholder="Minimo 6 caracteres"
          required
          minLength={6}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm text-zinc-700">
          Confirmar contrasena
        </label>
        <Input
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Repetir contrasena"
          required
          minLength={6}
        />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Guardando..." : "Cambiar contrasena"}
      </Button>
    </form>
  );
}
