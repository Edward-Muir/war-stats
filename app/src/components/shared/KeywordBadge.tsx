interface Props {
  keyword: string;
  variant?: "unit" | "faction" | "weapon";
}

export function KeywordBadge({ keyword, variant = "unit" }: Props) {
  return <span className={`keyword-badge keyword-${variant}`}>{keyword}</span>;
}
