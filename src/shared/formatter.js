export function formatMarkdown(article, options) {
  const { title, byline, url, content, siteName, excerpt } = article;
  const clippedDate = new Date().toISOString().split('T')[0];
  const publishedDate = article.publishedTime
    ? new Date(article.publishedTime).toISOString().split('T')[0]
    : clippedDate;

  let frontmatter = '';
  if (options.includeFrontmatter && options.frontmatterTemplate) {
    frontmatter = options.frontmatterTemplate
      .replace(/\{\{title\}\}/g, title || '')
      .replace(/\{\{url\}\}/g, url || '')
      .replace(/\{\{author\}\}/g, byline || siteName || '')
      .replace(/\{\{published\}\}/g, publishedDate)
      .replace(/\{\{clipped\}\}/g, clippedDate)
      .replace(/\{\{excerpt\}\}/g, excerpt || '');

    if (!frontmatter.endsWith('\n')) {
      frontmatter += '\n';
    }
    frontmatter += '\n';
  }

  const markdownBody = `# ${title}\n\n${content}`;
  return `${frontmatter}${markdownBody}`.trim();
}

export function sanitizeFilename(title) {
  if (!title) return 'clipped-page';
  return title
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
}
