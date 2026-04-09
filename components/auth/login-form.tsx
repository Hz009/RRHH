"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      if (data.user?.user_metadata?.must_change_password) {
        router.push("/change-password");
        router.refresh();
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
      <div>
        <label className="mb-1 block text-sm text-zinc-700">Email</label>
        <Input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="admin@test.com"
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-zinc-700">Contrasena</label>
        <Input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="********"
          required
        />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Ingresando..." : "Iniciar sesion"}
      </Button>
    </form>
  );
}
