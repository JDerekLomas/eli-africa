"use client";

import { LAYERS, LayerDef } from "@/lib/layers";

interface LayerPanelProps {
  activeLayers: Record<string, boolean>;
  layerOpacity: Record<string, number>;
  onToggle: (id: string) => void;
  onOpacity: (id: string, val: number) => void;
  loadingLayers: Set<string>;
}

const CATEGORY_LABELS: Record<string, string> = {
  agriculture: "Agriculture",
  climate: "Climate",
  population: "Demographics",
};

function GradientSwatch({ palette }: { palette: string[] }) {
  const gradient =
    palette.length === 1
      ? palette[0]
      : `linear-gradient(to right, ${palette.join(", ")})`;
  return (
    <div
      className="h-2 w-full rounded-sm mt-1"
      style={{ background: gradient }}
    />
  );
}

function LayerItem({
  layer,
  active,
  opacity,
  loading,
  onToggle,
  onOpacity,
}: {
  layer: LayerDef;
  active: boolean;
  opacity: number;
  loading: boolean;
  onToggle: () => void;
  onOpacity: (val: number) => void;
}) {
  return (
    <div className="py-2">
      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={active}
          onChange={onToggle}
          className="mt-1 accent-emerald-500"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">{layer.name}</span>
            {loading && (
              <span className="text-xs text-amber-400 animate-pulse">
                loading...
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{layer.description}</p>
          <GradientSwatch palette={layer.palette} />
          {active && (
            <input
              type="range"
              min={0}
              max={100}
              value={opacity * 100}
              onChange={(e) => onOpacity(Number(e.target.value) / 100)}
              className="w-full h-1 mt-2 accent-emerald-500"
            />
          )}
        </div>
      </label>
    </div>
  );
}

export default function LayerPanel({
  activeLayers,
  layerOpacity,
  onToggle,
  onOpacity,
  loadingLayers,
}: LayerPanelProps) {
  const categories = [...new Set(LAYERS.map((l) => l.category))];

  return (
    <div>
      {categories.map((cat) => (
        <div key={cat} className="mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
            {CATEGORY_LABELS[cat] || cat}
          </h2>
          <div className="divide-y divide-gray-700/50">
            {LAYERS.filter((l) => l.category === cat).map((layer) => (
              <LayerItem
                key={layer.id}
                layer={layer}
                active={activeLayers[layer.id] || false}
                opacity={layerOpacity[layer.id] ?? 0.8}
                loading={loadingLayers.has(layer.id)}
                onToggle={() => onToggle(layer.id)}
                onOpacity={(val) => onOpacity(layer.id, val)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
