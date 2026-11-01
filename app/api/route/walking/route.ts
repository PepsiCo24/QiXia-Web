import { NextResponse } from "next/server";
import { planWalkingRoute, RoutingError } from "@/lib/amap";
import type { LngLat } from "@/lib/qixia-data";

export const runtime = "nodejs";
// 多段路线走限并发的高德请求，给 serverless 平台留足函数执行预算
// （没有这行，Vercel 上函数会被默认超时掐死，前端只能显示「路线服务暂时不可用」）
export const maxDuration = 60;

export async function POST(req: Request) {
  let stops: LngLat[];
  try {
    const body = (await req.json()) as { stops?: LngLat[] };
    if (
      !Array.isArray(body.stops) ||
      body.stops.length < 2 ||
      body.stops.length > 12 ||
      !body.stops.every(
        (point) =>
          Array.isArray(point) &&
          point.length === 2 &&
          point.every(Number.isFinite) &&
          Math.abs(point[0]) <= 180 &&
          Math.abs(point[1]) <= 90,
      )
    ) {
      return NextResponse.json(
        { error: "stops 至少需要两个坐标点" },
        { status: 400 },
      );
    }
    stops = body.stops;
  } catch {
    return NextResponse.json({ error: "请求体格式错误" }, { status: 400 });
  }

  try {
    const segments = await planWalkingRoute(stops);
    return NextResponse.json({ segments });
  } catch (error) {
    if (error instanceof RoutingError) {
      return NextResponse.json(
        { error: error.message, code: error.code, retryable: error.retryable,
          ...(error.providerCode ? { providerCode: error.providerCode } : {}) },
        { status: error.status },
      );
    }
    // 不泄露供应商请求 URL、密钥或原始异常。
    return NextResponse.json(
      { error: "路线服务暂时不可用，请稍后重试。", code: "ROUTING_UNAVAILABLE", retryable: true },
      { status: 503 },
    );
  }
}
