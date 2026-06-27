export const C = {
  primary: "#7180F5",
  primaryDk: "#5A6ADE",
  tint: "#EDF0FF",
  tintXLight: "#F5F6FD",
  border: "#E5E9F8",
  shadow: "rgba(113,128,245,0.06)",
  textDark: "#1C1B3A",
  textBody: "#4B5563",
  textMuted: "#9BA3BE",
  textAccent: "#7180F5",
  white: "#FFFFFF",
  danger: "#DC2626",
  dangerBg: "#FEF2F2",
  dangerBdr: "#FECACA",
} as const;

export const NUMBERS = "0123456789";
export const ENGLISH_LETTERS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
export const COMMON_PUNCT = " !\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~ ";
export const CHINESE_PUNCT = "，。？！：；“”‘’（）【】《》〈〉「」『』〔〕…—·～、";
export const COMMON_CHINESE = Array.from({ length: 8105 }, (_, i) =>
  String.fromCodePoint(0x4e00 + i),
).join("");

export const CHAR_PRESETS = [
  {
    key: "numbers",
    label: "数字",
    chars: NUMBERS,
    totalCount: 10,
  },
  {
    key: "letters",
    label: "英文字母",
    chars: ENGLISH_LETTERS,
    totalCount: 52,
  },
  { key: "punct", label: "常见标点符号", chars: COMMON_PUNCT, totalCount: 33 },
  {
    key: "chinese",
    label: "通用规范汉字列表",
    chars: COMMON_CHINESE,
    totalCount: 8105,
  },
  {
    key: "chinesePunct",
    label: "汉字标点符号",
    chars: CHINESE_PUNCT,
    totalCount: 29,
  },
] as const;

export const EXPORT_FORMATS = [
  { value: "otf", label: "OTF" },
  { value: "ttf", label: "TTF" },
] as const;

export type ExportFormat = (typeof EXPORT_FORMATS)[number]["value"];

export interface FontMeta {
  familyName: string;
  subfamilyName: string;
  author: string;
  glyphCount: number;
  fileSizeBytes: number;
  fileExt: string;
}

export function getExportFilename(familyName: string, format: ExportFormat) {
  return `${familyName}_subset.${format}`;
}

export function getExportMimeType(format: ExportFormat) {
  if (format === "ttf") return "font/ttf";
  return "font/otf";
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function getNameEntry(names: Record<string, any>, key: string): string {
  const entry = names?.[key];
  if (!entry) return "";
  if (typeof entry === "string") return entry;
  return (
    entry.en ||
    entry["zh-CN"] ||
    entry["zh-Hans"] ||
    entry["zh-Hant"] ||
    (Object.values(entry)[0] as string) ||
    ""
  );
}
