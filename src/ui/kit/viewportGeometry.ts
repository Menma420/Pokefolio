export interface SafeInsets { top:number;right:number;bottom:number;left:number }
export const TOUCH_MARGIN=192;
export const TOUCH_REGION=208;
export function viewportGeometry(width:number,height:number,dpr:number,touch:boolean,insets:SafeInsets,controllerScale:3|4=3) {
 const w=width-insets.left-insets.right,h=height-insets.top-insets.bottom;
 const portrait=height>width;const margin=controllerScale===4?248:TOUCH_MARGIN,region=controllerScale===4?268:TOUCH_REGION;
 const availableWidth=touch&&!portrait?w-margin*2:w;
 const availableHeight=touch&&portrait?h-region:h;
 const fit=Math.floor(Math.min(availableWidth*dpr/240,availableHeight*dpr/160));
 const n=Math.max(1,fit);
 return {n,dpr,touch,portrait,small:fit<1,
  x:Math.round(insets.left*dpr)/dpr+Math.floor((w*dpr-240*n)/2)/dpr,
  y:Math.round(insets.top*dpr)/dpr+(touch&&portrait?0:Math.floor((h*dpr-160*n)/2)/dpr)};
}
