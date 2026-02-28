import { INote } from '@models/note.model';
import { ExportFormat } from '@types';
import CustomError from '@errors/custom.error';
import { StatusCodes } from 'http-status-codes';

class ExportService {
    /**
     * Export note in specified format
     */
    async exportNote(
        note: INote,
        format: ExportFormat
    ): Promise<{ content: string | Buffer; contentType: string; filename: string }> {
        const baseFilename = note.title.replace(/[^a-zA-Z0-9-_]/g, '_');

        switch (format) {
            case 'md':
                return this.exportMarkdown(note, baseFilename);
            case 'html':
                return this.exportHTML(note, baseFilename);
            case 'pdf':
                return this.exportPDF(note, baseFilename);
            case 'docx':
                return this.exportDOCX(note, baseFilename);
            default:
                throw new CustomError('Unsupported export format', StatusCodes.BAD_REQUEST);
        }
    }

    private async exportMarkdown(
        note: INote,
        baseFilename: string
    ): Promise<{ content: string; contentType: string; filename: string }> {
        let content = `# ${note.title}\n\n`;
        content += note.content;

        if (note.mermaidCode) {
            content += `\n\n## Diagram\n\n\`\`\`mermaid\n${note.mermaidCode}\n\`\`\`\n`;
        }

        return {
            content,
            contentType: 'text/markdown',
            filename: `${baseFilename}.md`,
        };
    }

    private async exportHTML(
        note: INote,
        baseFilename: string
    ): Promise<{ content: string; contentType: string; filename: string }> {
        // Simple Markdown to HTML conversion
        let htmlContent = note.content
            .replace(/^### (.*$)/gm, '<h3>$1</h3>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
            .replace(/^- (.*$)/gm, '<li>$1</li>')
            .replace(/\n/g, '<br>');

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${note.title}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.6; color: #333; }
        h1, h2, h3 { color: #1a1a1a; }
        code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
        pre { background: #f4f4f4; padding: 1rem; border-radius: 6px; overflow-x: auto; }
        pre code { background: none; padding: 0; }
        blockquote { border-left: 4px solid #ddd; margin-left: 0; padding-left: 1rem; color: #666; }
        li { margin-bottom: 0.25rem; }
    </style>
</head>
<body>
    <h1>${note.title}</h1>
    ${htmlContent}
</body>
</html>`;

        return {
            content: html,
            contentType: 'text/html',
            filename: `${baseFilename}.html`,
        };
    }

    private async exportPDF(
        note: INote,
        baseFilename: string
    ): Promise<{ content: string | Buffer; contentType: string; filename: string }> {
        // For now, return HTML with a note to print as PDF
        // In production, use puppeteer or similar
        const htmlExport = await this.exportHTML(note, baseFilename);
        return {
            content: htmlExport.content,
            contentType: 'text/html',
            filename: `${baseFilename}_printable.html`,
        };
    }

    private async exportDOCX(
        note: INote,
        baseFilename: string
    ): Promise<{ content: string; contentType: string; filename: string }> {
        // For now, return Markdown content
        // In production, use the 'docx' package
        return this.exportMarkdown(note, baseFilename);
    }
}

export default new ExportService();
