/** Locked v1.1 UI palette. Art palettes are independent of UI tokens. */
export const palette = {
  outer: '#183B34', inner: '#6FD3B5', cream: '#FDF5C4', gold: '#F2D98B',
  blue: '#3C5CA8', header: '#1D7F6E', text: '#202020', shadow: '#B9B9A5',
  onDark: '#FFFFFF', disabled: '#888888', warning: '#D84A2A', link: '#2A6FDB', black: '#000000',
  recruiter: '#4B5FA8', recruiterHighlight: '#9BA9D8', engineer: '#2D7D6F', engineerHighlight: '#73BBAE',
  friend: '#A8663F', friendHighlight: '#D9A06E',
} as const;

export const vsPalette={
 RECRUITER:[palette.recruiter,palette.recruiterHighlight],
 ENGINEER:[palette.engineer,palette.engineerHighlight],
 FRIEND:[palette.friend,palette.friendHighlight],
} as const;
