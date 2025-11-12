"use client";

import { useState, useRef, useEffect } from 'react';

interface SwipeButtonProps {
  onComplete: () => void;
  disabled?: boolean;
  text?: string;
}

export function SwipeButton({
  onComplete,
  disabled = false,
  text = "Swipe to send"
}: SwipeButtonProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);

  const sliderWidth = 64; // Width of the slider circle (w-16)
  const threshold = 0.9; // 90% swipe to trigger

  useEffect(() => {
    if (isComplete) {
      onComplete();
    }
  }, [isComplete, onComplete]);

  const handleStart = (clientX: number) => {
    if (disabled || isComplete) return;
    setIsDragging(true);
    startXRef.current = clientX - position;
  };

  const handleMove = (clientX: number) => {
    if (!isDragging || disabled || isComplete) return;

    const container = containerRef.current;
    if (!container) return;

    const containerWidth = container.offsetWidth;
    const maxPosition = containerWidth - sliderWidth;
    const newPosition = Math.min(Math.max(0, clientX - startXRef.current), maxPosition);

    setPosition(newPosition);

    // Check if swipe is complete
    if (newPosition >= maxPosition * threshold) {
      setIsDragging(false);
      setIsComplete(true);
      setPosition(maxPosition);
    }
  };

  const handleEnd = () => {
    if (!isDragging || isComplete) return;
    setIsDragging(false);

    // Snap back if not completed
    const container = containerRef.current;
    if (container) {
      const maxPosition = container.offsetWidth - sliderWidth;
      if (position < maxPosition * threshold) {
        setPosition(0);
      }
    }
  };

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX);
  };

  const handleMouseMove = (e: MouseEvent) => {
    handleMove(e.clientX);
  };

  const handleMouseUp = () => {
    handleEnd();
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    handleStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: TouchEvent) => {
    handleMove(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    handleEnd();
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, position, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  const progressPercentage = containerRef.current
    ? (position / (containerRef.current.offsetWidth - sliderWidth)) * 100
    : 0;

  return (
    <div
      ref={containerRef}
      className={`
        relative w-full h-16 rounded-2xl overflow-hidden
        ${disabled ? 'bg-gray-700 cursor-not-allowed' : 'bg-blue-600/20'}
        border-2 ${disabled ? 'border-gray-600' : 'border-blue-500'}
        transition-all duration-300
      `}
    >
      {/* Progress background */}
      <div
        className="absolute inset-0 bg-blue-600 transition-all duration-200"
        style={{
          width: `${Math.max(sliderWidth, position + sliderWidth)}px`,
          opacity: isComplete ? 1 : 0.3 + (progressPercentage / 100) * 0.7
        }}
      />

      {/* Text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span
          className={`
            font-semibold text-base transition-all duration-300
            ${isComplete ? 'text-white' : disabled ? 'text-gray-400' : 'text-blue-200'}
          `}
        >
          {isComplete ? 'Sending...' : text}
        </span>
      </div>

      {/* Slider button */}
      <div
        ref={sliderRef}
        className={`
          absolute top-1/2 -translate-y-1/2 left-1
          w-14 h-14 rounded-xl
          bg-white shadow-lg
          flex items-center justify-center
          transition-all duration-200
          ${isDragging ? 'scale-110 cursor-grabbing' : disabled ? 'cursor-not-allowed' : 'cursor-grab'}
          ${isComplete ? 'scale-110' : ''}
        `}
        style={{
          transform: `translate(${position}px, -50%) ${isDragging ? 'scale(1.1)' : isComplete ? 'scale(1.1)' : 'scale(1)'}`,
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {isComplete ? (
          <svg className="w-6 h-6 text-blue-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        ) : (
          <svg
            className={`w-6 h-6 transition-all duration-200 ${disabled ? 'text-gray-400' : 'text-blue-600'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        )}
      </div>

      {/* Arrow hints */}
      {!isComplete && !disabled && (
        <>
          <div
            className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ opacity: Math.max(0, 1 - progressPercentage / 50) }}
          >
            <svg className="w-5 h-5 text-blue-300 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <div
            className="absolute right-12 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ opacity: Math.max(0, 0.6 - progressPercentage / 50) }}
          >
            <svg className="w-4 h-4 text-blue-300/60 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </>
      )}
    </div>
  );
}
