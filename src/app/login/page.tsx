import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="panel" style={{ maxWidth: "34rem", margin: "0 auto" }}>
      <h1>Log in</h1>
      <form className="form-grid" action="/api/auth/login" method="post">
        <label className="field">
          <span>Email</span>
          <input required name="email" type="email" placeholder="student@example.com" />
        </label>
        <label className="field">
          <span>Password</span>
          <input required name="password" type="password" placeholder="••••••••" />
        </label>
        <button className="button" type="submit">
          Log in
        </button>
      </form>
      <p className="muted">
        No account yet? <Link href="/register">Create one</Link>
      </p>
    </div>
  );
}
