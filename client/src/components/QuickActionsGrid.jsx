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
                <Button
                    key={index}
                    variant={action.variant === 'primary' ? 'default' : 'outline'}
                    className={cn(
                        'relative group h-auto flex-col gap-3 py-5 px-4 rounded-xl',
                        'transition-all duration-300 overflow-hidden',
                        action.variant === 'primary'
                            ? 'gradient-primary shadow-glow-sm hover:shadow-glow hover:-translate-y-0.5 border-0'
                            : 'bg-card hover:bg-accent/50 hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-md'
                    )}
                    onClick={action.onClick}
                    style={{ animationDelay: `${index * 75}ms` }}
                >
                    {/* Hover shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

                    <div className={cn(
                        'relative p-2.5 rounded-lg transition-transform duration-300 group-hover:scale-110',
                        action.variant === 'primary'
                            ? 'bg-primary-foreground/20'
                            : 'bg-primary/10'
                    )}>
                        <action.icon className={cn(
                            'h-5 w-5',
                            action.variant === 'primary' ? 'text-primary-foreground' : 'text-primary'
                        )} strokeWidth={2.5} />
                    </div>
                    <span className={cn(
                        'relative text-xs font-semibold tracking-wide',
                        action.variant === 'primary' ? 'text-primary-foreground' : 'text-foreground'
                    )}>
                        {action.label}
                    </span>
                </Button>
            ))}
        </div>
    );
};
