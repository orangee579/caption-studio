import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  return NextResponse.json({
    hasServerText: !!(process.env.DEEPSEEK_API_KEY || process.env.TEXT_API_KEY),
    hasServerVision: !!(process.env.QWEN_API_KEY || process.env.VISION_API_KEY),
  });
}
