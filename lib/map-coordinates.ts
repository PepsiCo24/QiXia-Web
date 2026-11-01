import type { LngLat } from "./qixia-data";

/** Browser geolocation is WGS84; AMap renders GCJ-02 in mainland China.
 * Existing schematic POIs and AMap route responses already use map coordinates.
 */
export function gpsToAMap([lng, lat]: LngLat): LngLat {
  if (lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271) return [lng, lat];
  const x = lng - 105, y = lat - 35, pi = Math.PI;
  let dLat = -100 + 2*x + 3*y + 0.2*y*y + 0.1*x*y + 0.2*Math.sqrt(Math.abs(x));
  let dLng = 300 + x + 2*y + 0.1*x*x + 0.1*x*y + 0.1*Math.sqrt(Math.abs(x));
  const wave = (a: number) => (20*Math.sin(6*a*pi) + 20*Math.sin(2*a*pi))*2/3;
  dLat += wave(x) + (20*Math.sin(y*pi)+40*Math.sin(y*pi/3))*2/3 + (160*Math.sin(y*pi/12)+320*Math.sin(y*pi/30))*2/3;
  dLng += wave(x) + (20*Math.sin(x*pi)+40*Math.sin(x*pi/3))*2/3 + (150*Math.sin(x*pi/12)+300*Math.sin(x*pi/30))*2/3;
  const rad = lat*pi/180, magic = 1-0.00669342162296594323*Math.sin(rad)**2;
  return [lng+dLng*180/(6378245/Math.sqrt(magic)*Math.cos(rad)*pi), lat+dLat*180/((6378245*(1-0.00669342162296594323))/(magic*Math.sqrt(magic))*pi)];
}
