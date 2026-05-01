import { CATEGORY_COLORS } from "@/lib/categoryColors";

interface Props {
  value: string;
  onChange: (hsl: string) => void;
  className?: string;
}

const ColorPicker = ({ value, onChange, className }: Props) => {
  return (
    <div className={`grid grid-cols-4 gap-2 ${className ?? ""}`}>
      {CATEGORY_COLORS.map((c) => {
        const selected = value === c.hsl;
        return (
          <button
            key={c.hsl}
            type="button"
            onClick={() => onChange(c.hsl)}
            title={c.name}
            className={`h-8 w-8 rounded-full transition-all ${
              selected ? "ring-2 ring-foreground ring-offset-2 ring-offset-background scale-110" : "hover:scale-105"
            }`}
            style={{ backgroundColor: `hsl(${c.hsl})` }}
            aria-label={c.name}
          />
        );
      })}
    </div>
  );
};

export default ColorPicker;
