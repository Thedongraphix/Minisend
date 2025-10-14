"use client";

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center">
      <div className="relative w-12 h-12">
        {/* Outer ring with gradient */}
        <div className="absolute inset-0 rounded-full border-4 border-blue-100/30" />

        {/* Animated spinner */}
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 border-r-blue-400 animate-spin"
             style={{
               animationDuration: '0.8s',
               animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
             }}
        />

        {/* Inner glow effect */}
        <div className="absolute inset-2 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 blur-sm" />
      </div>
    </div>
  );
}