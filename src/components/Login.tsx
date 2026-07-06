import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { loginWithPassword } from "../lib/auth";
import type { AuthUser } from "../lib/types";

interface LoginProps {
  onLogin: (user: AuthUser) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const user = await loginWithPassword(password);
      onLogin(user);
      navigate("/inventory");
    } catch (loginError: unknown) {
      const message =
        loginError instanceof Error
          ? loginError.message
          : "Unable to log in. Please try again.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container auth-page">
      <h1>Staff Login</h1>
      <form className="ui-section auth-panel" onSubmit={handleSubmit}>
        <p className="helper-text" style={{ marginTop: 0 }}>
          Enter the admin password to manage inventory.
        </p>
        <div className="form-group">
          <label htmlFor="admin-password">Admin password</label>
          <input
            id="admin-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
            autoFocus
          />
        </div>
        {error && <div className="ui-section inline-message error-message">{error}</div>}
        <button type="submit" className="btn btn-primary" disabled={isLoading}>
          {isLoading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}
