"use client";

import Lottie from "lottie-react";
import loaderAnimation from "./loader.json";

export default function TransportLoader() {
  return (
    <div style={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
      <Lottie animationData={loaderAnimation} loop />
    </div>
  );
}
