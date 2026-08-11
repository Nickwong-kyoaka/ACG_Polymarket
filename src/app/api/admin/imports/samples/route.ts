import { bangumiImportSamples } from "@/data/bangumi-samples";
import { apiOk } from "@/lib/api";

export function GET() {
  return apiOk({ samples: bangumiImportSamples });
}
