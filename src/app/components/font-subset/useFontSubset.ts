import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { createFont } from "fonteditor-core";
import { Font, Glyph, Path, parse as parseFont } from "opentype.js";
import {
  CHAR_PRESETS,
  getExportFilename,
  getExportMimeType,
  formatSize,
  getNameEntry,
  type ExportFormat,
  type FontMeta,
} from "./constants";

type ParsedFont = ReturnType<typeof parseFont>;
type Phase = "upload" | "editor";

export function useFontSubset() {
  const [phase, setPhase] = useState<Phase>("upload");
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [fontMeta, setFontMeta] = useState<FontMeta | null>(null);
  const [parsedFont, setParsedFont] = useState<ParsedFont | null>(null);
  const [customText, setCustomText] = useState("");
  const [selectedPresets, setSelectedPresets] = useState<
    Record<string, boolean>
  >({});
  const [exportFormat, setExportFormat] = useState<ExportFormat>("otf");
  const [presetCounts, setPresetCounts] = useState<
    Record<string, number | null>
  >({});
  const [infoExpanded, setInfoExpanded] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [sourceBuffer, setSourceBuffer] = useState<ArrayBuffer | null>(null);
  const [sourceType, setSourceType] = useState<string>("ttf");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const styleElemRef = useRef<HTMLStyleElement | null>(null);
  const fontUrlRef = useRef<string | null>(null);
  const fontFaceFamily = useRef(`pf_${Date.now()}`);

  const charSet = useMemo(() => {
    const unique = new Set<string>();
    for (const char of customText) {
      if (char !== "\n" && char !== "\r" && char !== "\t") unique.add(char);
    }
    return unique;
  }, [customText]);

  const estimatedSize = useMemo(() => {
    if (!fontMeta || charSet.size === 0) return null;
    const perGlyph = fontMeta.fileSizeBytes / Math.max(fontMeta.glyphCount, 1);
    return formatSize(Math.max(5120 + charSet.size * perGlyph, 1024));
  }, [charSet, fontMeta]);

  const previewText = useMemo(() => {
    const unique = [...charSet].join("");
    return unique || "字体裁剪预览效果";
  }, [charSet]);

  const pct = fontMeta
    ? Math.min(100, (charSet.size / Math.max(fontMeta.glyphCount, 1)) * 100)
    : 0;

  const computeCounts = useCallback((font: ParsedFont) => {
    const result: Record<string, number | null> = {};
    for (const preset of CHAR_PRESETS) {
      let count = 0;
      for (const char of preset.chars) {
        try {
          const glyph = font.charToGlyph(char);
          if (glyph?.index !== 0) count++;
        } catch {
          // Ignore fonts that cannot resolve individual characters.
        }
      }
      result[preset.key] = count;
    }
    setPresetCounts(result);
  }, []);

  const injectFontFace = useCallback((buffer: ArrayBuffer, ext: string) => {
    if (styleElemRef.current) {
      document.head.removeChild(styleElemRef.current);
      styleElemRef.current = null;
    }
    if (fontUrlRef.current) {
      URL.revokeObjectURL(fontUrlRef.current);
      fontUrlRef.current = null;
    }

    const mime =
      ext === "woff"
        ? "font/woff"
        : ext === "woff2"
          ? "font/woff2"
          : "font/otf";
    const url = URL.createObjectURL(new Blob([buffer], { type: mime }));
    fontUrlRef.current = url;

    const style = document.createElement("style");
    style.textContent = `@font-face{font-family:'${fontFaceFamily.current}';src:url('${url}')}`;
    document.head.appendChild(style);
    styleElemRef.current = style;
  }, []);

  const loadFile = useCallback(
    async (file: File) => {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!["ttf", "otf", "woff"].includes(ext)) {
        setErrorMsg("请上传 TTF、OTF 或 WOFF 格式的字体文件");
        return;
      }

      setErrorMsg("");
      setIsLoading(true);

      try {
        const buffer = await file.arrayBuffer();
        setSourceBuffer(buffer.slice(0));
        setSourceType(ext);
        const font = parseFont(buffer);

        injectFontFace(buffer, ext);
        setFontMeta({
          familyName:
            getNameEntry(font.names, "fullName") ||
            getNameEntry(font.names, "fontFamily") ||
            file.name.replace(/\.[^.]+$/, ""),
          subfamilyName: getNameEntry(font.names, "fontSubfamily") || "Regular",
          author:
            getNameEntry(font.names, "designer") ||
            getNameEntry(font.names, "manufacturer") ||
            "—",
          glyphCount: font.glyphs.length,
          fileSizeBytes: buffer.byteLength,
          fileExt: ext.toUpperCase(),
        });
        setParsedFont(font);
        setCustomText("");
        setSelectedPresets({});
        setPresetCounts({
          numbers: null,
          letters: null,
          punct: null,
          chinese: null,
          chinesePunct: null,
        });
        setPhase("editor");
        window.setTimeout(() => computeCounts(font), 200);
      } catch {
        setErrorMsg("字体解析失败，请检查文件是否损坏或格式不支持");
      } finally {
        setIsLoading(false);
      }
    },
    [computeCounts, injectFontFace],
  );

  const togglePreset = useCallback(
    (key: string) => {
      const preset = CHAR_PRESETS.find((item) => item.key === key);
      if (!preset) return;

      const willBeChecked = !selectedPresets[key];
      if (willBeChecked) {
        setCustomText((prev) => {
          const existing = new Set(prev);
          const toAdd = [...preset.chars].filter((char) => !existing.has(char));
          return prev + toAdd.join("");
        });
      } else {
        const otherPresetChars = new Set<string>();
        for (const item of CHAR_PRESETS) {
          if (item.key !== key && selectedPresets[item.key]) {
            for (const char of item.chars) otherPresetChars.add(char);
          }
        }
        const removing = new Set(preset.chars);
        setCustomText((prev) =>
          [...prev]
            .filter((char) => !removing.has(char) || otherPresetChars.has(char))
            .join(""),
        );
      }

      setSelectedPresets((prev) => ({ ...prev, [key]: willBeChecked }));
    },
    [selectedPresets],
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      const file = event.dataTransfer.files?.[0];
      if (file) loadFile(file);
    },
    [loadFile],
  );

  const downloadSubset = useCallback(async () => {
    if (!fontMeta || charSet.size === 0) return;
    setIsDownloading(true);

    try {
      if (exportFormat === "otf" && !parsedFont) {
        throw new Error("字体尚未解析完成，请重试");
      }
      const exportBuffer =
        exportFormat === "otf"
          ? createOtfSubset(fontMeta, parsedFont!, charSet)
          : createBinarySubset(
              sourceBuffer,
              sourceType,
              charSet,
              exportFormat,
            );

      const blob = new Blob([exportBuffer], {
        type: getExportMimeType(exportFormat),
      });
      const url = URL.createObjectURL(blob);
      const anchor = Object.assign(document.createElement("a"), {
        href: url,
        download: getExportFilename(fontMeta.familyName, exportFormat),
      });
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch (error) {
      const errorMsg = getReadableError(error);
      console.error("Font subset export failed", {
        error,
        exportFormat,
        sourceType,
        familyName: fontMeta.familyName,
        charCount: charSet.size,
      });
      setErrorMsg(`字体裁剪失败：${errorMsg}`);
    } finally {
      setIsDownloading(false);
    }
  }, [charSet, exportFormat, fontMeta, parsedFont, sourceBuffer, sourceType]);

  const resetTool = useCallback(() => {
    setPhase("upload");
    setParsedFont(null);
    setFontMeta(null);
    setCustomText("");
    setSelectedPresets({});
    setExportFormat("otf");
    setPresetCounts({});
    setErrorMsg("");
    setSourceBuffer(null);
    setSourceType("ttf");
  }, []);

  useEffect(
    () => () => {
      if (styleElemRef.current) document.head.removeChild(styleElemRef.current);
      if (fontUrlRef.current) URL.revokeObjectURL(fontUrlRef.current);
    },
    [],
  );

  return {
    phase,
    isLoading,
    isDownloading,
    isDragging,
    fontMeta,
    customText,
    selectedPresets,
    presetCounts,
    exportFormat,
    infoExpanded,
    errorMsg,
    fileInputRef,
    setCustomText,
    setExportFormat,
    setInfoExpanded,
    setIsDragging,
    charSet,
    estimatedSize,
    previewText,
    pct,
    fontFamilyName: fontFaceFamily.current,
    loadFile,
    togglePreset,
    handleDrop,
    downloadSubset,
    resetTool,
  };
}

export type FontSubsetModel = ReturnType<typeof useFontSubset>;

function getReadableError(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === "string" && error.trim()) {
    return error;
  }
  return "未知错误，请打开控制台查看详细日志";
}

function createOtfSubset(
  fontMeta: FontMeta,
  parsedFont: ParsedFont,
  charSet: Set<string>,
) {
  const notdefGlyph = parsedFont.glyphs.get(0);
  const glyphs: Glyph[] = [cloneGlyphForSubset(notdefGlyph, 0)];
  const seen = new Set<number>([0]);

  for (const char of charSet) {
    try {
      const glyph = parsedFont.charToGlyph(char);
      if (glyph && glyph.index !== 0 && !seen.has(glyph.index)) {
        seen.add(glyph.index);
        glyphs.push(cloneGlyphForSubset(glyph, glyphs.length));
      }
    } catch {
      // Ignore individual glyph lookup failures and keep downloading.
    }
  }

  const subFont = new Font({
    familyName: fontMeta.familyName,
    styleName: fontMeta.subfamilyName,
    unitsPerEm: parsedFont.unitsPerEm,
    ascender: parsedFont.ascender,
    descender: parsedFont.descender,
    glyphs,
  } as any);

  return subFont.toArrayBuffer();
}

function cloneGlyphForSubset(glyph: Glyph, index: number) {
  if (!glyph) {
    return new Glyph({
      index,
      name: ".notdef",
      advanceWidth: 0,
      path: new Path(),
    } as any);
  }

  return new Glyph({
    index,
    name: glyph.name || undefined,
    unicode: glyph.unicode,
    unicodes: glyph.unicodes ? [...glyph.unicodes] : undefined,
    xMin: glyph.xMin,
    yMin: glyph.yMin,
    xMax: glyph.xMax,
    yMax: glyph.yMax,
    advanceWidth: glyph.advanceWidth,
    leftSideBearing: glyph.leftSideBearing,
    path: glyph.path,
  } as any);
}

function createBinarySubset(
  sourceBuffer: ArrayBuffer | null,
  sourceType: string,
  charSet: Set<string>,
  exportFormat: Exclude<ExportFormat, "otf">,
) {
  if (!sourceBuffer) {
    throw new Error("尚未加载源字体，请重新上传后再导出");
  }

  const subset = Array.from(charSet)
    .map((char) => char.codePointAt(0))
    .filter((codePoint): codePoint is number => typeof codePoint === "number");

  const font = createFont(sourceBuffer, {
    type: sourceType as any,
    subset,
    hinting: false,
    kerning: false,
    compound2simple: true,
  });

  if (typeof font.optimize === "function") {
    font.optimize();
  }

  const exportBuffer = font.write({
    type: exportFormat,
    hinting: false,
    kerning: false,
    support: {
      head: {},
      hhea: {},
    },
  });

  return exportBuffer instanceof ArrayBuffer
    ? exportBuffer
    : exportBuffer.buffer.slice(
        exportBuffer.byteOffset,
        exportBuffer.byteOffset + exportBuffer.byteLength,
      );
}
