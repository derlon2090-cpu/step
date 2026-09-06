const escapeTutorHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  "'": '&#39;',
  '"': '&quot;',
})[character]);

const formatInline = (value) => escapeTutorHtml(value)
  .replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>')
  .replace(/\*\*/g, '');

export function formatTutorContent(value) {
  const clean = String(value ?? '')
    .replace(/^\s*(?:\*{3,}|-{3,}|_{3,})\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (!clean) return '';
  return clean.split('\n').map((line) => {
    if (!line.trim()) return '<span class="tutor-paragraph-gap" aria-hidden="true"></span>';
    const heading = line.match(/^\s*#{1,3}\s+(.+)$/);
    if (heading) return `<span class="tutor-content-heading">${formatInline(heading[1])}</span>`;
    const listItem = line.match(/^\s*[-•]\s+(.+)$/);
    if (listItem) return `<span class="tutor-content-line tutor-content-list">${formatInline(listItem[1])}</span>`;
    return `<span class="tutor-content-line">${formatInline(line)}</span>`;
  }).join('');
}
