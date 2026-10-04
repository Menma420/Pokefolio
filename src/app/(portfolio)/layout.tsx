import type {ReactNode} from 'react';
import Link from 'next/link';
/** Semantic fallback: all content is server-rendered HTML, independent of Phaser/input. */
export default function PortfolioLayout({children}:{children:ReactNode}){return <div style={{background:'#FDF5C4',color:'#202020',minHeight:'100vh',padding:'24px',fontFamily:'system-ui, sans-serif',lineHeight:1.6}}><nav aria-label="Portfolio pages" style={{display:'flex',gap:16,flexWrap:'wrap'}}>{[['/','Play Pokefolio'],['/about','About'],['/projects','Projects'],['/skills','Skills'],['/experience','Experience'],['/resume','Resume']].map(([href,name])=><Link key={href} href={href!} style={{textDecoration:'underline'}}>{name}</Link>)}</nav><main style={{maxWidth:880,margin:'24px auto'}}>{children}</main></div>;}
