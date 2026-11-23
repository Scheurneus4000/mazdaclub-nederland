import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// /admin en /account vereisen een ingelogde gebruiker. De beheerdersrol controleert elke
// beheerpagina, server action en API-route zelf in de database (requireAdmin / getAdminOrNull).
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/admin/:path*", "/account/:path*"],
};
