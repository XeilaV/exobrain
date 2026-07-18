import { useState } from "react";

const EMOJI_SET = [
  "📝","📌","📎","📁","📂","🗂️","📋","📊","📈","📉",
  "💡","✨","⭐","🔥","🎯","🚀","🌱","🌳","🌲","🍀",
  "🧠","❤️","👤","👥","🏠","🏢","🛠️","🔧","⚙️","🧩",
  "📚","📖","✏️","🖊️","🎨","🎵","🎬","📷","🎮","🕹️",
  "💻","📱","⌨️","🖱️","🌐","🔗","📡","🛰️","🔒","🔑",
  "🍔","🍕","☕","🍎","🥗","🏃","🏋️","🧘","⚽","🎾",
  "✈️","🚗","🚲","🗺️","🏖️","🏔️","☀️","🌙","⚡","🌈",
  "💰","💳","💼","📅","⏰","⏳","✅","❌","⚠️","❓",
];

interface Props {
  value?: string | null;
  onChange: (emoji: string) => void;
  onClear?: () => void;
  className?: string;
}

const EmojiPicker = ({ value, onChange, onClear, className }: Props) => {
  return (
    <div className={`w-64 ${className ?? ""}`}>
      <div className="grid grid-cols-8 gap-1 max-h-56 overflow-y-auto scrollbar-thin p-1">
        {EMOJI_SET.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => onChange(e)}
            className={`h-8 w-8 rounded hover:bg-muted flex items-center justify-center text-lg ${
              value === e ? "bg-muted ring-1 ring-primary" : ""
            }`}
            aria-label={e}
          >
            {e}
          </button>
        ))}
      </div>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="w-full mt-2 text-xs text-muted-foreground hover:text-foreground py-1"
        >
          Sin icono
        </button>
      )}
    </div>
  );
};

export default EmojiPicker;
