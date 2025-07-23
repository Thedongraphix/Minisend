"use client";

interface AnimatedLoaderProps {
  stage: 'creating' | 'pending' | 'confirming' | 'settling' | 'complete';
  progress: number;
  message?: string;
}

export function AnimatedLoader({ stage, progress, message }: AnimatedLoaderProps) {
  const stageAnimations = {
    creating: {
      icon: '⚙️',
      color: 'from-blue-500 to-blue-600',
      animation: 'animate-spin',
      bgColor: 'from-blue-900/20 to-blue-800/20'
    },
    pending: {
      icon: '⏳',
      color: 'from-yellow-500 to-orange-500',
      animation: 'animate-pulse',
      bgColor: 'from-yellow-900/20 to-orange-800/20'
    },
    confirming: {
      icon: '✅',
      color: 'from-green-500 to-emerald-500',
      animation: 'animate-bounce',
      bgColor: 'from-green-900/20 to-emerald-800/20'
    },
    settling: {
      icon: '🚀',
      color: 'from-purple-500 to-indigo-500',
      animation: 'animate-pulse',
      bgColor: 'from-purple-900/20 to-indigo-800/20'
    },
    complete: {
      icon: '🎉',
      color: 'from-green-500 to-emerald-500',
      animation: 'animate-bounce',
      bgColor: 'from-green-900/20 to-emerald-800/20'
    }
  };

  const currentStage = stageAnimations[stage];

  return (
    <div className="flex flex-col items-center space-y-6 p-8">
      {/* Main Animation Circle */}
      <div className="relative">
        {/* Outer Ring - Progress */}
        <div className="relative w-24 h-24">
          <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-gray-700"
            />
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 45}`}
              strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
              className={`text-blue-400 transition-all duration-500 ease-out`}
              strokeLinecap="round"
            />
          </svg>
          
          {/* Center Icon */}
          <div className={`absolute inset-0 flex items-center justify-center`}>
            <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${currentStage.color} flex items-center justify-center ${currentStage.animation} shadow-lg`}>
              <span className="text-2xl">{currentStage.icon}</span>
            </div>
          </div>
        </div>
        
        {/* Progress Percentage */}
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
          <div className="bg-gray-800 px-2 py-1 rounded-full">
            <span className="text-xs font-bold text-white">{progress}%</span>
          </div>
        </div>
      </div>

      {/* Stage Message */}
      <div className="text-center space-y-2">
        <div className="text-xl font-bold text-white">
          {message || getDefaultMessage(stage)}
        </div>
        
        {/* Animated Dots */}
        <div className="flex justify-center space-x-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`w-2 h-2 bg-blue-400 rounded-full animate-pulse`}
              style={{
                animationDelay: `${i * 0.2}s`,
                animationDuration: '1s'
              }}
            />
          ))}
        </div>
      </div>

      {/* Stage-specific animations */}
      {stage === 'settling' && (
        <div className="flex space-x-2 text-2xl">
          {['💰', '⚡', '🏦'].map((emoji, i) => (
            <div
              key={i}
              className="animate-bounce"
              style={{
                animationDelay: `${i * 0.1}s`,
                animationDuration: '1s'
              }}
            >
              {emoji}
            </div>
          ))}
        </div>
      )}

      {stage === 'complete' && (
        <div className="text-center">
          <div className="text-4xl animate-bounce mb-2">🎊</div>
          <div className="text-green-400 font-bold">Success!</div>
        </div>
      )}
    </div>
  );
}

function getDefaultMessage(stage: string): string {
  const messages = {
    creating: 'Creating your order...',
    pending: 'Waiting for transaction...',
    confirming: 'Confirming transaction...',
    settling: 'Processing settlement...',
    complete: 'Payment sent successfully!'
  };
  return messages[stage as keyof typeof messages] || 'Processing...';
}