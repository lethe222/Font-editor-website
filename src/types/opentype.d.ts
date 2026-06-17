declare module 'opentype.js' {
  interface Glyph {
    index: number;
    unicode?: number;
    unicodes?: number[];
    name: string;
    advanceWidth: number;
  }

  interface GlyphSet {
    length: number;
    get(index: number): Glyph;
  }

  interface Font {
    names: Record<string, Record<string, string>>;
    glyphs: GlyphSet;
    unitsPerEm: number;
    ascender: number;
    descender: number;
    charToGlyph(char: string): Glyph;
    toArrayBuffer(): ArrayBuffer;
    download(filename?: string): void;
  }

  interface FontOptions {
    familyName: string;
    styleName: string;
    unitsPerEm: number;
    ascender: number;
    descender: number;
    glyphs: Glyph[];
  }

  export class Font implements Font {
    constructor(options: FontOptions);
  }

  export function parse(buffer: ArrayBuffer, opt?: object): Font;
}
