import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../App';

describe('App Component', () => {
    it('renders the App without crashing', () => {
        render(<App />);
        expect(document.body).toBeDefined();
    });
});
