interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'full' | 'compact';
}

export function EmptyState({ icon, title, description, actionLabel, onAction, variant = 'full' }: EmptyStateProps) {
  if (variant === 'compact') {
    return (
      <div className="text-center py-8 animate-in">
        <div className="text-4xl mb-3">{icon}</div>
        <p className="font-medium text-[var(--color-text-secondary)]">{title}</p>
        <p className="text-sm text-[var(--color-text-tertiary)] mt-1">{description}</p>
        {actionLabel && onAction && (
          <button type="button" onClick={onAction} className="btn btn-secondary mt-4">
            {actionLabel}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-12 text-center px-4 animate-in">
      <div className="text-5xl mb-4">{icon}</div>
      <p className="text-lg font-medium text-[var(--color-text-secondary)]">{title}</p>
      <p className="text-sm text-[var(--color-text-tertiary)] mt-1 max-w-xs">{description}</p>
      {actionLabel && onAction && (
        <button onClick={onAction} className="btn btn-primary mt-6">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
