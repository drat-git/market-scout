// Workspace taxonomy is separate from navigation and presentation. New datasets
// must supply their own evidence and screening rules before becoming selectable.
export const workspace = { industry: 'Healthcare', businessType: 'Pediatric therapy' } as const;
export const pageLabels = {
  Markets: 'Market comparison',
  Providers: 'Providers',
  'Research runs': 'Research runs',
  Briefs: 'Comparison briefs',
  Settings: 'Workspace settings',
} as const;
export const pageDescriptions: Record<keyof typeof pageLabels, string> = {
  Markets: 'Compare provider coverage and evidence across your selected markets.',
  Providers: 'Inspect evidence and manage the providers in your working comparison.',
  'Research runs': 'Track live discovery, inspect source checks, and review provider candidates.',
  Briefs: 'Review saved comparisons with their criteria, notes, and source evidence.',
  Settings: 'Manage research scope, comparison markets, and workspace capabilities.',
};
