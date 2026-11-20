import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  hasPendingRegistrationMarker,
  isMerchantAppPath,
} from "./pendingRegistration";

/**
 * Keeps pending (unapproved) owners on /registration-success when they
 * attempt merchant deep-links without an authenticated session.
 */
export default function PendingRouteGuard({ enabled }) {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!enabled) return;
    if (!hasPendingRegistrationMarker()) return;
    if (!isMerchantAppPath(location.pathname)) return;

    navigate("/registration-success", { replace: true });
  }, [enabled, location.pathname, navigate]);

  return null;
}
