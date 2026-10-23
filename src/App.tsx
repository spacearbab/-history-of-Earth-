import { useEffect, useRef, useState } from "react";
import { ERAS, LAST } from "./eras";
import { createEarthScene, type SceneHandle } from "./EarthScene";
import starfieldUrl from "./assets/starfield.jpg";

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

export default function App() {
  const hostRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SceneHandle | null>(null);
  const railDragging = useRef(false);
  const wheelAcc = useRef(0);
  const wheelTimer = useRef<number | undefined>(undefined);

  const [eraIdx, setEraIdx] = useState(LAST);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [hinted, setHinted] = useState(true);

  const era = ERAS[eraIdx];

  useEffect(() => {
    const host = hostRef.current;
    const anchor = anchorRef.current;
    if (!host || !anchor) return;

    const scene = createEarthScene(host, anchor, {
      onEraChange: (i) => setEraIdx(i),
      onProgress: (p) => setProgress(p),
      onReady: () => setReady(true),
      onInteract: () => setHinted(false),
      onStage: (v) => {
        const el = indexRef.current;
        if (el) el.style.left = `${(v / LAST) * 100}%`;
      },
    });
    sceneRef.current = scene;
    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  const valueFromX = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return LAST;
    const r = el.getBoundingClientRect();
    if (r.width <= 0) return LAST;
    return clamp(((clientX - r.left) / r.width) * LAST, 0, LAST);
  };

  const scrubTo = (clientX: number) => {
    sceneRef.current?.setTarget(valueFromX(clientX));
  };

  const onRailDown = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
    railDragging.current = true;
    sceneRef.current?.setScrubbing(true);
    scrubTo(e.clientX);
    if (!hinted) return;
    setHinted(false);
  };

  const onRailMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (railDragging.current) scrubTo(e.clientX);
  };

  const onRailUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!railDragging.current) return;
    railDragging.current = false;
    sceneRef.current?.setScrubbing(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  };

  const nudge = (dir: number) => {
    const h = sceneRef.current;
    if (!h) return;
    h.setScrubbing(true);
    h.setTarget(clamp(Math.round(h.getTarget()) + dir, 0, LAST));
    window.setTimeout(() => sceneRef.current?.setScrubbing(false), 40);
    setHinted(false);
  };

  const onWheel = (e: React.WheelEvent) => {
    wheelAcc.current += e.deltaY;
    window.clearTimeout(wheelTimer.current);
    wheelTimer.current = window.setTimeout(() => {
      wheelAcc.current = 0;
    }, 220);
    if (Math.abs(wheelAcc.current) < 80) return;
    nudge(wheelAcc.current > 0 ? 1 : -1);
    wheelAcc.current = 0;
  };

  return (
    <div className="relative h-[100dvh] w-full select-none overflow-hidden bg-[#05060A]">
      {/* deep field */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[#05060A]" />
      <img
        src={starfieldUrl}
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-60"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.55] mix-blend-screen"
        style={{
          backgroundImage:
            "radial-gradient(1.5px 1.5px at 18% 24%, #cfe0ff 50%, transparent 51%), radial-gradient(1.2px 1.2px at 72% 16%, #ffe6c4 50%, transparent 51%), radial-gradient(1px 1px at 44% 72%, #b9ccff 50%, transparent 51%), radial-gradient(1.6px 1.6px at 86% 61%, #ffffff 50%, transparent 51%), radial-gradient(1px 1px at 31% 88%, #ffd9b0 50%, transparent 51%), radial-gradient(1.1px 1.1px at 62% 44%, #dce8ff 50%, transparent 51%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(130% 95% at 50% 44%, rgba(5,6,10,0) 32%, rgba(5,6,10,0.70) 74%, #05060A 100%)",
        }}
      />

      {/* 3D layer */}
      <div
        ref={hostRef}
        aria-hidden
        className={`absolute inset-0 z-10 transition-opacity duration-[1600ms] ease-out ${
          ready ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* content */}
      <main className="pointer-events-none relative z-20 flex h-full flex-col">
        <div className="min-h-0 flex-[0.92]" />

        <div
          ref={anchorRef}
          className="relative w-full shrink-0"
          style={{ height: "min(78vw, 48vh)" }}
        >
          {!ready && (
            <div className="load-pulse absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-mono text-[9.5px] uppercase tracking-[0.34em] text-[#3A5D9E]">
              casting the surface · {progress}%
            </div>
          )}
        </div>

        <div
          className="pointer-events-auto flex shrink-0 flex-col px-4 sm:px-6"
          style={{ paddingBottom: "max(14px, env(safe-area-inset-bottom))" }}
        >
          <div key={eraIdx} className="era-in mx-auto flex w-full flex-col items-center pt-6 text-center">
            <span className="era-rule mb-4 block h-px w-9 bg-[#3A5D9E]" />
            <span className="font-mono text-[9.5px] uppercase leading-none tracking-[0.34em] text-[#8FB8FF] sm:text-[11px]">
              {era.label}
            </span>
            <h1
              className="mt-3 font-display font-medium leading-[0.94] tracking-[-0.015em] text-[#DCE8FF]"
              style={{ fontSize: "clamp(2rem, min(11vw, 9vh), 5.4rem)" }}
            >
              {era.title}
            </h1>
            <p className="mt-3.5 max-w-[54ch] font-mono text-[12px] leading-[1.75] text-[#8A93A6] sm:text-[13px]">
              {era.text}
            </p>
          </div>

          <p
            className={`era-hint mt-5 text-center font-mono text-[9px] uppercase tracking-[0.3em] text-[#3A5D9E] transition-opacity duration-[900ms] ${
              hinted ? "opacity-100" : "opacity-0"
            }`}
          >
            drag the planet · click it for the era's answer
          </p>

          {/* engraved time rule */}
          <div
            className="group relative mt-4 h-[54px] w-full cursor-ew-resize"
            style={{ touchAction: "none" }}
            role="slider"
            tabIndex={0}
            aria-label="Geological time"
            aria-valuemin={0}
            aria-valuemax={LAST}
            aria-valuenow={eraIdx}
            aria-valuetext={era.label}
            onPointerDown={onRailDown}
            onPointerMove={onRailMove}
            onPointerUp={onRailUp}
            onPointerCancel={onRailUp}
            onWheel={onWheel}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[#3A5D9E]/55" />
            <div className="pointer-events-none absolute left-0 top-0 h-px w-10 bg-gradient-to-r from-[#3A5D9E]/0 to-[#3A5D9E]/55" />

            <div
              ref={trackRef}
              className="pointer-events-none absolute inset-0"
              style={{ marginInline: "clamp(46px, 7vw, 112px)" }}
            >
              {Array.from({ length: 31 }, (_, j) => {
                const major = j % 5 === 0;
                const i = j / 5;
                const active = major && i === eraIdx;
                return (
                  <span
                    key={j}
                    className={`absolute top-0 -translate-x-1/2 ${
                      major ? "h-[13px] w-px" : "h-[6px] w-px"
                    } ${
                      active
                        ? "bg-[#FF6A2B]"
                        : major
                          ? "bg-[#8A93A6]/70 group-hover:bg-[#DCE8FF]"
                          : "bg-[#3A5D9E]/55 group-hover:bg-[#8FB8FF]/80"
                    } transition-colors duration-500`}
                    style={{ left: `${(j / 30) * 100}%` }}
                  />
                );
              })}

              {ERAS.map((e, i) => (
                <span
                  key={e.id}
                  className={`absolute top-[23px] whitespace-nowrap font-mono text-[9px] uppercase leading-none tracking-[0.22em] transition-colors duration-500 sm:text-[10px] ${
                    i === eraIdx
                      ? "text-[#FF6A2B]"
                      : "text-[#8A93A6]/55 group-hover:text-[#DCE8FF]"
                  }`}
                  style={{
                    left: `${(i / LAST) * 100}%`,
                    transform:
                      i === 0
                        ? "translateX(0)"
                        : i === LAST
                          ? "translateX(-100%)"
                          : "translateX(-50%)",
                  }}
                >
                  {e.tickMain}
                  <span className="hidden sm:inline">{e.tickUnit}</span>
                </span>
              ))}

              <div
                ref={indexRef}
                className="absolute top-[-7px] h-[31px] w-px -translate-x-1/2 bg-[#FF6A2B]"
                style={{ left: "100%", willChange: "left" }}
              >
                <span className="absolute -top-[3px] left-1/2 h-[7px] w-[7px] -translate-x-1/2 rotate-45 bg-[#FF6A2B]" />
                <span className="absolute -bottom-[1px] left-1/2 h-[5px] w-[5px] -translate-x-1/2 rounded-full bg-[#FF6A2B]" />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* engraved age spine */}
      <div className="pointer-events-none absolute left-0 top-1/2 z-30 hidden -translate-y-1/2 flex-col items-center gap-4 pl-4 lg:flex">
        <span className="h-16 w-px bg-gradient-to-b from-transparent to-[#3A5D9E]/70" />
        <span className="tabnum rotate-180 font-mono text-[10px] tracking-[0.42em] text-[#3A5D9E] [writing-mode:vertical-rl]">
          {era.ageLong}
        </span>
        <span className="h-16 w-px bg-gradient-to-t from-transparent to-[#3A5D9E]/70" />
      </div>
    </div>
  );
}
