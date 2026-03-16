import Link from "next/link";

export default function RegisterPage() {
  return (
    <div className="panel" style={{ maxWidth: "34rem", margin: "0 auto" }}>
      <h1>Create account</h1>
      <form className="form-grid" action="/api/auth/register" method="post">
        <label className="field">
          <span>Name</span>
          <input required name="name" type="text" placeholder="Student name" />
        </label>
        <label className="field">
          <span>Email</span>
          <input required name="email" type="email" placeholder="student@example.com" />
        </label>
        <label className="field">
          <span>Password</span>
          <input required minLength={8} name="password" type="password" placeholder="At least 8 characters" />
        </label>
        <button className="button" type="submit">
          Create account
        </button>
      </form>
      <p className="muted">
        Already registered? <Link href="/login">Log in</Link>
      </p>
    </div>
  );
}
