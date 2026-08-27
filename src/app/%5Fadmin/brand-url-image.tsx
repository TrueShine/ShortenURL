"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import localFont from "next/font/local";

// Font: Nanum DungGeunInYeon (나눔손글씨 둥근인연), (c) 2019 NAVER Corporation,
// licensed under SIL OFL 1.1 — see src/fonts/NanumDungGeunInYeon-LICENSE.txt.
// This license applies only to the font file, not the rest of this repo (MIT).
const nanumDungGeunInYeon = localFont({
  src: "../../fonts/NanumDungGeunInYeon.ttf",
});

const COLOR_PROTOCOL = "#CCCCCC";
const COLOR_HOST = "#595959";
const COLOR_HOST_ONE = "#EA3323";
const COLOR_PATH = "#595959";

const FONT_SIZE = 66;
const PADDING_X = 30;
const PADDING_Y = 24;
const ASCENT = FONT_SIZE * 0.78;
const DESCENT = FONT_SIZE * 0.36;
const SCALE = 4;

type Segment = { text: string; color: string; bold: boolean };

function buildSegments(url: string): Segment[] {
  const match = url.match(/^(https?:\/\/)([^/]+)(\/.*)?$/);
  if (!match) return [{ text: url, color: COLOR_HOST, bold: false }];

  const [, protocol, host, path = ""] = match;
  const displayHost = host.replace(/^www\./i, "");
  const segments: Segment[] = [{ text: protocol, color: COLOR_PROTOCOL, bold: false }];
  for (const ch of displayHost) {
    segments.push({ text: ch, color: ch === "1" ? COLOR_HOST_ONE : COLOR_HOST, bold: false });
  }
  if (path) {
    segments.push({ text: path, color: COLOR_PATH, bold: true });
  }
  return segments;
}

export type BrandUrlCanvasHandle = {
  /** Resolves with the PNG data URL once the font has loaded and the canvas has been drawn. */
  getDataURL: () => Promise<string | null>;
};

export const BrandUrlCanvas = forwardRef<BrandUrlCanvasHandle, { url: string }>(
  function BrandUrlCanvas({ url }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const readyRef = useRef<Promise<void>>(Promise.resolve());

    useImperativeHandle(ref, () => ({
      getDataURL: async () => {
        await readyRef.current;
        return canvasRef.current?.toDataURL("image/png") ?? null;
      },
    }));

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const segments = buildSegments(url);
      const fontFamily = nanumDungGeunInYeon.style.fontFamily;
      const fontFor = (seg: Segment) => `${seg.bold ? 700 : 400} ${FONT_SIZE}px ${fontFamily}`;

      function draw() {
        let width = PADDING_X * 2;
        for (const seg of segments) {
          ctx!.font = fontFor(seg);
          width += ctx!.measureText(seg.text).width;
        }
        const height = PADDING_Y * 2 + ASCENT + DESCENT;

        canvas!.width = Math.ceil(width * SCALE);
        canvas!.height = Math.ceil(height * SCALE);
        canvas!.style.width = `${width}px`;
        canvas!.style.height = `${height}px`;

        ctx!.scale(SCALE, SCALE);

        ctx!.fillStyle = "#FFFFFF";
        ctx!.fillRect(0, 0, width, height);
        ctx!.textBaseline = "alphabetic";

        let x = PADDING_X;
        const y = PADDING_Y + ASCENT;
        for (const seg of segments) {
          ctx!.font = fontFor(seg);
          ctx!.fillStyle = seg.color;
          ctx!.fillText(seg.text, x, y);
          x += ctx!.measureText(seg.text).width;
        }
      }

      const fontsReady =
        typeof document !== "undefined" && document.fonts
          ? Promise.all([
              document.fonts.load(`400 ${FONT_SIZE}px ${fontFamily}`),
              document.fonts.load(`700 ${FONT_SIZE}px ${fontFamily}`),
            ]).then(
              () => undefined,
              () => undefined
            )
          : Promise.resolve();

      readyRef.current = fontsReady.then(draw);
    }, [url]);

    return <canvas ref={canvasRef} className="max-w-full" />;
  }
);
