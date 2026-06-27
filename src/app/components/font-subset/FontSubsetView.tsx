import {
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  Loader2,
  Package,
  RefreshCw,
  Scissors,
  Upload,
  Eye,
} from "lucide-react";
import type {
  Dispatch,
  DragEventHandler,
  RefObject,
  SetStateAction,
} from "react";
import {
  CHAR_PRESETS,
  C,
  EXPORT_FORMATS,
  formatSize,
  type ExportFormat,
  type FontMeta,
} from "./constants";
import { Card, ErrorBanner, StepBadge, StepLabel } from "./shared";
import type { FontSubsetModel } from "./useFontSubset";

export function FontSubsetView({
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
  fontFamilyName,
  loadFile,
  togglePreset,
  handleDrop,
  downloadSubset,
  resetTool,
}: FontSubsetModel) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.tintXLight,
        fontFamily:
          '"PingFang SC","Microsoft YaHei","Noto Sans SC",Inter,sans-serif',
      }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: C.white,
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <div
          style={{
            maxWidth: 1160,
            margin: "0 auto",
            padding: "0 24px",
            height: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: C.primary,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Scissors size={17} color="#fff" />
            </div>
            <div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 15,
                  color: C.textDark,
                  lineHeight: 1.2,
                }}
              >
                字体裁剪工具
              </div>
              <div style={{ fontSize: 11, color: C.textAccent }}>
                Font Subset Tool
              </div>
            </div>
          </div>
          {phase === "editor" && (
            <button
              onClick={resetTool}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 16px",
                borderRadius: 8,
                border: `1.5px solid ${C.border}`,
                background: C.white,
                color: C.primary,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <RefreshCw size={13} /> 重新选择字体文件
            </button>
          )}
        </div>
      </header>

      <main
        style={{ maxWidth: 1160, margin: "0 auto", padding: "40px 24px 64px" }}
      >
        {phase === "upload" && (
          <UploadPhase
            isLoading={isLoading}
            isDragging={isDragging}
            errorMsg={errorMsg}
            fileInputRef={fileInputRef}
            handleDrop={handleDrop}
            loadFile={loadFile}
            setIsDragging={setIsDragging}
          />
        )}

        {phase === "editor" && (
          <EditorPhase
            isDownloading={isDownloading}
            fontMeta={fontMeta}
            customText={customText}
            selectedPresets={selectedPresets}
            presetCounts={presetCounts}
            exportFormat={exportFormat}
            infoExpanded={infoExpanded}
            errorMsg={errorMsg}
            fontFamilyName={fontFamilyName}
            setCustomText={setCustomText}
            setExportFormat={setExportFormat}
            setInfoExpanded={setInfoExpanded}
            charSet={charSet}
            estimatedSize={estimatedSize}
            previewText={previewText}
            pct={pct}
            togglePreset={togglePreset}
            downloadSubset={downloadSubset}
          />
        )}
      </main>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        textarea,button { font-family: inherit; }
      `}</style>
      <input
        ref={fileInputRef}
        type="file"
        accept=".ttf,.otf,.woff"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) loadFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function UploadPhase({
  isLoading,
  isDragging,
  errorMsg,
  fileInputRef,
  handleDrop,
  loadFile,
  setIsDragging,
}: {
  isLoading: boolean;
  isDragging: boolean;
  errorMsg: string;
  fileInputRef: RefObject<HTMLInputElement>;
  handleDrop: DragEventHandler<HTMLDivElement>;
  loadFile: (file: File) => Promise<void>;
  setIsDragging: Dispatch<SetStateAction<boolean>>;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 32,
        paddingTop: 28,
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 580 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: C.tint,
            border: `1px solid ${C.border}`,
            borderRadius: 20,
            padding: "4px 14px",
            fontSize: 12,
            color: C.primary,
            fontWeight: 600,
            marginBottom: 16,
          }}
        >
          <Scissors size={11} /> 在线字体裁剪 · 免费使用
        </div>
        <h1
          style={{
            fontSize: 40,
            fontWeight: 800,
            color: C.textDark,
            margin: "0 0 12px",
            lineHeight: 1.25,
            letterSpacing: -0.5,
          }}
        >
          精简字体，只保留 <span style={{ color: C.primary }}>必要字符</span>
        </h1>
        <p
          style={{
            fontSize: 15,
            color: C.textBody,
            margin: 0,
            lineHeight: 1.75,
          }}
        >
          上传 TTF / OTF / WOFF 字体文件，按需提取所需字符
          <br />
          将数 MB 的大字体裁剪成几十 KB 的精简版本
        </p>
      </div>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !isLoading && fileInputRef.current?.click()}
        style={{
          width: "100%",
          maxWidth: 520,
          padding: "48px 32px",
          borderRadius: 18,
          border: `2px dashed ${isDragging ? C.primary : C.border}`,
          background: isDragging ? C.tint : C.white,
          boxShadow: isDragging
            ? `0 0 0 3px ${C.tint}`
            : `0 2px 16px ${C.shadow}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          cursor: isLoading ? "default" : "pointer",
          transition: "all 0.2s",
        }}
      >
        {isLoading ? (
          <>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: C.tint,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Loader2
                size={28}
                color={C.primary}
                style={{ animation: "spin 0.9s linear infinite" }}
              />
            </div>
            <div style={{ color: C.primary, fontWeight: 600, fontSize: 14 }}>
              正在解析字体文件…
            </div>
          </>
        ) : (
          <>
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: 18,
                background: C.tint,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Upload size={30} color={C.primary} />
            </div>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: C.textDark,
                  marginBottom: 4,
                }}
              >
                拖拽字体文件到此处
              </div>
              <div style={{ fontSize: 13, color: C.textMuted }}>
                或点击选择文件上传
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {["TTF", "OTF", "WOFF"].map((item) => (
                <span
                  key={item}
                  style={{
                    padding: "3px 11px",
                    borderRadius: 6,
                    background: C.tint,
                    color: C.primary,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {item}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {errorMsg && <ErrorBanner msg={errorMsg} />}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: 14,
          width: "100%",
          maxWidth: 680,
        }}
      >
        {[
          {
            icon: "✂️",
            title: "精准裁剪",
            desc: "只保留您需要的字符，大幅减小字体文件体积",
          },
          {
            icon: "📦",
            title: "多格式支持",
            desc: "支持 TTF、OTF、WOFF 等主流字体格式输入",
          },
          {
            icon: "👁️",
            title: "实时预览",
            desc: "即时查看裁剪后字体的实际显示效果",
          },
        ].map((item) => (
          <div
            key={item.title}
            style={{
              background: C.white,
              borderRadius: 14,
              padding: "18px 16px",
              textAlign: "center",
              border: `1px solid ${C.border}`,
              boxShadow: `0 1px 6px ${C.shadow}`,
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                margin: "0 auto 12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background:
                  item.icon === "✂️"
                    ? "#EDF0FF"
                    : item.icon === "📦"
                      ? "#FFF3E0"
                      : "#E8F8F2",
              }}
            >
              {item.icon === "✂️" && <Scissors size={24} color="#7180F5" />}
              {item.icon === "📦" && <Package size={24} color="#F59E0B" />}
              {item.icon === "👁️" && <Eye size={24} color="#10B981" />}
            </div>
            <div
              style={{
                fontWeight: 700,
                fontSize: 13,
                color: C.textDark,
                marginBottom: 4,
              }}
            >
              {item.title}
            </div>
            <div
              style={{
                fontSize: 12,
                color: C.textMuted,
                lineHeight: 1.6,
              }}
            >
              {item.desc}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EditorPhase({
  isDownloading,
  fontMeta,
  customText,
  selectedPresets,
  presetCounts,
  exportFormat,
  infoExpanded,
  errorMsg,
  fontFamilyName,
  setCustomText,
  setExportFormat,
  setInfoExpanded,
  charSet,
  estimatedSize,
  previewText,
  pct,
  togglePreset,
  downloadSubset,
}: {
  isDownloading: boolean;
  fontMeta: FontMeta | null;
  customText: string;
  selectedPresets: Record<string, boolean>;
  presetCounts: Record<string, number | null>;
  exportFormat: ExportFormat;
  infoExpanded: boolean;
  errorMsg: string;
  fontFamilyName: string;
  setCustomText: Dispatch<SetStateAction<string>>;
  setExportFormat: Dispatch<SetStateAction<ExportFormat>>;
  setInfoExpanded: Dispatch<SetStateAction<boolean>>;
  charSet: Set<string>;
  estimatedSize: string | null;
  previewText: string;
  pct: number;
  togglePreset: (key: string) => void;
  downloadSubset: () => Promise<void>;
}) {
  const resolvedExportFormat = exportFormat ?? "otf";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 292px",
        gap: 20,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <Card>
          <StepLabel
            n={1}
            label="输入需要保留的文字"
            extra={charSet.size > 0 ? `已选 ${charSet.size} 个字符` : undefined}
          />
          <textarea
            value={customText}
            onChange={(event) => setCustomText(event.target.value)}
            placeholder="在此输入需要保留的文字内容，或勾选下方字符集自动填入…"
            rows={4}
            style={{
              width: "100%",
              padding: "11px 13px",
              borderRadius: 9,
              border: `1.5px solid ${C.border}`,
              fontSize: 13,
              color: C.textDark,
              background: C.tintXLight,
              resize: "vertical",
              outline: "none",
              boxSizing: "border-box",
              lineHeight: 1.7,
              fontFamily: "monospace, inherit",
              transition: "border-color 0.2s",
              maxHeight: 240,
              overflowY: "auto",
              wordBreak: "break-all",
            }}
            onFocus={(event) => (event.target.style.borderColor = C.primary)}
            onBlur={(event) => (event.target.style.borderColor = C.border)}
          />
        </Card>

        <Card>
          <StepLabel n={2} label="快速选择字符集" />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {CHAR_PRESETS.map((preset) => {
              const checked = !!selectedPresets[preset.key];
              const count = presetCounts[preset.key];

              return (
                <label
                  key={preset.key}
                  onClick={() => togglePreset(preset.key)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 15px",
                    borderRadius: 10,
                    border: `1.5px solid ${checked ? C.primary : C.border}`,
                    background: checked ? C.tint : C.white,
                    cursor: "pointer",
                    userSelect: "none",
                    transition: "all 0.15s",
                  }}
                >
                  <div
                    style={{
                      width: 19,
                      height: 19,
                      borderRadius: 5,
                      border: `2px solid ${checked ? C.primary : "#D1D5DB"}`,
                      background: checked ? C.primary : C.white,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      transition: "all 0.15s",
                    }}
                  >
                    {checked && <Check size={11} color="white" strokeWidth={3} />}
                  </div>
                  <span
                    style={{
                      flex: 1,
                      fontSize: 14,
                      color: C.textDark,
                      fontWeight: checked ? 600 : 400,
                    }}
                  >
                    {preset.label}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      color:
                        count === null
                          ? "#D1D5DB"
                          : checked
                            ? C.primary
                            : C.textMuted,
                      fontWeight: 500,
                      minWidth: 68,
                      textAlign: "right",
                    }}
                  >
                    {count === null ? (
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 3,
                          justifyContent: "flex-end",
                        }}
                      >
                        <Loader2
                          size={10}
                          style={{ animation: "spin 0.9s linear infinite" }}
                        />{" "}
                        计算中
                      </span>
                    ) : (
                      `${count}/${preset.totalCount}`
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        </Card>

        <div
          style={{
            background: C.white,
            borderRadius: 16,
            border: `1px solid ${C.border}`,
            boxShadow: `0 2px 12px ${C.shadow}`,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "13px 20px",
              borderBottom: `1px solid ${C.border}`,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <StepBadge n={3} />
            <span style={{ fontSize: 14, fontWeight: 700, color: C.textDark }}>
              效果预览
            </span>
            <span style={{ marginLeft: "auto", fontSize: 11, color: C.textMuted }}>
              使用已上传字体渲染
            </span>
          </div>
          <div
            style={{
              padding: "24px 20px",
              minHeight: 160,
              maxHeight: 280,
              overflow: "auto",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "flex-start",
              background: C.white,
            }}
          >
            <div
              style={{
                fontSize: 24,
                fontFamily: `'${fontFamilyName}',sans-serif`,
                color: C.textDark,
                textAlign: "left",
                wordBreak: "break-all",
                lineHeight: 1.4,
                whiteSpace: "pre-wrap",
              }}
            >
              {previewText}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {fontMeta && (
          <Card>
            <button
              onClick={() => setInfoExpanded((value) => !value)}
              style={{
                display: "flex",
                alignItems: "center",
                width: "100%",
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                marginBottom: infoExpanded ? 14 : 0,
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: C.textDark,
                  flex: 1,
                  textAlign: "left",
                }}
              >
                字体信息
              </span>
              {infoExpanded ? (
                <ChevronUp size={15} color={C.textMuted} />
              ) : (
                <ChevronDown size={15} color={C.textMuted} />
              )}
            </button>

            {infoExpanded && (
              <>
                <div
                  style={{
                    background: C.tint,
                    borderRadius: 10,
                    padding: "14px 10px",
                    textAlign: "center",
                    marginBottom: 14,
                  }}
                >
                  <div
                      style={{
                      fontSize: 28,
                      fontFamily: `'${fontFamilyName}',sans-serif`,
                      color: C.textDark,
                      marginBottom: 3,
                    }}
                  >
                    字 Aa 012
                  </div>
                  <div style={{ fontSize: 11, color: C.textAccent }}>
                    字体预览
                  </div>
                </div>
                {[
                  { label: "字体名称", value: fontMeta.familyName },
                  {
                    label: "字符数量",
                    value: `${fontMeta.glyphCount.toLocaleString()} 个`,
                  },
                  { label: "字体作者", value: fontMeta.author },
                  {
                    label: "字体大小",
                    value: formatSize(fontMeta.fileSizeBytes),
                  },
                  { label: "文件格式", value: fontMeta.fileExt },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      padding: "7px 0",
                      borderBottom: `1px solid ${C.tint}`,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        color: C.textMuted,
                        flexShrink: 0,
                      }}
                    >
                      {item.label}
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        color: C.textDark,
                        fontWeight: 600,
                        textAlign: "right",
                        maxWidth: "60%",
                        wordBreak: "break-word",
                      }}
                    >
                      {item.value}
                    </span>
                  </div>
                ))}
              </>
            )}
          </Card>
        )}

        <Card>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: C.textDark,
              marginBottom: 14,
            }}
          >
            裁剪信息
          </div>

          <div
            style={{
              background: C.tint,
              borderRadius: 11,
              padding: "14px",
              marginBottom: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <span style={{ fontSize: 12, color: C.textBody }}>
                裁剪后包含字符
              </span>
              <span style={{ fontSize: 22, fontWeight: 800, color: C.primary }}>
                {charSet.size}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: charSet.size > 0 ? 10 : 0,
              }}
            >
              <span style={{ fontSize: 12, color: C.textBody }}>
                预估裁减后大小
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.primary }}>
                {estimatedSize ?? "—"}
              </span>
            </div>

            {fontMeta && charSet.size > 0 && (
              <>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 11,
                    color: C.textMuted,
                    marginBottom: 5,
                  }}
                >
                  <span>原始: {formatSize(fontMeta.fileSizeBytes)}</span>
                  <span>目标: {estimatedSize}</span>
                </div>
                <div
                  style={{
                    height: 5,
                    background: C.border,
                    borderRadius: 3,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${pct}%`,
                      background: C.primary,
                      borderRadius: 3,
                      transition: "width 0.4s ease",
                    }}
                  />
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: C.textMuted,
                    marginTop: 4,
                    textAlign: "right",
                  }}
                >
                  {charSet.size} / {fontMeta.glyphCount} 字符
                </div>
              </>
            )}
          </div>

          <div style={{ marginBottom: 14 }}>
            <div
              style={{
                fontSize: 12,
                color: C.textBody,
                marginBottom: 8,
              }}
            >
              导出格式
            </div>
            <select
              value={resolvedExportFormat}
              onChange={(event) =>
                setExportFormat(event.target.value as ExportFormat)
              }
              style={{
                width: "100%",
                padding: "11px 12px",
                borderRadius: 10,
                border: `1.5px solid ${C.border}`,
                background: C.white,
                color: C.textDark,
                fontSize: 14,
                fontWeight: 600,
                outline: "none",
              }}
            >
              {EXPORT_FORMATS.map((format) => (
                <option key={format.value} value={format.value}>
                  {format.label}
                </option>
              ))}
            </select>
            <div
              style={{
                marginTop: 8,
                fontSize: 11,
                color: C.textMuted,
                lineHeight: 1.5,
              }}
            >
              选择后将按该格式导出，下载文件名会自动切换。
            </div>
          </div>

          <button
            onClick={downloadSubset}
            disabled={charSet.size === 0 || isDownloading}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: 10,
              border: "none",
              background: charSet.size === 0 ? "#F0F1F5" : C.primary,
              color: charSet.size === 0 ? C.textMuted : C.white,
              fontSize: 14,
              fontWeight: 700,
              cursor: charSet.size === 0 ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "background 0.15s",
              marginBottom: 8,
              boxShadow:
                charSet.size > 0
                  ? `0 3px 10px rgba(113,128,245,0.30)`
                  : "none",
            }}
            onMouseEnter={(event) => {
              if (charSet.size > 0) {
                event.currentTarget.style.background = C.primaryDk;
              }
            }}
            onMouseLeave={(event) => {
              if (charSet.size > 0) {
                event.currentTarget.style.background = C.primary;
              }
            }}
          >
            {isDownloading ? (
              <>
                <Loader2
                  size={15}
                  style={{ animation: "spin 0.9s linear infinite" }}
                />{" "}
                裁剪中…
              </>
            ) : (
              <>
                <Download size={15} /> 下载裁剪后的{" "}
                {resolvedExportFormat.toUpperCase()} 字体
              </>
            )}
          </button>

          {charSet.size === 0 && (
            <p
              style={{
                fontSize: 12,
                color: C.textMuted,
                textAlign: "center",
                margin: 0,
              }}
            >
              请先输入文字或勾选字符集
            </p>
          )}
          {errorMsg && <ErrorBanner msg={errorMsg} />}
        </Card>

        <div
          style={{
            background: C.tint,
            borderRadius: 13,
            padding: "15px 16px",
            border: `1px solid ${C.border}`,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: C.primary,
              marginBottom: 8,
            }}
          >
            💡 使用说明
          </div>
          <ul
            style={{
              margin: 0,
              padding: "0 0 0 15px",
              fontSize: 12,
              color: C.textBody,
              lineHeight: 1.9,
            }}
          >
            <li>在文字框中输入需要保留的内容</li>
            <li>勾选预设字符集可批量添加字符</li>
            <li>支持 TTF / OTF / WOFF 格式输入</li>
            <li>导出格式可选为 OTF / TTF</li>
            <li>所有处理在本地完成，不上传服务器</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
