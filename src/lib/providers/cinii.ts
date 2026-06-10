import { XMLParser } from "fast-xml-parser";
import type { ProviderPaper } from "@/lib/types";
import { asArray, compactArray, fetchText, normalizeDoi } from "./utils";

type CiniiRdf = {
  "rdf:RDF"?: {
    item?: CiniiItem | CiniiItem[];
  };
};

type CiniiItem = {
  title?: string;
  link?: string;
  "dc:creator"?: string | string[];
  "dc:date"?: string;
  "prism:publicationName"?: string;
  "prism:doi"?: string;
  description?: string;
};

export async function searchCinii(query: string, limit = 8): Promise<ProviderPaper[]> {
  const url = new URL("https://cir.nii.ac.jp/opensearch/articles");
  url.searchParams.set("q", query);
  url.searchParams.set("count", String(limit));
  url.searchParams.set("format", "rss");

  if (process.env.CINII_APP_ID) {
    url.searchParams.set("appid", process.env.CINII_APP_ID);
  }

  const text = await fetchText(url.toString());
  const parser = new XMLParser({
    ignoreAttributes: false,
    trimValues: true
  });
  const payload = parser.parse(text) as CiniiRdf;
  const items = asArray(payload["rdf:RDF"]?.item);

  return compactArray(
    items.map((item) => {
      if (!item.title) {
        return null;
      }

      return {
        title: item.title,
        authors: asArray(item["dc:creator"]),
        year: item["dc:date"] ? Number.parseInt(item["dc:date"].slice(0, 4), 10) : undefined,
        sourceName: item["prism:publicationName"],
        doi: normalizeDoi(item["prism:doi"]),
        url: item.link,
        language: "ja",
        abstract: item.description,
        provider: "CiNii Research"
      };
    })
  );
}
