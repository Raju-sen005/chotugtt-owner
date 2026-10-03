import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import RegisterTenant from "./RegisterTenant";
import Login from "./Login";

function initialAuthView(searchParams) {
  const auth = (searchParams.get("auth") || "").toLowerCase();
  if (auth === "signup" || auth === "register") return "SIGNUP";
  return "LOGIN";
}

export default function AuthGate() {
  const [searchParams] = useSearchParams();
  const [authView, setAuthView] = useState(() => initialAuthView(searchParams));

  if (authView === "SIGNUP") {
    return <RegisterTenant onSwitchToLogin={() => setAuthView("LOGIN")} />;
  }

  return <Login onSwitchToSignup={() => setAuthView("SIGNUP")} />;
}