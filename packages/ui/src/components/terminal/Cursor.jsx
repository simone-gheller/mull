import { useState, useEffect } from 'react';

export function Cursor({ color }) {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setOn(v => !v), 520);
    return () => clearInterval(t);
  }, []);
  return (
    <span style={{
      display: "inline-block", width: "0.55em", height: "1.05em",
      background: on ? color : "transparent",
      verticalAlign: "text-bottom", marginLeft: "2px",
      transition: "background 0.05s",
    }} />
  );
}
