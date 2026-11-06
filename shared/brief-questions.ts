export const briefQuestions = [
  { id: 'expansion', title: 'Expansion strategy', question: 'What should a multiservice pediatric clinic validate before choosing Austin or San Antonio for expansion?' },
  { id: 'services', title: 'Competitor benchmarks', question: 'Which researched providers are the closest comparators for a clinic offering speech, occupational, and physical therapy together?' },
  { id: 'evidence', title: 'Research priorities', question: 'Which gaps in this research could change the market comparison, and what should an analyst verify first?' },
] as const;

export type QuestionId = typeof briefQuestions[number]['id'];
