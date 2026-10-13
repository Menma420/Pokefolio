/** Runtime choice and distribution authorization are deliberately independent. */
export function gameImplementation(env:Readonly<Record<string,string|undefined>>):'emerald'|'legacy' {
 return env.NODE_ENV==='development'&&env.POKEFOLIO_WORLD==='legacy'?'legacy':'emerald';
}
