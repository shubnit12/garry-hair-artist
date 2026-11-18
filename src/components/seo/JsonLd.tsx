import { serializeJsonLd, type JsonLd as JsonLdData } from "@/lib/seo/structured-data";

/**
 * Renders structured data as an inline JSON-LD script. The payload is escaped
 * so editor-supplied text can never break out of the <script> element.
 */
export function JsonLd({ data }: { data: JsonLdData }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
