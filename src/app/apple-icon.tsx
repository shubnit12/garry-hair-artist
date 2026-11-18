import { APPLE_ICON_SIZE } from "@/lib/seo/constants";
import { monogramImage } from "@/lib/seo/monogram";

/** iOS home-screen icon (iOS rounds the corners itself). Prerendered at build time. */

export const size = { width: APPLE_ICON_SIZE, height: APPLE_ICON_SIZE };
export const contentType = "image/png";

export default function AppleIcon() {
  return monogramImage(APPLE_ICON_SIZE);
}
