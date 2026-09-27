// ─────────────────────────────────────────────────────────────
// Source loader — import every source file here to trigger
// its self-registration side-effect.
//
// To activate a new source:
//   1. Create src/ingestion/sources/<Name>JobSource.ts
//   2. Add `registerSource(new NameJobSource())` at the bottom of that file
//   3. Add the import line below — that's all
//
// Order of imports does not matter; each source registers itself
// under a unique JobSource enum value.
// ─────────────────────────────────────────────────────────────

// ── Active sources ────────────────────────────────────────────
export * from './MockJobSource';

// ── Disabled / not yet implemented ───────────────────────────
// Uncomment and create the file when ready to implement:
//
// export * from './LinkedInJobSource';
// export * from './IndeedJobSource';
// export * from './GlassdoorJobSource';
// export * from './CompanySiteJobSource';
// export * from './ReferralJobSource';
