import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { loginWithGoogleCredential } from "../lib/auth";
import type { AuthUser } from "../lib/types";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: {
              theme: string;
              size: string;
              text: string;
              width?: number;
            },
          ) => void;
        };
      };
    };
  }
}

interface LoginProps {
  onLogin: (user: AuthUser) => void;
}

const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID as string | undefined;

export default function Login({ onLogin }: LoginProps) {
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(Boolean(GOOGLE_CLIENT_ID));

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    const initializeGoogle = () => {
      if (!window.google || !buttonRef.current) return;

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          setError("");
          if (!response.credential) {
            setError("Google did not return a login credential.");
            return;
          }

          try {
            const user = await loginWithGoogleCredential(response.credential);
            onLogin(user);
            navigate("/inventory");
          } catch (loginError: unknown) {
            const message =
              loginError instanceof Error
                ? loginError.message
                : "Unable to log in. Please try again.";
            setError(message);
          }
        },
      });

      buttonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        text: "signin_with",
        width: 280,
      });
      setIsLoading(false);
    };

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GOOGLE_SCRIPT_SRC}"]`,
    );
    if (existing) {
      if (window.google) initializeGoogle();
      else existing.addEventListener("load", initializeGoogle, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogle;
    script.onerror = () => {
      setError("Unable to load Google Sign-In.");
      setIsLoading(false);
    };
    document.head.appendChild(script);
  }, [navigate, onLogin]);

  return (
    <div className="container auth-page">
      <h1>Staff Login</h1>
      <div className="ui-section auth-panel">
        <p className="helper-text" style={{ marginTop: 0 }}>
          Authorized Where To Turn users can sign in to manage inventory.
        </p>
        <div ref={buttonRef} className="google-login-button" />
        {isLoading && <div className="helper-text">Loading login...</div>}
        {!GOOGLE_CLIENT_ID && (
          <div className="ui-section inline-message error-message">
            Login is not configured. Set VITE_GOOGLE_OAUTH_CLIENT_ID.
          </div>
        )}
        {error && <div className="ui-section inline-message error-message">{error}</div>}
      </div>
    </div>
  );
}
