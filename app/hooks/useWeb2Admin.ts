"use client";

import { useCurrentUser } from "./useCurrentUser";
import { WEB2_ADMIN_EMAILS } from "../config/alpha";

/** Web2-mode counterpart to the wallet-address/contract-owner admin checks
 * (MAP_ADMIN_ADDRESS, useShipAttributesOwner, useShipPurchasePricesAccess). */
export function useWeb2Admin(): boolean {
  const { email } = useCurrentUser();
  return email != null && WEB2_ADMIN_EMAILS.includes(email);
}
