/**
 * Global mock for pdf-parse v2 (PDFParse class API).
 * Used by all tests that import resumes.service.ts.
 * Returns enough text to pass the minimum-length check (50 chars).
 */
export class PDFParse {
  getText(): Promise<{ pages: Array<{ text: string }> }> {
    return Promise.resolve({
      pages: [
        {
          text: 'John Doe — Senior Software Engineer with 5 years of experience in Node.js TypeScript PostgreSQL Redis building scalable REST APIs',
        },
      ],
    });
  }
}
