import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatsCard } from '../StatsCard';
import { Users } from 'lucide-react';

describe('StatsCard', () => {
    it('renders label and value correctly', () => {
        render(<StatsCard icon={Users} label="Total Workers" value="150" />);
        
        expect(screen.getByText('Total Workers')).toBeInTheDocument();
        expect(screen.getByText('150')).toBeInTheDocument();
    });

    it('displays the icon', () => {
        const { container } = render(<StatsCard icon={Users} label="Test" value="0" />);
        // Lucide icons render as SVG
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
    });
});
