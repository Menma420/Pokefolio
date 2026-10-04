/** Direct gesture only. Never defer opening a window behind animation or a Promise. */
export function safeOpen(destination:string, opener:(url:string,target:string,features:string)=>Window|null=window.open.bind(window)):boolean {
 try {
  const url=new URL(destination,window.location.origin);
  const local=url.origin===window.location.origin&&destination.startsWith('/')&&!destination.startsWith('//');
  if(!(url.protocol==='https:'||url.protocol==='mailto:'||local&&url.protocol==='http:'))return false;
  // noopener deliberately returns null in some browsers; null is not proof of blocking.
  opener(url.href,'_blank','noopener,noreferrer');
  return true;
 }catch{return false;}
}
