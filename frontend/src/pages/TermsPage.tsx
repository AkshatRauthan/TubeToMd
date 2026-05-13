import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';

const SECTIONS = [
    {
        title: 'Acceptance of Terms',
        content: `By accessing or using TubeToMD, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, you may not use the service. We reserve the right to update these terms at any time — continued use after changes constitutes acceptance.`,
    },
    {
        title: 'Eligibility',
        content: `You must be at least 13 years old to use TubeToMD. If you are under 18, you must have parental consent. By creating an account, you represent that you meet these eligibility requirements.`,
    },
    {
        title: 'Your Account',
        content: `You are responsible for maintaining the security of your account credentials. You must notify us immediately at support@tubetomd.com if you suspect unauthorized access. TubeToMD is not liable for any loss resulting from unauthorized use of your account. You may not share accounts or create accounts using automated means.`,
    },
    {
        title: 'Acceptable Use',
        content: `You agree not to:\n• Submit videos that contain illegal, harmful, or infringing content\n• Attempt to reverse-engineer, scrape, or extract data from TubeToMD in bulk\n• Use TubeToMD to generate content that violates copyright, privacy rights, or applicable law\n• Circumvent usage limits or access controls\n• Resell or sublicense TubeToMD's output as a competing service\n\nWe reserve the right to suspend or terminate accounts that violate these rules.`,
    },
    {
        title: 'Intellectual Property',
        content: `TubeToMD and its original code, design, and brand are owned by us and protected by copyright law. The notes, summaries, mindmaps, and other AI-generated content created from your sessions are yours — you retain full ownership of your output. We do not claim any rights over your generated content.`,
    },
    {
        title: 'Third-Party Content',
        content: `TubeToMD processes YouTube videos using publicly accessible transcription. We do not host or redistribute video content. You are responsible for ensuring that your use of third-party video content complies with YouTube's Terms of Service and applicable copyright law. TubeToMD is not responsible for any third-party content accessed through the service.`,
    },
    {
        title: 'Free & Paid Tiers',
        content: `TubeToMD offers a free tier with usage limits. Paid tiers (if/when available) are subject to their own pricing terms communicated at checkout. We reserve the right to modify, restrict, or discontinue features of any tier at any time with reasonable notice.`,
    },
    {
        title: 'Disclaimers & Limitation of Liability',
        content: `TubeToMD is provided "as is" without warranties of any kind. AI-generated content may contain inaccuracies — always verify important information. To the fullest extent permitted by law, TubeToMD shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the service. Our total liability to you shall not exceed the amount you paid us in the past 12 months.`,
    },
    {
        title: 'Termination',
        content: `You may close your account at any time from account settings. We may suspend or terminate your access for violations of these terms, extended inactivity, or for any other reason with reasonable notice. Upon termination, your data will be deleted within 30 days.`,
    },
    {
        title: 'Governing Law',
        content: `These terms are governed by the laws of India. Any disputes arising from these terms shall be resolved through binding arbitration in accordance with applicable Indian law, except that either party may seek injunctive relief in a court of competent jurisdiction.`,
    },
];

export function TermsPage() {
    return (
        <div className="min-h-screen pt-20 pb-16 px-6">
            <div className="max-w-3xl mx-auto">
                {/* Back */}
                <Link
                    to="/"
                    className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-pink-400 transition-colors mb-8"
                >
                    <ArrowLeft className="h-4 w-4" /> Back to Home
                </Link>

                {/* Header */}
                <div className="flex items-start gap-4 mb-10">
                    <div className="p-3 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex-shrink-0">
                        <FileText className="h-6 w-6 text-pink-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-2">
                            Terms of Service
                        </h1>
                        <p className="text-slate-500 text-sm">
                            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                </div>

                {/* Intro */}
                <div className="glass-card rounded-2xl p-6 mb-8 border-l-4 border-pink-500">
                    <p className="text-on-surface-variant leading-relaxed">
                        These Terms of Service govern your access to and use of TubeToMD. Please read them
                        carefully. If you have any questions, reach out to us at{' '}
                        <a href="mailto:legal@tubetomd.com" className="text-pink-400 hover:underline">
                            legal@tubetomd.com
                        </a>
                        .
                    </p>
                </div>

                {/* Sections */}
                <div className="space-y-5">
                    {SECTIONS.map((section, i) => (
                        <div key={i} className="glass-card rounded-2xl p-7">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
                                {i + 1}. {section.title}
                            </h2>
                            <p className="text-on-surface-variant text-sm leading-relaxed whitespace-pre-line">
                                {section.content}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Contact */}
                <div className="mt-8 glass-card rounded-2xl p-6 text-center">
                    <p className="text-slate-500 text-sm">
                        Have questions about these terms?{' '}
                        <Link to="/contact" className="text-pink-400 hover:underline font-medium">
                            Contact us
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}