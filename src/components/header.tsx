import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";

export async function Header() {
  const user = await getCurrentUser();
  const isTutor = user?.role === "ADMIN" || user?.role === "TUTOR";

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="brand">
          Alan&apos;s SAT Prep
        </Link>
        <nav className="site-nav">
          <Link href="/questions" className="nav-link">Question Bank</Link>
          <Link href="/practice" className="nav-link">Practice</Link>
          {user ? <Link href={`/exam/new` as any} className="nav-link">Mock Exam</Link> : null}
          {user ? <Link href="/dashboard" className="nav-link">Dashboard</Link> : null}
          {isTutor ? <Link href={`/tutor` as any} className="nav-link">Tutor</Link> : null}
          {user?.role === "ADMIN" ? (
            <>
              <Link href="/admin/import" className="nav-link">Import</Link>
              <Link href={`/admin/questions/create` as any} className="nav-link">+ Question</Link>
            </>
          ) : null}
          <ThemeToggle />
          {user ? (
            <form action="/api/auth/logout" method="post">
              <button className="nav-pill">{user.name} · Log out</button>
            </form>
          ) : (
            <Link href="/login" className="nav-pill">Log in</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
