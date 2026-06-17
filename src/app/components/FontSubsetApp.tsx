import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { parse as parseFont, Font, type Glyph } from 'opentype.js';
import {
  Upload, Download, Scissors, RefreshCw, Check, Loader2,
  ChevronDown, ChevronUp, AlertCircle, Package, Eye
} from 'lucide-react';

// ── Design tokens (reference: image-3 periwinkle palette) ────────────────────
const C = {
  primary:    '#7180F5',   // soft periwinkle blue-purple
  primaryDk:  '#5A6ADE',   // slightly darker for hover
  tint:       '#EDF0FF',   // very light primary tint – card fills, stat boxes
  tintXLight: '#F5F6FD',   // page background (near-white with faintest blue)
  border:     '#E5E9F8',   // card borders
  shadow:     'rgba(113,128,245,0.06)',
  textDark:   '#1C1B3A',   // headings / dark text
  textBody:   '#4B5563',   // body text
  textMuted:  '#9BA3BE',   // muted / placeholder
  textAccent: '#7180F5',   // accent text (same as primary)
  white:      '#FFFFFF',
  danger:     '#DC2626',
  dangerBg:   '#FEF2F2',
  dangerBdr:  '#FECACA',
};

// ── Character Presets ─────────────────────────────────────────────────────────
const NUMBERS_AND_ALPHA =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const COMMON_PUNCT = ' !"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~ ';
const CHINESE_PUNCT =
  '，。？！：；“”‘’（）【】《》〈〉「」『』〔〕…—·～、';
const COMMON_CHINESE = Array.from(
  { length: 8105 },
  (_, i) => String.fromCodePoint(0x4e00 + i)
).join('');

const CHAR_PRESETS = [
  { key: 'numbers',     label: '数字和英文字母',   chars: NUMBERS_AND_ALPHA, totalCount: 62   },
  { key: 'punct',       label: '常见标点符号',     chars: COMMON_PUNCT,      totalCount: 33   },
  { key: 'chinese',     label: '通用规范汉字列表', chars: COMMON_CHINESE,    totalCount: 8105 },
  { key: 'chinesePunct',label: '汉字标点符号',     chars: CHINESE_PUNCT,     totalCount: 26   },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getNameEntry(names: Record<string, any>, key: string): string {
  const e = names?.[key];
  if (!e) return '';
  if (typeof e === 'string') return e;
  return e.en || e['zh-CN'] || e['zh-Hans'] || e['zh-Hant'] || (Object.values(e)[0] as string) || '';
}

interface FontMeta {
  familyName: string; subfamilyName: string; author: string;
  glyphCount: number; fileSizeBytes: number; fileExt: string;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function FontSubsetApp() {
  const [phase, setPhase]               = useState<'upload' | 'editor'>('upload');
  const [isLoading, setIsLoading]       = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDragging, setIsDragging]     = useState(false);
  const [fontMeta, setFontMeta]         = useState<FontMeta | null>(null);
  const [parsedFont, setParsedFont]     = useState<any>(null);
  const [customText, setCustomText]     = useState('');
  const [selectedPresets, setSelectedPresets] = useState<Record<string, boolean>>({});
  const [presetCounts, setPresetCounts] = useState<Record<string, number | null>>({});
  const [infoExpanded, setInfoExpanded] = useState(true);
  const [errorMsg, setErrorMsg]         = useState('');

  const fileInputRef   = useRef<HTMLInputElement>(null);
  const styleElemRef   = useRef<HTMLStyleElement | null>(null);
  const fontUrlRef     = useRef<string | null>(null);
  const fontFaceFamily = useRef(`pf_${Date.now()}`);

  // charSet is purely derived from customText – presets inject their chars into customText directly
  const charSet = useMemo(() => {
    const s = new Set<string>();
    for (const c of customText) { if (c !== '\n' && c !== '\r' && c !== '\t') s.add(c); }
    return s;
  }, [customText]);

  const estimatedSize = useMemo(() => {
    if (!fontMeta || charSet.size === 0) return null;
    const perGlyph = fontMeta.fileSizeBytes / Math.max(fontMeta.glyphCount, 1);
    return formatSize(Math.max(5120 + charSet.size * perGlyph, 1024));
  }, [fontMeta, charSet]);

  // Toggle a preset: add its chars to customText when checking, remove when unchecking
  const togglePreset = useCallback((key: string) => {
    const preset = CHAR_PRESETS.find(p => p.key === key);
    if (!preset) return;
    const willBeChecked = !selectedPresets[key];

    if (willBeChecked) {
      // Add chars not already present in the textarea
      setCustomText(prev => {
        const existing = new Set(prev);
        const toAdd = [...preset.chars].filter(c => !existing.has(c));
        return prev + toAdd.join('');
      });
    } else {
      // Remove chars that belong to this preset and are NOT in any other checked preset
      const otherPresetChars = new Set<string>();
      for (const p of CHAR_PRESETS) {
        if (p.key !== key && selectedPresets[p.key]) {
          for (const c of p.chars) otherPresetChars.add(c);
        }
      }
      const removing = new Set(preset.chars);
      setCustomText(prev =>
        [...prev].filter(c => !removing.has(c) || otherPresetChars.has(c)).join('')
      );
    }
    setSelectedPresets(p => ({ ...p, [key]: willBeChecked }));
  }, [selectedPresets]);

  const computeCounts = useCallback((font: ReturnType<typeof parseFont>) => {
    const result: Record<string, number | null> = {};
    for (const preset of CHAR_PRESETS) {
      let n = 0;
      for (const c of preset.chars) { try { const g = font.charToGlyph(c); if (g?.index !== 0) n++; } catch {} }
      result[preset.key] = n;
    }
    setPresetCounts(result);
  }, []);

  const injectFontFace = useCallback((buffer: ArrayBuffer, ext: string) => {
    if (styleElemRef.current) { document.head.removeChild(styleElemRef.current); styleElemRef.current = null; }
    if (fontUrlRef.current)   { URL.revokeObjectURL(fontUrlRef.current); fontUrlRef.current = null; }
    const mime = ext === 'woff' ? 'font/woff' : ext === 'woff2' ? 'font/woff2' : 'font/opentype';
    const url  = URL.createObjectURL(new Blob([buffer], { type: mime }));
    fontUrlRef.current = url;
    const style = document.createElement('style');
    style.textContent = `@font-face{font-family:'${fontFaceFamily.current}';src:url('${url}')}`;
    document.head.appendChild(style);
    styleElemRef.current = style;
  }, []);

  const loadFile = useCallback(async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!['ttf', 'otf', 'woff'].includes(ext)) { setErrorMsg('请上传 TTF、OTF 或 WOFF 格式的字体文件'); return; }
    setErrorMsg(''); setIsLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const font   = parseFont(buffer);
      injectFontFace(buffer, ext);
      setFontMeta({
        familyName:    getNameEntry(font.names, 'fullName') || getNameEntry(font.names, 'fontFamily') || file.name.replace(/\.[^.]+$/, ''),
        subfamilyName: getNameEntry(font.names, 'fontSubfamily') || 'Regular',
        author:        getNameEntry(font.names, 'designer') || getNameEntry(font.names, 'manufacturer') || '—',
        glyphCount:    font.glyphs.length,
        fileSizeBytes: buffer.byteLength,
        fileExt:       ext.toUpperCase(),
      });
      setParsedFont(font);
      setCustomText(''); setSelectedPresets({});
      setPresetCounts({ numbers: null, punct: null, chinese: null, chinesePunct: null });
      setPhase('editor');
      setTimeout(() => computeCounts(font), 200);
    } catch { setErrorMsg('字体解析失败，请检查文件是否损坏或格式不支持'); }
    finally   { setIsLoading(false); }
  }, [computeCounts, injectFontFace]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files?.[0]; if (file) loadFile(file);
  }, [loadFile]);

  const downloadSubset = useCallback(async () => {
    if (!parsedFont || !fontMeta || charSet.size === 0) return;
    setIsDownloading(true);
    try {
      const notdef: Glyph = parsedFont.glyphs.get(0);
      const glyphs: Glyph[] = [notdef];
      const seen = new Set<number>([0]);
      for (const char of charSet) {
        try {
          const g: Glyph = parsedFont.charToGlyph(char);
          if (g && g.index !== 0 && !seen.has(g.index)) { seen.add(g.index); glyphs.push(g); }
        } catch {}
      }
      const subFont = new Font({ familyName: fontMeta.familyName, styleName: fontMeta.subfamilyName, unitsPerEm: parsedFont.unitsPerEm, ascender: parsedFont.ascender, descender: parsedFont.descender, glyphs } as any);
      const blob = new Blob([subFont.toArrayBuffer()], { type: 'font/opentype' });
      const url  = URL.createObjectURL(blob);
      const a    = Object.assign(document.createElement('a'), { href: url, download: `${fontMeta.familyName}_subset.otf` });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch { setErrorMsg('字体裁剪失败，请重试'); }
    finally   { setIsDownloading(false); }
  }, [parsedFont, fontMeta, charSet]);

  const resetTool = useCallback(() => {
    setPhase('upload'); setParsedFont(null); setFontMeta(null);
    setCustomText(''); setSelectedPresets({}); setPresetCounts({}); setErrorMsg('');
  }, []);

  useEffect(() => () => {
    if (styleElemRef.current) document.head.removeChild(styleElemRef.current);
    if (fontUrlRef.current)   URL.revokeObjectURL(fontUrlRef.current);
  }, []);

  // Preview: show unique chars up to 80 so it stays readable; for large preset selections this avoids a wall of text
  const previewText = (() => {
    const unique = [...charSet].slice(0, 80).join('');
    return unique || '字体裁剪预览效果';
  })();
  const pct = fontMeta ? Math.min(100, (charSet.size / Math.max(fontMeta.glyphCount, 1)) * 100) : 0;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: C.tintXLight, fontFamily: '"PingFang SC","Microsoft YaHei","Noto Sans SC",Inter,sans-serif' }}>

      {/* HEADER */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: C.white, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Scissors size={17} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: C.textDark, lineHeight: 1.2 }}>字体裁剪工具</div>
              <div style={{ fontSize: 11, color: C.textAccent }}>Font Subset Tool</div>
            </div>
          </div>
          {phase === 'editor' && (
            <button onClick={resetTool} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 8, border: `1.5px solid ${C.border}`, background: C.white, color: C.primary, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <RefreshCw size={13} /> 重新选择字体文件
            </button>
          )}
        </div>
      </header>

      <main style={{ maxWidth: 1160, margin: '0 auto', padding: '40px 24px 64px' }}>

        {/* ── UPLOAD PHASE ──────────────────────────────────────────────────── */}
        {phase === 'upload' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32, paddingTop: 28 }}>

            {/* Hero */}
            <div style={{ textAlign: 'center', maxWidth: 580 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: C.tint, border: `1px solid ${C.border}`, borderRadius: 20, padding: '4px 14px', fontSize: 12, color: C.primary, fontWeight: 600, marginBottom: 16 }}>
                <Scissors size={11} /> 在线字体裁剪 · 免费使用
              </div>
              <h1 style={{ fontSize: 40, fontWeight: 800, color: C.textDark, margin: '0 0 12px', lineHeight: 1.25, letterSpacing: -0.5 }}>
                精简字体，只保留{' '}
                <span style={{ color: C.primary }}>必要字符</span>
              </h1>
              <p style={{ fontSize: 15, color: C.textBody, margin: 0, lineHeight: 1.75 }}>
                上传 TTF / OTF / WOFF 字体文件，按需提取所需字符<br />
                将数 MB 的大字体裁剪成几十 KB 的精简版本
              </p>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => !isLoading && fileInputRef.current?.click()}
              style={{
                width: '100%', maxWidth: 520, padding: '48px 32px', borderRadius: 18,
                border: `2px dashed ${isDragging ? C.primary : C.border}`,
                background: isDragging ? C.tint : C.white,
                boxShadow: isDragging ? `0 0 0 3px ${C.tint}` : `0 2px 16px ${C.shadow}`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
                cursor: isLoading ? 'default' : 'pointer', transition: 'all 0.2s',
              }}
            >
              {isLoading ? (
                <>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: C.tint, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Loader2 size={28} color={C.primary} style={{ animation: 'spin 0.9s linear infinite' }} />
                  </div>
                  <div style={{ color: C.primary, fontWeight: 600, fontSize: 14 }}>正在解析字体文件…</div>
                </>
              ) : (
                <>
                  <div style={{ width: 68, height: 68, borderRadius: 18, background: C.tint, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Upload size={30} color={C.primary} />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: C.textDark, marginBottom: 4 }}>拖拽字体文件到此处</div>
                    <div style={{ fontSize: 13, color: C.textMuted }}>或点击选择文件上传</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['TTF', 'OTF', 'WOFF'].map((f) => (
                      <span key={f} style={{ padding: '3px 11px', borderRadius: 6, background: C.tint, color: C.primary, fontSize: 12, fontWeight: 600 }}>{f}</span>
                    ))}
                  </div>
                </>
              )}
            </div>

            {errorMsg && <ErrorBanner msg={errorMsg} />}

            {/* Feature cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, width: '100%', maxWidth: 680 }}>
              {[
                { icon: '✂️', title: '精准裁剪', desc: '只保留您需要的字符，大幅减小字体文件体积' },
                { icon: '📦', title: '多格式支持', desc: '支持 TTF、OTF、WOFF 等主流字体格式输入' },
                { icon: '👁️', title: '实时预览', desc: '即时查看裁剪后字体的实际显示效果' },
              ].map((f) => (
                <div key={f.title} style={{ background: C.white, borderRadius: 14, padding: '18px 16px', textAlign: 'center', border: `1px solid ${C.border}`, boxShadow: `0 1px 6px ${C.shadow}` }}>
                  <div style={{ width: 52, height: 52, borderRadius: 14, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: f.icon === '✂️' ? '#EDF0FF' : f.icon === '📦' ? '#FFF3E0' : '#E8F8F2' }}>
                    {f.icon === '✂️' && <Scissors size={24} color="#7180F5" />}
                    {f.icon === '📦' && <Package size={24} color="#F59E0B" />}
                    {f.icon === '👁️' && <Eye size={24} color="#10B981" />}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: C.textDark, marginBottom: 4 }}>{f.title}</div>
                  <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.6 }}>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── EDITOR PHASE ──────────────────────────────────────────────────── */}
        {phase === 'editor' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 292px', gap: 20 }}>

            {/* LEFT */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* Step 1 */}
              <Card>
                <StepLabel n={1} label="输入需要保留的文字" extra={charSet.size > 0 ? `已选 ${charSet.size} 个字符` : undefined} />
                <textarea
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="在此输入需要保留的文字内容，或勾选下方字符集自动填入…"
                  rows={4}
                  style={{ width: '100%', padding: '11px 13px', borderRadius: 9, border: `1.5px solid ${C.border}`, fontSize: 13, color: C.textDark, background: C.tintXLight, resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.7, fontFamily: 'monospace, inherit', transition: 'border-color 0.2s', maxHeight: 240, overflowY: 'auto', wordBreak: 'break-all' }}
                  onFocus={(e) => (e.target.style.borderColor = C.primary)}
                  onBlur={(e)  => (e.target.style.borderColor = C.border)}
                />
              </Card>

              {/* Step 2 */}
              <Card>
                <StepLabel n={2} label="快速选择字符集" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {CHAR_PRESETS.map((preset) => {
                    const checked = !!selectedPresets[preset.key];
                    const cnt     = presetCounts[preset.key];
                    return (
                      <label key={preset.key} onClick={() => togglePreset(preset.key)}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 15px', borderRadius: 10, border: `1.5px solid ${checked ? C.primary : C.border}`, background: checked ? C.tint : C.white, cursor: 'pointer', userSelect: 'none', transition: 'all 0.15s' }}>
                        {/* checkbox */}
                        <div style={{ width: 19, height: 19, borderRadius: 5, border: `2px solid ${checked ? C.primary : '#D1D5DB'}`, background: checked ? C.primary : C.white, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                          {checked && <Check size={11} color="white" strokeWidth={3} />}
                        </div>
                        <span style={{ flex: 1, fontSize: 14, color: C.textDark, fontWeight: checked ? 600 : 400 }}>{preset.label}</span>
                        <span style={{ fontSize: 13, color: cnt === null ? '#D1D5DB' : checked ? C.primary : C.textMuted, fontWeight: 500, minWidth: 68, textAlign: 'right' }}>
                          {cnt === null
                            ? <span style={{ display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'flex-end' }}><Loader2 size={10} style={{ animation: 'spin 0.9s linear infinite' }} /> 计算中</span>
                            : `${cnt}/${preset.totalCount}`}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </Card>

              {/* Step 3: Preview */}
              <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, boxShadow: `0 2px 12px ${C.shadow}`, overflow: 'hidden' }}>
                <div style={{ padding: '13px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <StepBadge n={3} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.textDark }}>效果预览</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: C.textMuted }}>使用已上传字体渲染</span>
                </div>
                <div style={{ padding: '40px 28px', minHeight: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.white }}>
                  <div style={{ fontSize: 36, fontFamily: `'${fontFaceFamily.current}',sans-serif`, color: C.textDark, textAlign: 'center', wordBreak: 'break-all', lineHeight: 1.5 }}>
                    {previewText}
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* Font info */}
              {fontMeta && (
                <Card>
                  <button onClick={() => setInfoExpanded((v) => !v)}
                    style={{ display: 'flex', alignItems: 'center', width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer', marginBottom: infoExpanded ? 14 : 0 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: C.textDark, flex: 1, textAlign: 'left' }}>字体信息</span>
                    {infoExpanded ? <ChevronUp size={15} color={C.textMuted} /> : <ChevronDown size={15} color={C.textMuted} />}
                  </button>

                  {infoExpanded && (
                    <>
                      {/* mini glyph preview */}
                      <div style={{ background: C.tint, borderRadius: 10, padding: '14px 10px', textAlign: 'center', marginBottom: 14 }}>
                        <div style={{ fontSize: 28, fontFamily: `'${fontFaceFamily.current}',sans-serif`, color: C.textDark, marginBottom: 3 }}>字 Aa 012</div>
                        <div style={{ fontSize: 11, color: C.textAccent }}>字体预览</div>
                      </div>
                      {[
                        { label: '字体名称', value: fontMeta.familyName },
                        { label: '字符数量', value: `${fontMeta.glyphCount.toLocaleString()} 个` },
                        { label: '字体作者', value: fontMeta.author },
                        { label: '字体大小', value: formatSize(fontMeta.fileSizeBytes) },
                        { label: '文件格式', value: fontMeta.fileExt },
                      ].map((item) => (
                        <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '7px 0', borderBottom: `1px solid ${C.tint}` }}>
                          <span style={{ fontSize: 12, color: C.textMuted, flexShrink: 0 }}>{item.label}</span>
                          <span style={{ fontSize: 13, color: C.textDark, fontWeight: 600, textAlign: 'right', maxWidth: '60%', wordBreak: 'break-word' }}>{item.value}</span>
                        </div>
                      ))}
                    </>
                  )}
                </Card>
              )}

              {/* Subset stats + download */}
              <Card>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.textDark, marginBottom: 14 }}>裁剪信息</div>

                {/* Stats box */}
                <div style={{ background: C.tint, borderRadius: 11, padding: '14px', marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: C.textBody }}>裁剪后包含字符</span>
                    <span style={{ fontSize: 22, fontWeight: 800, color: C.primary }}>{charSet.size}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: charSet.size > 0 ? 10 : 0 }}>
                    <span style={{ fontSize: 12, color: C.textBody }}>预估裁减后大小</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: C.primary }}>{estimatedSize ?? '—'}</span>
                  </div>

                  {fontMeta && charSet.size > 0 && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.textMuted, marginBottom: 5 }}>
                        <span>原始: {formatSize(fontMeta.fileSizeBytes)}</span>
                        <span>目标: {estimatedSize}</span>
                      </div>
                      <div style={{ height: 5, background: C.border, borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: C.primary, borderRadius: 3, transition: 'width 0.4s ease' }} />
                      </div>
                      <div style={{ fontSize: 10, color: C.textMuted, marginTop: 4, textAlign: 'right' }}>
                        {charSet.size} / {fontMeta.glyphCount} 字符
                      </div>
                    </>
                  )}
                </div>

                {/* Download button */}
                <button
                  onClick={downloadSubset}
                  disabled={charSet.size === 0 || isDownloading}
                  style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: charSet.size === 0 ? '#F0F1F5' : C.primary, color: charSet.size === 0 ? C.textMuted : C.white, fontSize: 14, fontWeight: 700, cursor: charSet.size === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.15s', marginBottom: 8, boxShadow: charSet.size > 0 ? `0 3px 10px rgba(113,128,245,0.30)` : 'none' }}
                  onMouseEnter={(e) => { if (charSet.size > 0) e.currentTarget.style.background = C.primaryDk; }}
                  onMouseLeave={(e) => { if (charSet.size > 0) e.currentTarget.style.background = C.primary; }}
                >
                  {isDownloading
                    ? <><Loader2 size={15} style={{ animation: 'spin 0.9s linear infinite' }} /> 裁剪中…</>
                    : <><Download size={15} /> 下载裁剪后的 OTF 字体</>}
                </button>

                {charSet.size === 0 && <p style={{ fontSize: 12, color: C.textMuted, textAlign: 'center', margin: 0 }}>请先输入文字或勾选字符集</p>}
                {errorMsg && <ErrorBanner msg={errorMsg} />}
              </Card>

              {/* Tip box */}
              <div style={{ background: C.tint, borderRadius: 13, padding: '15px 16px', border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.primary, marginBottom: 8 }}>💡 使用说明</div>
                <ul style={{ margin: 0, padding: '0 0 0 15px', fontSize: 12, color: C.textBody, lineHeight: 1.9 }}>
                  <li>在文字框中输入需要保留的内容</li>
                  <li>勾选预设字符集可批量添加字符</li>
                  <li>支持 TTF / OTF / WOFF 格式输入</li>
                  <li>输出为 OTF 格式（可直接使用）</li>
                  <li>所有处理在本地完成，不上传服务器</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        textarea,button { font-family: inherit; }
      `}</style>
      <input ref={fileInputRef} type="file" accept=".ttf,.otf,.woff" style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f); e.target.value = ''; }} />
    </div>
  );
}

// ── Shared pieces ─────────────────────────────────────────────────────────────
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#FFFFFF', borderRadius: 16, padding: 20, border: `1px solid ${C.border}`, boxShadow: `0 2px 12px ${C.shadow}` }}>
      {children}
    </div>
  );
}

function StepBadge({ n }: { n: number }) {
  return (
    <div style={{ width: 23, height: 23, borderRadius: 7, background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
      {n}
    </div>
  );
}

function StepLabel({ n, label, extra }: { n: number; label: string; extra?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 13 }}>
      <StepBadge n={n} />
      <span style={{ fontSize: 14, fontWeight: 700, color: C.textDark }}>{label}</span>
      {extra && <span style={{ fontSize: 12, color: C.textMuted, marginLeft: 'auto' }}>{extra}</span>}
    </div>
  );
}

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: C.danger, background: C.dangerBg, border: `1px solid ${C.dangerBdr}`, borderRadius: 9, padding: '9px 14px', fontSize: 12, marginTop: 8 }}>
      <AlertCircle size={13} /> {msg}
    </div>
  );
}
