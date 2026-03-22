import type { UnitDatasheet, WargearOption } from "../../types/data";
import type { ConfiguredModel } from "../../types/config";
import { getApplicableOptions, applyWargearChoice } from "../../logic/wargear";

interface Props {
  datasheet: UnitDatasheet;
  models: ConfiguredModel[];
  onChange: (models: ConfiguredModel[]) => void;
}

export function WargearConfigurator({ datasheet, models, onChange }: Props) {
  if (datasheet.wargear_options.length === 0) {
    return <div className="wargear-none">No wargear options</div>;
  }

  // Group options by model definition they apply to
  const modelOptions = models.map((m) => ({
    model: m,
    options: getApplicableOptions(datasheet, m.definitionName),
  }));

  const handleChoice = (
    optionIndex: number,
    modelName: string,
    chosenEquipment: string,
  ) => {
    const updated = applyWargearChoice(models, datasheet, {
      optionIndex,
      modelName,
      chosenEquipment,
    });
    onChange(updated);
  };

  return (
    <div className="wargear-configurator">
      <label>Wargear Options</label>
      {modelOptions.map(({ model, options }) =>
        options.map(({ option, index }) => (
          <WargearOptionRow
            key={`${model.definitionName}-${index}`}
            option={option}
            optionIndex={index}
            modelName={model.definitionName}
            currentEquipment={model.equipment}
            onChoice={handleChoice}
          />
        )),
      )}
    </div>
  );
}

function WargearOptionRow({
  option,
  optionIndex,
  modelName,
  currentEquipment,
  onChoice,
}: {
  option: WargearOption;
  optionIndex: number;
  modelName: string;
  currentEquipment: string[];
  onChoice: (idx: number, model: string, choice: string) => void;
}) {
  // Figure out current selection: check if any choice is in current equipment
  const currentChoice = option.choices.find((c) =>
    currentEquipment.some((e) => e.toLowerCase() === c.toLowerCase()),
  );

  return (
    <div className="wargear-option">
      <span className="wargear-raw" title={option.raw}>
        {option.type === "replace"
          ? `Replace ${option.replaces.join(", ")}`
          : "Add"}
        {" "}({modelName})
      </span>
      <select
        value={currentChoice ?? ""}
        onChange={(e) => {
          if (e.target.value) onChoice(optionIndex, modelName, e.target.value);
        }}
      >
        <option value="">
          {option.type === "replace" ? `Keep ${option.replaces.join(", ")}` : "None"}
        </option>
        {option.choices.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </div>
  );
}
