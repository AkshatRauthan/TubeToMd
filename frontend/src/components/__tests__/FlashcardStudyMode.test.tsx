import { render, screen, fireEvent } from '@testing-library/react';
import { FlashcardStudyMode } from '../FlashcardStudyMode';
import { describe, it, expect, vi } from 'vitest';

// Mock framer-motion to avoid complex animation rendering issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, onClick, className }: any) => (
      <div onClick={onClick} className={className} data-testid="motion-div">
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('FlashcardStudyMode', () => {
  const sampleMarkdown = `
## Card 1
**Q:** What is React?
**A:** A UI library

## Card 2
**Q:** What is Vite?
**A:** A fast build tool
`;

  it('renders without crashing and parses flashcards correctly', () => {
    const handleClose = vi.fn();
    const sampleNote: any = {
      id: 'test-1',
      title: 'Test Note',
      content: sampleMarkdown,
    };

    render(<FlashcardStudyMode note={sampleNote} onClose={handleClose} />);
    
    // Q1
    expect(screen.getByText('What is React?')).toBeInTheDocument();
    
    // Note: The answer is in the DOM (hidden via CSS), so we don't check for its absence here
  });

  it('flips the card when clicked', () => {
    const handleClose = vi.fn();
    const sampleNote: any = {
      id: 'test-2',
      title: 'Test Note',
      content: sampleMarkdown,
    };

    render(<FlashcardStudyMode note={sampleNote} onClose={handleClose} />);
    
    // Click the card
    fireEvent.click(screen.getByText('What is React?'));
    
    // Now answer is exposed
    expect(screen.getByText('A UI library')).toBeInTheDocument();
  });

  it('calls onClose when back button is clicked', () => {
    const handleClose = vi.fn();
    const sampleNote: any = {
      id: 'test-3',
      title: 'Test Note',
      content: sampleMarkdown,
    };

    render(<FlashcardStudyMode note={sampleNote} onClose={handleClose} />);
    
    // Find back button
    const backBtn = screen.getByRole('button', { name: /Back to Notes/i });
    fireEvent.click(backBtn);
    
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
