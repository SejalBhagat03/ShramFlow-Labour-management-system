import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/**
 * QuickActionsGrid component providing a grid of interactive action buttons.
 * Designed with premium micro-interactions and mobile-friendly layouts.
 *
 * @param {Object} props - Component properties.
 * @param {Array} props.actions - Array of action objects containing icon, label, and onClick handler.
 * @param {string} [props.className] - Additional CSS classes.
 * @returns {JSX.Element} The QuickActionsGrid component.
 */
export const QuickActionsGrid = ({ actions, className }) => {
    return (
        <div className={cn('grid grid-cols-2 gap-3', className)}>
            {actions.map((action, index) => (
                <button
                    key={index}
                    className={cn(
                        'flex flex-col items-center justify-center gap-3 p-5 rounded-2xl border border-border bg-white transition-all duration-200 hover:border-emerald-200 hover:bg-emerald-50/10 group',
                    )}
                    onClick={action.onClick}
                >
                    <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 transition-transform group-hover:scale-110">
                        <action.icon className="h-5 w-5" strokeWidth={2.5} />
                    </div>
                    <span className="text-xs font-bold text-foreground tracking-tight">
                        {action.label}
                    </span>
                </button>
            ))}
        </div>
    );
};
