import { ICON_SIZE } from "@/lib/seo/constants";
import { monogramImage } from "@/lib/seo/monogram";

/** Browser-tab favicon: white blackletter "GH" on ink. Prerendered at build time. */

export const size = { width: ICON_SIZE, height: ICON_SIZE };
export const contentType = "image/png";

export default function Icon() {
  return monogramImage(ICON_SIZE);
}
