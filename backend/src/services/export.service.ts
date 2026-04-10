import { INote } from '@models/note.model';
import { ExportFormat } from '@types';
import CustomError from '@errors/custom.error';
import { StatusCodes } from 'http-status-codes';
import {
    Document, Packer, Paragraph, TextRun, HeadingLevel,
    AlignmentType, BorderStyle,
} from 'docx';

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

    /**
     * Export note as a real DOCX Word document.
     * Parses Markdown content into structured paragraphs with headings,
     * bold/italic text, bullet points, and code blocks.
     */
    private async exportDOCX(
        note: INote,
        baseFilename: string
    ): Promise<{ content: Buffer; contentType: string; filename: string }> {
        const children: Paragraph[] = [];

        // Title
        children.push(
            new Paragraph({
                text: note.title,
                heading: HeadingLevel.TITLE,
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 },
            })
        );

        // Metadata line
        children.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: `Type: ${note.type} | Generated: ${new Date(note.createdAt).toLocaleDateString()}`,
                        italics: true,
                        color: '888888',
                        size: 18,
                    }),
                ],
                spacing: { after: 300 },
                alignment: AlignmentType.CENTER,
            })
        );

        // Separator
        children.push(
            new Paragraph({
                border: {
                    bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
                },
                spacing: { after: 200 },
            })
        );

        // Parse markdown content into paragraphs
        const lines = note.content.split('\n');
        let inCodeBlock = false;
        let codeLines: string[] = [];

        for (const line of lines) {
            // Code block handling
            if (line.trim().startsWith('```')) {
                if (inCodeBlock) {
                    // End of code block — flush accumulated lines
                    children.push(
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: codeLines.join('\n'),
                                    font: 'Courier New',
                                    size: 18,
                                }),
                            ],
                            spacing: { before: 100, after: 200 },
                        })
                    );
                    codeLines = [];
                }
                inCodeBlock = !inCodeBlock;
                continue;
            }

            if (inCodeBlock) {
                codeLines.push(line);
                continue;
            }

            // Empty line → spacer
            if (!line.trim()) {
                children.push(new Paragraph({ spacing: { before: 100 } }));
                continue;
            }

            // Headers
            if (line.startsWith('### ')) {
                children.push(new Paragraph({
                    text: line.replace('### ', ''),
                    heading: HeadingLevel.HEADING_3,
                    spacing: { before: 200, after: 100 },
                }));
                continue;
            }
            if (line.startsWith('## ')) {
                children.push(new Paragraph({
                    text: line.replace('## ', ''),
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 300, after: 100 },
                }));
                continue;
            }
            if (line.startsWith('# ')) {
                children.push(new Paragraph({
                    text: line.replace('# ', ''),
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 400, after: 200 },
                }));
                continue;
            }

            // Bulleted list
            if (line.startsWith('- ') || line.startsWith('* ')) {
                const text = line.slice(2);
                children.push(new Paragraph({
                    children: this.parseInlineMarkdown(text),
                    bullet: { level: 0 },
                    spacing: { before: 40, after: 40 },
                }));
                continue;
            }

            // Numbered list
            const numberedMatch = line.match(/^\d+\.\s+(.*)/);
            if (numberedMatch) {
                children.push(new Paragraph({
                    children: this.parseInlineMarkdown(numberedMatch[1]),
                    bullet: { level: 0 },
                    spacing: { before: 40, after: 40 },
                }));
                continue;
            }

            // Regular paragraph — parse bold/italic/code inline
            children.push(new Paragraph({
                children: this.parseInlineMarkdown(line),
                spacing: { before: 60, after: 60 },
            }));
        }

        const doc = new Document({
            sections: [{ children }],
        });

        const buffer = await Packer.toBuffer(doc);

        return {
            content: buffer as Buffer,
            contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            filename: `${baseFilename}.docx`,
        };
    }

    /**
     * Parse inline markdown (bold, italic, code) into TextRun[]
     */
    private parseInlineMarkdown(text: string): TextRun[] {
        const runs: TextRun[] = [];

        // Split on bold, italic, and code patterns
        const regex = /(\*\*.*?\*\*|__.*?__|`[^`]+`|\*.*?\*|_.*?_)/g;
        let lastIndex = 0;

        let match: RegExpExecArray | null;
        while ((match = regex.exec(text)) !== null) {
            // Text before the match
            if (match.index > lastIndex) {
                runs.push(new TextRun({
                    text: text.slice(lastIndex, match.index),
                    size: 22,
                }));
            }

            const token = match[0];
            if (token.startsWith('**') || token.startsWith('__')) {
                runs.push(new TextRun({
                    text: token.slice(2, -2),
                    bold: true,
                    size: 22,
                }));
            } else if (token.startsWith('`')) {
                runs.push(new TextRun({
                    text: token.slice(1, -1),
                    font: 'Courier New',
                    size: 20,
                }));
            } else if (token.startsWith('*') || token.startsWith('_')) {
                runs.push(new TextRun({
                    text: token.slice(1, -1),
                    italics: true,
                    size: 22,
                }));
            }

            lastIndex = regex.lastIndex;
        }

        // Remaining text after last match
        if (lastIndex < text.length) {
            runs.push(new TextRun({
                text: text.slice(lastIndex),
                size: 22,
            }));
        }

        if (runs.length === 0) {
            runs.push(new TextRun({ text, size: 22 }));
        }

        return runs;
    }
}

export default new ExportService();
