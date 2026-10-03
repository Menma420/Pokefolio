import glyphs from '../../../assets-src/font/glyphs.json';
export function glyphAdvance(char: string): number {
 const rows = (glyphs as Record<string,string>)[char];
 if (!rows) throw new Error(`Unsupported bitmap glyph: ${char}`);
 return /[0-9]/.test(char) ? 6 : Math.max(3, rows.split('/')[0]!.length+1);
}
export function paginateDialogue(text: string, width: number, secondLineInset=0): string[] {
 const lines: string[] = [];
 for (const paragraph of text.split('\n')) {
  let line=''; let used=0;
  for (const word of paragraph.split(/\s+/).filter(Boolean)) {
   const size=[...word].reduce((n,c)=>n+glyphAdvance(c),0);
   if(size>width) throw new Error(`Dialogue word exceeds ${width}px: ${word}`);
   if(line && used+glyphAdvance(' ')+size>width-(lines.length%2?secondLineInset:0)) { lines.push(line); line=''; used=0; }
   if(size>width-(lines.length%2?secondLineInset:0)){lines.push('');}
   if(line) { line+=' '; used+=glyphAdvance(' '); }
   line+=word; used+=size;
  }
  lines.push(line);
 }
 const pages=[]; for(let i=0;i<lines.length;i+=2) pages.push(lines.slice(i,i+2).join('\n'));
 return pages;
}
