import { useState, useEffect } from 'react';

export const Clock = () => {
  const [time, setTime] = useState(new Date());
  const displayYear = "2088";

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? '오후' : '오전';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;
    return `${ampm} ${displayHours}:${displayMinutes}`;
  };

  const formatDate = (date: Date) => {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${displayYear}-${month < 10 ? `0${month}` : month}-${day < 10 ? `0${day}` : day}`;
  };

  return (
    <div className="flex flex-col items-end text-[10px] text-white/90 font-medium leading-none select-none">
      <span>{formatTime(time)}</span>
      <span className="mt-0.5">{formatDate(time)}</span>
    </div>
  );
};
