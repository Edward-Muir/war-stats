import { Overlay } from '../layout/Overlay';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const sectionTitle =
  'text-xs font-semibold uppercase tracking-wide text-muted-foreground mt-5 mb-2';
const prose = 'text-sm text-foreground leading-relaxed';
const listItem = 'text-sm text-foreground leading-relaxed ml-4 list-disc';

export function MethodologyOverlay({ isOpen, onClose }: Props) {
  return (
    <Overlay isOpen={isOpen} onClose={onClose} title="Methodology">
      <div className="space-y-1">
        {/* Overview */}
        <p className={prose}>
          This calculator uses <strong>Monte Carlo simulation</strong> to estimate damage output.
          Each scenario is simulated thousands of times (default: 10,000 iterations), rolling
          virtual dice for every step of the attack sequence. Results show the full statistical
          distribution of outcomes.
        </p>

        {/* Attack Sequence */}
        <h3 className={sectionTitle}>The Attack Sequence</h3>
        <p className={prose}>Every attack follows the 10th Edition 5-step sequence:</p>

        <div className="space-y-3 mt-2">
          <div>
            <p className="text-sm font-medium text-foreground">1. Hit Roll</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Roll D6 per attack against the weapon's BS (ranged) or WS (melee). An unmodified 6 is
              always a Critical Hit. An unmodified 1 always fails. Hit modifiers are capped at +/-1.
              Heavy weapons get +1 if stationary. Stealth units impose -1. Torrent weapons auto-hit.
              Sustained Hits generate extra hits on crits.
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-foreground">2. Wound Roll</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Compare weapon Strength vs target Toughness to determine the required roll: S &ge; 2T
              = 2+, S &gt; T = 3+, S = T = 4+, T &gt; S = 5+, T &ge; 2S = 6+. Wound modifiers capped
              at +/-1. Lance gives +1 if charged. Lethal Hits (from crit hits) auto-wound. Anti-X
              keyword lowers the crit wound threshold. Twin-linked allows rerolling all failed
              wounds.
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-foreground">3. Allocate Attacks</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Successful wounds are allocated to already-wounded models first, then to fresh models.
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-foreground">4. Saving Throw</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Defender rolls D6, modified by weapon AP. Can use invulnerable save instead
              (unmodified by AP). Cover grants +1 to armour save (max improvement of 1). Devastating
              Wounds (from crit wounds) bypass saves entirely, inflicting mortal wounds.
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-foreground">5. Inflict Damage</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Each unsaved wound deals the weapon's Damage to the allocated model. Excess damage
              does not carry over to the next model. Mortal wounds do carry over. Feel No Pain rolls
              can negate individual points of damage.
            </p>
          </div>
        </div>

        {/* Modifier Caps */}
        <h3 className={sectionTitle}>Modifier Caps</h3>
        <ul className="space-y-1">
          <li className={listItem}>Hit and wound rolls: max +/-1 modifier</li>
          <li className={listItem}>Armour save improvement from cover: max +1</li>
          <li className={listItem}>Unmodified 1 always fails hit/wound/save</li>
          <li className={listItem}>Unmodified 6 on hit/wound is always a critical</li>
        </ul>

        {/* Weapon Keywords */}
        <h3 className={sectionTitle}>Weapon Keywords</h3>
        <ul className="space-y-1">
          <li className={listItem}>
            <strong>Rapid Fire N</strong> — +N attacks at half range
          </li>
          <li className={listItem}>
            <strong>Blast</strong> — +1 attack per 5 defender models
          </li>
          <li className={listItem}>
            <strong>Melta N</strong> — +N damage at half range
          </li>
          <li className={listItem}>
            <strong>Heavy</strong> ��� +1 to hit if remained stationary
          </li>
          <li className={listItem}>
            <strong>Assault</strong> — can fire after advancing (no penalty)
          </li>
          <li className={listItem}>
            <strong>Lance</strong> — +1 to wound if charged
          </li>
          <li className={listItem}>
            <strong>Torrent</strong> — automatically hits (no hit roll)
          </li>
          <li className={listItem}>
            <strong>Twin-linked</strong> — reroll all failed wound rolls
          </li>
          <li className={listItem}>
            <strong>Lethal Hits</strong> — critical hits auto-wound
          </li>
          <li className={listItem}>
            <strong>Sustained Hits N</strong> — critical hits generate N extra hits
          </li>
          <li className={listItem}>
            <strong>Devastating Wounds</strong> — critical wounds become mortal wounds
          </li>
          <li className={listItem}>
            <strong>Anti-X N+</strong> — wound crits on N+ vs keyword X
          </li>
          <li className={listItem}>
            <strong>Indirect Fire</strong> — can target without line of sight (-1 to hit, benefit of
            cover)
          </li>
        </ul>

        {/* Output */}
        <h3 className={sectionTitle}>Statistical Output</h3>
        <p className={prose}>
          Results include mean, median, standard deviation, and a histogram showing the full
          distribution of damage outcomes across all iterations.
        </p>
      </div>
    </Overlay>
  );
}
