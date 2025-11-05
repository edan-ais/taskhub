export function LoadingSpinner({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <div className={`inline-block ${className}`}>
      <div
        className="animate-spin rounded-full border-2 border-current border-t-transparent"
        style={{ width: size, height: size }}
      />
    </div>
  );
}
