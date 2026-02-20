import { Navigate, Outlet } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../firebaseConfig";

const PublicRoute = () => {
  const [user, loading] = useAuthState(auth);

  if (loading) return <p>Loading...</p>; // Show loading state while checking auth
  return user ? <Navigate to="/" replace /> : <Outlet />;
};

export default PublicRoute;
