import { useEffect, useMemo, useRef, useState } from 'react';

const M_ASSIST_LOGO = `${import.meta.env.BASE_URL}ArcanusLogo.png`;

interface LoadingScreenProps {
  onComplete?: () => void;
}

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [phase, setPhase] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Status timeline
  useEffect(() => {
    const steps = [0, 1, 2, 3];
    let i = 0;

    const tick = () => {
      if (i < steps.length - 1) {
        i++;
        setPhase(i);
        timer = window.setTimeout(tick, 2000);
      } else {
        timer = window.setTimeout(() => {
          setIsFading(true);
          window.setTimeout(() => {
            onCompleteRef.current?.();
          }, 600);
        }, 2000);
      }
    };

    let timer = window.setTimeout(tick, 1200);
    return () => window.clearTimeout(timer);
  }, []);

  // random orbit dots
  const orbitDots = useMemo(
    () =>
      Array.from({ length: 6 }).map((_, idx) => ({
        id: idx,
        radius: 62 + Math.random() * 14,
        duration: 3 + Math.random() * 2.5,
        delay: Math.random() * 1.5,
        angle: Math.random() * 360,
        size: 5 + Math.random() * 3,
      })),
    []
  );

  const status = [
    {
      title: 'Preparing Workspace',
      detail: 'Setting up your customs operations environment…',
    },
    {
      title: 'Loading Client Data',
      detail: 'Retrieving claims, documents and account information…',
    },
    {
      title: 'Checking Services',
      detail: 'Verifying HMRC connections and platform services…',
    },
    {
      title: 'Ready',
      detail: 'All systems operational. Welcome to Arcanus Customs!',
    },
  ][phase];

  return (
    <div
      ref={containerRef}
      className={`massist-splash ${isFading ? 'massist-splash--fade' : ''}`}
      role="status"
    >
      <div className="massist-splash__inner">
        <div className="massist-logo-wrap">
          {/* PULSE RING */}
          <div className="pulse-glow" />

          {/* SVG PERFECT-CIRCLE ANIMATION */}
          <svg className="draw-circle" width="160" height="160">
            <circle
              className="circle-path"
              cx="80"
              cy="80"
              r="65"
              stroke="#8b5cf6"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
            />
          </svg>

          {/* ORBIT DOTS */}
          <div className="orbit-dots">
            {orbitDots.map((dot) => (
              <span
                key={dot.id}
                className="orbit-dot"
                style={
                  {
                    '--orbit-duration': `${dot.duration}s`,
                    '--orbit-delay': `${dot.delay}s`,
                    transform: `rotate(${dot.angle}deg)`,
                  } as React.CSSProperties
                }
              >
                <span
                  className="orbit-ball"
                  style={
                    {
                      '--orbit-radius': `${dot.radius}px`,
                      width: `${dot.size}px`,
                      height: `${dot.size}px`,
                    } as React.CSSProperties
                  }
                />
              </span>
            ))}
          </div>

          {/* LOGO */}
          <img src={M_ASSIST_LOGO} alt="Arcanus Logo" className="massist-logo" />
        </div>

        <h1 className="massist-title">Arcanus Customs</h1>

        <div className="massist-status">
          <div className="massist-status-line">{status.title}</div>
          <div className="massist-status-detail">{status.detail}</div>
        </div>

        <div className="massist-ellipsis">
          <span />
          <span />
          <span />
        </div>
      </div>

      {/* STYLES */}
      <style>{`
        .massist-splash {
          position: fixed;
          inset: 0;
          display: grid;
          place-items: center;
          background: radial-gradient(circle at center, #383e42 0%, #000 100%);
          color: #fff;
          z-index: 99999;
          transition: opacity 0.6s ease;
        }
        .massist-splash--fade {
          opacity: 0;
        }

        .massist-splash__inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
        }

        .massist-logo-wrap {
          position: relative;
          width: 160px;
          height: 160px;
          display: grid;
          place-items: center;
        }

        /* Pulse glow - Purple */
        .pulse-glow {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: radial-gradient(
            circle,
            rgba(139,92,246,0.4) 0%,
            rgba(139,92,246,0.15) 40%,
            transparent 70%
          );
          animation: pulse 1.2s ease-out 1;
          filter: blur(6px);
        }

        @keyframes falsh {
          0% { transform: scale(0.6); opacity: 0.4; }
          70% { transform: scale(1.15); opacity: 0.8; }
          100% { transform: scale(1); opacity: 0; }
        }

        /* SVG circle draw */
        .draw-circle {
          position: absolute;
          top: 0;
          left: 0;
          transform: rotate(-90deg); /* so circle draws clockwise */
        }

        .circle-path {
          stroke-dasharray: 408;
          stroke-dashoffset: 408;
          animation: circleDraw 1.6s ease forwards 1.0s;
        }

        @keyframes circleDraw {
          to { stroke-dashoffset: 0; }
        }

        /* Orbit dots */
        .orbit-dots {
          position: absolute;
          inset: 0;
        }
        .orbit-dot {
          position: absolute;
          inset: 0;
          animation: orbit var(--orbit-duration) linear infinite;
          animation-delay: var(--orbit-delay);
          transform-origin: center;
        }
        @keyframes orbit {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .orbit-ball {
          position: absolute;
          top: 20%;
          left: 20%;
          background: #a78bfa;
          border-radius: 50%;
          transform: translate(calc(var(--orbit-radius) * 1px), -50%);
          box-shadow: 0 0 10px rgba(167,139,250,0.7);
        }

        .massist-logo {
          width: 90px;
          height: 90px;
          z-index: 5;
          filter: drop-shadow(0 0 10px rgba(139,92,246,0.6));
        }

        .massist-title {
          margin-top: 6px;
          font-size: 22px;
          font-weight: 700;
          color: #a78bfa;
        }

        .massist-status {
          margin-top: 6px;
          text-align: center;
        }
        .massist-status-line {
          font-size: 15px;
          font-weight: 600;
        }
        .massist-status-detail {
          font-size: 13px;
          color: #bfc3c9;
        }

        .massist-ellipsis {
          display: flex;
          gap: 6px;
          margin-top: 4px;
        }
        .massist-ellipsis span {
          width: 6px;
          height: 6px;
          background: #8b5cf6;
          border-radius: 50%;
          animation: bounce 1.2s infinite;
        }
        .massist-ellipsis span:nth-child(2) { animation-delay: 0.15s; }
        .massist-ellipsis span:nth-child(3) { animation-delay: 0.30s; }

        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
