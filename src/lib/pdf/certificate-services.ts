/** Supported publishing workflows; these marks do not attest indexing or endorsement. */
export const certificateServices = [
  { name: 'Google Scholar', asset: '/brands/google-scholar.svg', caption: 'Scholarly metadata', width: 190, height: 44 },
  { name: 'Crossref', asset: '/brands/crossref.svg', caption: 'DOI metadata export', width: 200, height: 68 },
  { name: 'Zenodo', asset: '/brands/zenodo.png', caption: 'Repository workflow', width: 200, height: 80 },
  { name: 'ORCID', asset: '/brands/orcid.png', caption: 'Researcher profiles', width: 128, height: 128 },
] as const;

export const certificateServicesNote = 'Supported workflows only; journal indexing and endorsement are not certified.';
