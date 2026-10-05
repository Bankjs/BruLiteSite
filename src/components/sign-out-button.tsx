"use client";

export function SignOutButton() {
  return (
    <form action="/api/auth/signout" method="post">
      <button
        type="submit"
        className="text-sm text-muted transition-colors hover:text-foreground cursor-pointer"
      >
        Sign out
      </button>
    </form>
  );
}
