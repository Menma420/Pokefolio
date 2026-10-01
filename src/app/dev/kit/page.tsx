'use client';

import { GameViewport, Window, CommandGrid, MenuList, TouchController, DialogueBox, Cursor } from '../../../ui/kit';

export default function UIKitGallery() {
  return (
    <div className="w-full h-full bg-gray-900 border-dashed border-red-500 border">
      <GameViewport>
         {/* Background to visualize exactly 240x160 space limits */}
         <div className="absolute inset-0 bg-blue-900 overflow-hidden">
         
         <TouchController />
         
         {/* Demo Components */}
         <div className="absolute top-[calc(4*var(--u))] left-[calc(4*var(--u))] right-[calc(112*var(--u))]">
           <Window>
             Testing integer pixelation sizes correctly preserving text metrics limits natively! 
           </Window>
         </div>
         
         <div className="absolute top-[calc(60*var(--u))] left-[calc(4*var(--u))]">
           <Window className="!w-[calc(96*var(--u))]">
             <MenuList 
               activeIndex={1} 
               options={['FIGHT', 'POKéMON', 'BAG', 'RUN']} 
             />
           </Window>
         </div>
         
         <div className="absolute top-[calc(60*var(--u))] left-[calc(112*var(--u))]">
           <Window className="!w-[calc(120*var(--u))]">
             <CommandGrid 
               activeIndex={0} 
               options={['DETAILS', 'PARTY', 'BAG', 'EXIT']} 
             />
           </Window>
         </div>
         
         <div className="absolute right-[calc(16*var(--u))] top-[calc(16*var(--u))] text-white font-mono flex items-center justify-center">
            <span style={{ fontSize: 'calc(8 * var(--u))', lineHeight: 'calc(10 * var(--u))' }}>Cursor:</span>
            <Cursor className="ml-2 animate-bounce flex-shrink-0" />
         </div>

         {/* Dialogue fixed to bottom automatically structurally */}
         <DialogueBox 
           text="This is a dummy string typed explicitly seamlessly matching components natively."
           onComplete={() => { console.log('Dialogue Completed') }} 
         />
         
         </div>
      </GameViewport>
    </div>
  );
}
