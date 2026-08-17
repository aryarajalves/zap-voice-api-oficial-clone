import React, { useState, useRef } from 'react';

export default function TriggerTableTip({ text, children }) {
  const [show, setShow] = useState(false);
  const ref = useRef(null);
  const [align, setAlign] = useState('center'); // 'center' | 'right'

  const handleEnter = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const spaceRight = window.innerWidth - rect.right;
      if (spaceRight < 120) setAlign('right');
      else setAlign('center');
    }
    setShow(true);
  };

  const posClass = align === 'right'
    ? 'right-0'
    : 'left-1/2 -translate-x-1/2';

  const arrowClass = align === 'right'
    ? 'right-3'
    : 'left-1/2 -translate-x-1/2';

  return (
    <span ref={ref} className="relative inline-flex" onMouseEnter={handleEnter} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <span className={`absolute top-full ${posClass} mt-2 z-[9999] w-56 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl leading-relaxed pointer-events-none text-center`}>
          {text}
          <span className={`absolute bottom-full ${arrowClass} border-4 border-transparent border-b-gray-900`} />
        </span>
      )}
    </span>
  );
}
