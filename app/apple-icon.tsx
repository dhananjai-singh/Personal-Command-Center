import { ImageResponse } from "next/og";

// iOS home-screen icon (Add to Home Screen). Pure shapes — no font needed.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#17a6b3",
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            border: "14px solid #eafafa",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
