import {afterEach,it,expect,vi} from 'vitest';
import {render,cleanup,fireEvent} from '@testing-library/react';
import {Raster} from '../../src/ui/kit/Raster';
import {PixelContext} from '../../src/ui/kit/PixelContext';
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();});
it('keeps one resize observer, uses the latest image, clears old padding and tears down',()=>{
 const observers:{draw:()=>void;disconnect:ReturnType<typeof vi.fn>}[]=[];
 vi.stubGlobal('ResizeObserver',class{disconnect=vi.fn();constructor(draw:()=>void){observers.push({draw,disconnect:this.disconnect});}observe(){}});
 vi.stubGlobal('CanvasRenderingContext2D',class{});
 vi.stubGlobal('ImageData',class{constructor(public data:Uint8ClampedArray,public width:number,public height:number){}});
 const context={putImageData:vi.fn(),clearRect:vi.fn(),imageSmoothingEnabled:true};
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
 vi.spyOn(HTMLCanvasElement.prototype,'getBoundingClientRect').mockReturnValue({left:10+1/3,top:5+2/3} as DOMRect);
 let image={width:2,height:2,data:new Uint8ClampedArray(16).fill(255)};
 const screen=()=> <PixelContext.Provider value={{n:1,dpr:3}}><Raster image={image}/></PixelContext.Provider>;
 const view=render(screen()),canvas=view.container.querySelector('canvas')!;
 expect([canvas.width,canvas.height]).toEqual([3,6]);expect(context.putImageData.mock.calls.at(-1)!.slice(1)).toEqual([1,2]);
 const width=vi.spyOn(canvas,'width','set'),height=vi.spyOn(canvas,'height','set');
 for(let i=0;i<10;i++){image={...image,data:new Uint8ClampedArray(16).fill(i)};view.rerender(screen());}
 expect(observers).toHaveLength(1);expect(width).not.toHaveBeenCalled();expect(height).not.toHaveBeenCalled();
 context.putImageData.mockClear();observers[0]!.draw();fireEvent(window,new Event('resize'));
 expect(context.putImageData).toHaveBeenCalledTimes(2);expect(context.putImageData.mock.calls[0]![0].data).toBe(image.data);
 expect(context.clearRect).toHaveBeenLastCalledWith(0,0,3,6);expect(context.imageSmoothingEnabled).toBe(false);
 view.unmount();context.putImageData.mockClear();observers[0]!.draw();fireEvent(window,new Event('resize'));
 expect(observers[0]!.disconnect).toHaveBeenCalledOnce();expect(context.putImageData).not.toHaveBeenCalled();
});
