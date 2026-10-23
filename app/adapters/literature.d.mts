import type {
  LiteratureHealth,
  LiteratureQuery,
  LiteratureResult,
  LiteratureSearch,
} from "../core/literature";

export class CuratedLiterature implements LiteratureSearch {
  health(): Promise<LiteratureHealth>;
  search(query: LiteratureQuery): Promise<LiteratureResult>;
}

export class LiteratureError extends Error {
  code: "literature_unavailable" | "literature_query_invalid";
}
