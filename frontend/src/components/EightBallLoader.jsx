import React from 'react';

const EightBallLoader = ({ message = "Loading..." }) => {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-background">
      <style>
        {`
          @keyframes spin-8 {
            0% {
              left: 50%;
              transform: translateX(-50%) translateY(-50%) scaleX(1);
              animation-timing-function: ease-out;
            }
            25% {
              left: 100%;
              transform: translateX(-50%) translateY(-50%) scaleX(0);
            }
            25.001% {
              opacity: 0;
            }
            74.999% {
              opacity: 0;
            }
            75% {
              left: 0%;
              transform: translateX(-50%) translateY(-50%) scaleX(0);
              opacity: 1;
              animation-timing-function: ease-in;
            }
            100% {
              left: 50%;
              transform: translateX(-50%) translateY(-50%) scaleX(1);
            }
          }
        `}
      </style>
      
      <div className="relative w-32 h-32 mb-10">
        {/* Floor Shadow */}
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-24 h-4 bg-black/60 rounded-[50%] blur-md"></div>
        
        {/* Black Sphere Base */}
        <div 
          className="absolute inset-0 rounded-full overflow-hidden bg-[#0a0a0a]"
          style={{
            boxShadow: 'inset -15px -15px 30px rgba(0,0,0,0.9), inset 5px 5px 20px rgba(255,255,255,0.1)'
          }}
        >
          {/* Rotating 8 Container */}
          <div 
            className="absolute top-1/2 flex items-center justify-center bg-white rounded-full shadow-[inset_2px_2px_8px_rgba(0,0,0,0.5)]"
            style={{
              width: '45%',
              height: '45%',
              animation: 'spin-8 1.8s infinite',
            }}
          >
            <span className="text-black font-bold text-4xl select-none flex items-center justify-center">8</span>
          </div>
        </div>

        {/* Fixed Highlight / Gloss Over the Ball (makes it look 3D and glossy) */}
        <div 
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 45%, rgba(0,0,0,0.5) 100%)',
            boxShadow: '0 10px 20px rgba(0,0,0,0.5)'
          }}
        ></div>
      </div>
      
      <div className="text-primary font-h1 italic text-2xl animate-pulse tracking-wider">
        {message}
      </div>
    </div>
  );
};

export default EightBallLoader;
