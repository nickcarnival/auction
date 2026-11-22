type Thing = {
  background: string;
  foreground: string;
  border: string;
};

const chip1: Thing = {
  background: 'bg-chip-1-background',
  foreground: 'text-chip-1-foreground',
  border: 'border-chip-1-border',
};

const chip6: Thing = {
  background: 'bg-chip-6-background',
  foreground: 'text-chip-6-foreground',
  border: 'border-chip-6-border',
};

const chip7: Thing = {
  background: 'bg-chip-7-background',
  foreground: 'text-chip-7-foreground',
  border: 'border-chip-7-border',
};

export const colorMapping = {
  Blue: chip1,
  Red: {
    background: 'bg-chip-2-background',
    foreground: 'text-chip-2-foreground',
    border: 'border-chip-2-border',
  },
  Green: {
    background: 'bg-chip-3-background',
    foreground: 'text-chip-3-foreground',
    border: 'border-chip-3-border',
  },
  Yellow: {
    background: 'bg-chip-4-background',
    foreground: 'text-chip-4-foreground',
    border: 'border-chip-4-border',
  },
  Purple: {
    background: 'bg-chip-5-background',
    foreground: 'text-chip-5-foreground',
    border: 'border-chip-5-border',
  },
  Teal: chip7,
  Slate: chip6,
  Neutral: chip6,
  Stone: chip6,
} as const;

export type ResourceColors = keyof typeof colorMapping;

export const colorPickerOptions: { name: ResourceColors; colors: Thing }[] = (
  ['Blue', 'Teal', 'Red', 'Green', 'Yellow', 'Purple', 'Neutral'] as const
).map(name => ({ name, colors: colorMapping[name] }));

export const getClassName = (color: string | undefined): Thing => {
  return colorMapping[color as ResourceColors] ?? colorMapping.Blue;
};
