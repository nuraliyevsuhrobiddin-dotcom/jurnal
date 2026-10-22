export const manuscriptFieldNames = ['title', 'abstract', 'keywords', 'author_name', 'email', 'affiliation', 'country'] as const;
export type ManuscriptField = typeof manuscriptFieldNames[number];
export type ManuscriptFields = Record<ManuscriptField, string>;
export type TrackedFields = { values: ManuscriptFields; automatic: Partial<ManuscriptFields>; edited: Partial<Record<ManuscriptField, boolean>> };
export const emptyManuscriptFields: ManuscriptFields = { title: '', abstract: '', keywords: '', author_name: '', email: '', affiliation: '', country: '' };

export function editManuscriptField(state: TrackedFields, field: ManuscriptField, value: string): TrackedFields {
  const automatic = { ...state.automatic };
  delete automatic[field];
  return { values: { ...state.values, [field]: value }, automatic, edited: { ...state.edited, [field]: true } };
}

export function clearAutomaticFields(state: TrackedFields): TrackedFields {
  const values = { ...state.values };
  for (const field of manuscriptFieldNames) if (state.automatic[field] !== undefined) values[field] = '';
  return { ...state, values, automatic: {} };
}

export function applyManuscriptSuggestions(state: TrackedFields, suggestions: Partial<ManuscriptFields>): TrackedFields {
  const values = { ...state.values }, automatic = { ...state.automatic };
  for (const field of manuscriptFieldNames) {
    if (!state.edited[field] && !values[field].trim() && suggestions[field]) {
      values[field] = suggestions[field]!;
      automatic[field] = suggestions[field];
    }
  }
  return { ...state, values, automatic };
}
