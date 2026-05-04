import { useState, useEffect } from 'react';
import { FONTS } from '../../tokens.js';
import { Cursor } from './Cursor.jsx';

export function Typewriter({ text, speed = 38, color, onDone }) {
  const [out, setOut] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    setOut(""); setDone(false);
    let i = 0;
    const t = setInterval(() => {
      i++;
      setOut(text.slice(0, i));
      if (i >= text.length) { clearInterval(t); setDone(true); onDone?.(); }
    }, speed);
    return () => clearInterval(t);
  }, [text]);
  return (
    <span style={{ color, fontFamily: FONTS.mono }}>
      {out}{!done && <Cursor color={color} />}
    </span>
  );
}
