import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

export async function Header() {
  const user = await getCurrentUser();

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="brand">
          SAT Forge
        </Link>
        <nav className="site-nav">
          <Link href="/questions" className="nav-link">
            Question Bank
          </Link>
          <Link href="/practice" className="nav-link">
            Practice
          </Link>
          {user ? (
            <Link href="/dashboard" className="nav-link">
              Dashboard
            </Link>
          ) : null}
          {user?.role === "ADMIN" ? (
            <Link href="/admin/import" className="nav-link">
              Admin
            </Link>
          ) : null}
          {user ? (
            <form action="/api/auth/logout" method="post">
              <button className="nav-pill">
                {user.name} · Log out
              </button>
            </form>
          ) : (
            <Link href="/login" className="nav-pill">
              Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
