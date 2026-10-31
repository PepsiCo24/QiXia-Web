import { NextResponse } from "next/server";
import { planWalkingRoute } from "@/lib/amap";
import type { LngLat } from "@/lib/qixia-data";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let stops: LngLat[];
  try {
    const body = (await req.json()) as { stops?: LngLat[] };
    if (!Array.isArray(body.stops) || body.stops.length < 2) {
      return NextResponse.json(
        { error: "stops 至少需要两个坐标点" },
        { status: 400 },
      );
    }
    stops = body.stops;
  } catch {
    return NextResponse.json({ error: "请求体格式错误" }, { status: 400 });
  }

  if (!process.env.AMAP_KEY) {
    return NextResponse.json(
      { error: "服务端未配置 AMAP_KEY" },
      { status: 500 },
    );
  }

  try {
    const segments = await planWalkingRoute(stops);
    return NextResponse.json({ segments });
  } catch {
    return NextResponse.json({ error: "路线规划失败" }, { status: 500 });
  }
}
