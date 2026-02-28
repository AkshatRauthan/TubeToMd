import PDFDocument from 'pdfkit';
import Session from '@models/session.model';
import Note from '@models/note.model';
import Annotation from '@models/annotation.model';
import CustomError from '@errors/custom.error';
import { StatusCodes } from 'http-status-codes';

interface ReportData {
    session: {
        title: string;
        videoType: string;
        videoUrl?: string;
        duration?: number;
        createdAt: Date;
        metadata?: {
            channel?: string;
            language?: string;
        };
    };
    notes: {
        type: string;
        title: string;
        content: string;
    }[];
    annotations: {
        note: string;
        timestamp: number;
    }[];
    transcript: {
        start: number;
        text: string;
    }[];
}

class ReportService {
    private formatTime(seconds: number): string {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    private formatDuration(seconds: number): string {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        if (h > 0) {
            return `${h}h ${m}m ${s}s`;
        }
        return `${m}m ${s}s`;
    }

    async generateReport(sessionId: string, userId: string): Promise<Buffer> {
        // Fetch all data
        const session = await Session.findOne({ _id: sessionId, userId });
        if (!session) {
            throw new CustomError('Session not found', StatusCodes.NOT_FOUND);
        }

        if (session.status !== 'ready') {
            throw new CustomError('Session must be ready to generate report', StatusCodes.BAD_REQUEST);
        }

        const notes = await Note.find({ sessionId, userId }).sort({ createdAt: 1 });
        const annotations = await Annotation.find({ sessionId, userId }).sort({ startTimestamp: 1 });

        // Prepare data
        const reportData: ReportData = {
            session: {
                title: session.title,
                videoType: session.videoType,
                videoUrl: session.videoUrl,
                duration: session.duration,
                createdAt: session.createdAt,
                metadata: session.metadata,
            },
            notes: notes.map(n => ({
                type: n.type,
                title: n.title,
                content: n.content,
            })),
            annotations: annotations
                .filter(a => a.startTimestamp !== undefined)
                .map(a => ({
                    note: a.note || a.selectedText,
                    timestamp: a.startTimestamp!,
                })),
            transcript: session.transcription.map(t => ({
                start: t.start,
                text: t.text,
            })),
        };

        return this.buildPDF(reportData);
    }

    private buildPDF(data: ReportData): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({
                size: 'A4',
                margins: { top: 50, bottom: 50, left: 50, right: 50 },
                bufferPages: true,
            });

            const chunks: Buffer[] = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // Colors
            const primaryColor = '#db2777';
            const textColor = '#1f2937';
            const mutedColor = '#6b7280';

            // Title Page
            doc.fontSize(28).fillColor(primaryColor).text('TubeToMD Report', { align: 'center' });
            doc.moveDown(0.5);
            doc.fontSize(18).fillColor(textColor).text(data.session.title, { align: 'center' });
            doc.moveDown(1);

            // Session Info
            doc.fontSize(10).fillColor(mutedColor);
            doc.text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
            if (data.session.duration) {
                doc.text(`Duration: ${this.formatDuration(data.session.duration)}`, { align: 'center' });
            }
            if (data.session.metadata?.channel) {
                doc.text(`Channel: ${data.session.metadata.channel}`, { align: 'center' });
            }
            if (data.session.videoUrl) {
                doc.text(`Source: ${data.session.videoUrl}`, { align: 'center' });
            }

            doc.moveDown(2);

            // Table of Contents
            doc.fontSize(16).fillColor(primaryColor).text('Table of Contents', { underline: true });
            doc.moveDown(0.5);
            doc.fontSize(11).fillColor(textColor);

            const sections: string[] = [];
            if (data.notes.some(n => n.type === 'summary')) sections.push('Summary');
            if (data.notes.some(n => n.type === 'detailed_notes')) sections.push('Detailed Notes');
            if (data.notes.some(n => n.type === 'mindmap' || n.type === 'flowchart')) sections.push('Visual Diagrams');
            if (data.notes.some(n => n.type === 'flashcards')) sections.push('Flashcards');
            if (data.notes.some(n => n.type === 'resources')) sections.push('Study Guide');
            if (data.annotations.length > 0) sections.push('User Notes');
            sections.push('Full Transcript');

            sections.forEach((section, idx) => {
                doc.text(`${idx + 1}. ${section}`);
            });

            // Summary Section
            const summaryNote = data.notes.find(n => n.type === 'summary');
            if (summaryNote) {
                doc.addPage();
                doc.fontSize(18).fillColor(primaryColor).text('Summary', { underline: true });
                doc.moveDown(0.5);
                doc.fontSize(11).fillColor(textColor);
                this.writeMarkdownContent(doc, summaryNote.content);
            }

            // Detailed Notes Section
            const detailedNote = data.notes.find(n => n.type === 'detailed_notes');
            if (detailedNote) {
                doc.addPage();
                doc.fontSize(18).fillColor(primaryColor).text('Detailed Notes', { underline: true });
                doc.moveDown(0.5);
                doc.fontSize(11).fillColor(textColor);
                this.writeMarkdownContent(doc, detailedNote.content);
            }

            // Mind Map / Flowchart (text representation)
            const visualNotes = data.notes.filter(n => n.type === 'mindmap' || n.type === 'flowchart');
            if (visualNotes.length > 0) {
                doc.addPage();
                doc.fontSize(18).fillColor(primaryColor).text('Visual Diagrams', { underline: true });
                doc.moveDown(0.5);

                visualNotes.forEach(note => {
                    doc.fontSize(14).fillColor(textColor).text(note.title);
                    doc.moveDown(0.3);
                    doc.fontSize(11).fillColor(textColor);
                    this.writeMarkdownContent(doc, note.content);
                    doc.moveDown(1);
                });
            }

            // Flashcards Section
            const flashcardsNote = data.notes.find(n => n.type === 'flashcards');
            if (flashcardsNote) {
                doc.addPage();
                doc.fontSize(18).fillColor(primaryColor).text('Flashcards', { underline: true });
                doc.moveDown(0.5);
                doc.fontSize(11).fillColor(textColor);
                this.writeMarkdownContent(doc, flashcardsNote.content);
            }

            // Study Guide Section
            const resourcesNote = data.notes.find(n => n.type === 'resources');
            if (resourcesNote) {
                doc.addPage();
                doc.fontSize(18).fillColor(primaryColor).text('Study Guide', { underline: true });
                doc.moveDown(0.5);
                doc.fontSize(11).fillColor(textColor);
                this.writeMarkdownContent(doc, resourcesNote.content);
            }

            // User Notes (Annotations) Section
            if (data.annotations.length > 0) {
                doc.addPage();
                doc.fontSize(18).fillColor(primaryColor).text('User Notes', { underline: true });
                doc.moveDown(0.5);

                data.annotations.forEach(ann => {
                    doc.fontSize(10).fillColor(mutedColor).text(`[${this.formatTime(ann.timestamp)}]`, { continued: true });
                    doc.fontSize(11).fillColor(textColor).text(`  ${ann.note}`);
                    doc.moveDown(0.3);
                });
            }

            // Full Transcript Section
            doc.addPage();
            doc.fontSize(18).fillColor(primaryColor).text('Full Transcript', { underline: true });
            doc.moveDown(0.5);

            data.transcript.forEach(seg => {
                const timeStr = this.formatTime(seg.start);
                doc.fontSize(9).fillColor(mutedColor).text(timeStr, { continued: true, width: 45 });
                doc.fontSize(10).fillColor(textColor).text(`  ${seg.text}`);
                doc.moveDown(0.2);
            });

            // Footer with page numbers
            const pageCount = doc.bufferedPageRange().count;
            for (let i = 0; i < pageCount; i++) {
                doc.switchToPage(i);
                doc.fontSize(8).fillColor(mutedColor);
                doc.text(
                    `Page ${i + 1} of ${pageCount}`,
                    50,
                    doc.page.height - 30,
                    { align: 'center', width: doc.page.width - 100 }
                );
            }

            doc.end();
        });
    }

    private writeMarkdownContent(doc: PDFKit.PDFDocument, content: string): void {
        // Simple markdown processing - strip markdown syntax for PDF
        const lines = content.split('\n');
        
        lines.forEach(line => {
            // Skip empty lines but add some space
            if (!line.trim()) {
                doc.moveDown(0.3);
                return;
            }

            // Headers
            if (line.startsWith('### ')) {
                doc.fontSize(13).text(line.replace('### ', ''));
                doc.fontSize(11);
                return;
            }
            if (line.startsWith('## ')) {
                doc.fontSize(14).text(line.replace('## ', ''));
                doc.fontSize(11);
                return;
            }
            if (line.startsWith('# ')) {
                doc.fontSize(16).text(line.replace('# ', ''));
                doc.fontSize(11);
                return;
            }

            // Bold text - render without asterisks
            let processedLine = line
                .replace(/\*\*(.*?)\*\*/g, '$1')
                .replace(/__(.*?)__/g, '$1')
                .replace(/\*(.*?)\*/g, '$1')
                .replace(/_(.*?)_/g, '$1');

            // Bullet points
            if (processedLine.startsWith('- ') || processedLine.startsWith('* ')) {
                processedLine = '• ' + processedLine.slice(2);
            }

            // Numbered lists - keep as is
            // Code blocks - remove backticks
            processedLine = processedLine.replace(/`([^`]+)`/g, '$1');

            // Remove mermaid code blocks
            if (processedLine.includes('```mermaid') || processedLine === '```') {
                return;
            }

            doc.text(processedLine);
        });
    }
}

export default new ReportService();
