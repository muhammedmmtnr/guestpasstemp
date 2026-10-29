"use client";

import dynamic from "next/dynamic";

const RootApp = dynamic(() => import("../src/RootApp"), {
  ssr: false,
  loading: () => <p>Loading GuestPass...</p>,
});

export default function GuestPassClient() {
  return <RootApp />;
}
