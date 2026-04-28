export const runtime = "edge";

const ALLOWED_HOSTS = [
  "res.cloudinary.com",
  "educationalplatform-usermodule-2.onrender.com",
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoUrl = searchParams.get("url");

  if (!videoUrl) {
    return new Response("Missing url parameter", { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(videoUrl);
  } catch {
    return new Response("Invalid URL", { status: 400 });
  }

  if (!ALLOWED_HOSTS.some((h) => parsed.hostname === h || parsed.hostname.endsWith("." + h))) {
    return new Response("URL not allowed", { status: 403 });
  }

  const upstreamHeaders: HeadersInit = {};
  const range = request.headers.get("Range");
  if (range) upstreamHeaders["Range"] = range;

  try {
    const upstream = await fetch(videoUrl, { headers: upstreamHeaders });

    const responseHeaders: Record<string, string> = {
      "Content-Type": upstream.headers.get("Content-Type") || "video/mp4",
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=86400",
    };

    const contentLength = upstream.headers.get("Content-Length");
    if (contentLength) responseHeaders["Content-Length"] = contentLength;

    const contentRange = upstream.headers.get("Content-Range");
    if (contentRange) responseHeaders["Content-Range"] = contentRange;

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return new Response("Failed to fetch video", { status: 502 });
  }
}
