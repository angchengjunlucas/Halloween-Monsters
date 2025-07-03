// frontend/src/components/TurnOrder.tsx
import React from "react";

interface Props {
  order: string[];
}

export default function TurnOrder({ order }: Props) {
  return (
    <div className="my-4">
      <h2 className="text-2xl font-semibold mb-2">Turn Order</h2>
      <p className="italic">{order.join(" → ")}</p>
    </div>
  );
}
