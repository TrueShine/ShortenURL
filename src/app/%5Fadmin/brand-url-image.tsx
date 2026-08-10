"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Nanum_Pen_Script } from "next/font/google";

const nanumPenScript = Nanum_Pen_Script({ subsets: ["latin"], weight: ["400"] });

const COLOR_PROTOCOL = "#CCCCCC";
const COLOR_HOST = "#595959";
const COLOR_HOST_ONE = "#EA3323";
const COLOR_PATH = "#595959";

const FONT_SIZE = 44;
const PADDING_X = 20;
const PADDING_Y = 16;
const ASCENT = FONT_SIZE * 0.78;
const DESCENT = FONT_SIZE * 0.36;

type Segment = { text: string; color: string; bold: boolean };

function buildSegments(url: string): Segment[] {
  const match = url.match(/^(https?:\/\/)([^/]+)(\/.*)?$/);
  if (!match) return [{ text: url, color: COLOR_HOST, bold: false }];

  const [, protocol, host, path = ""] = match;
  const segments: Segment[] = [{ text: protocol, color: COLOR_PROTOCOL, bold: false }];
  for (const ch of host) {
    segments.push({ text: ch, color: ch === "1" ? COLOR_HOST_ONE : COLOR_HOST, bold: false });
  }
  if (path) {
    segments.push({ text: path, color: COLOR_PATH, bold: true });
  }
  return segments;
}

export type BrandUrlCanvasHandle = {
  toDataURL: () => string | null;
};

export const BrandUrlCanvas = forwardRef<BrandUrlCanvasHandle, { url: string }>(
  function BrandUrlCanvas({ url }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useImperativeHandle(ref, () => ({
      toDataURL: () => canvasRef.current?.toDataURL("image/png") ?? null,
    }));

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const segments = buildSegments(url);
      const fontFamily = nanumPenScript.style.fontFamily;
      const fontFor = (seg: Segment) => `${seg.bold ? 700 : 400} ${FONT_SIZE}px ${fontFamily}`;

      function draw() {
        let width = PADDING_X * 2;
        for (const seg of segments) {
          ctx!.font = fontFor(seg);
          width += ctx!.measureText(seg.text).width;
        }
        const height = PADDING_Y * 2 + ASCENT + DESCENT;

        canvas!.width = Math.ceil(width);
        canvas!.height = Math.ceil(height);

        ctx!.fillStyle = "#FFFFFF";
        ctx!.fillRect(0, 0, canvas!.width, canvas!.height);
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

      if (typeof document !== "undefined" && document.fonts) {
        Promise.all([
          document.fonts.load(`400 ${FONT_SIZE}px ${fontFamily}`),
          document.fonts.load(`700 ${FONT_SIZE}px ${fontFamily}`),
        ])
          .then(draw)
          .catch(draw);
      } else {
        draw();
      }
    }, [url]);

    return <canvas ref={canvasRef} className="max-w-full" />;
  }
);
