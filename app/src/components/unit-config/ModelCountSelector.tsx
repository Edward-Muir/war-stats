import type { ModelDefinition } from "../../types/data";
import type { ConfiguredModel } from "../../types/config";

interface Props {
  definitions: ModelDefinition[];
  models: ConfiguredModel[];
  onChange: (models: ConfiguredModel[]) => void;
}

export function ModelCountSelector({ definitions, models, onChange }: Props) {
  const handleChange = (defName: string, count: number) => {
    const def = definitions.find((d) => d.name === defName);
    if (!def) return;
    const clamped = Math.max(def.min_models, Math.min(def.max_models, count));
    const updated = models.map((m) =>
      m.definitionName === defName ? { ...m, count: clamped } : m,
    );
    onChange(updated);
  };

  return (
    <div className="model-count-selector">
      <label>Models</label>
      {models.map((m) => {
        const def = definitions.find((d) => d.name === m.definitionName);
        if (!def) return null;
        const isFixed = def.min_models === def.max_models;

        return (
          <div key={m.definitionName} className="model-count-row">
            <span className="model-name">{m.definitionName}</span>
            {isFixed ? (
              <span className="model-count-fixed">{m.count}</span>
            ) : (
              <input
                type="number"
                min={def.min_models}
                max={def.max_models}
                value={m.count}
                onChange={(e) =>
                  handleChange(m.definitionName, parseInt(e.target.value, 10) || def.min_models)
                }
              />
            )}
            <span className="model-count-range">
              ({def.min_models}–{def.max_models})
            </span>
          </div>
        );
      })}
    </div>
  );
}
