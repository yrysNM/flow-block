export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-danger/30 bg-accent-soft px-3 py-2 text-sm text-danger">
      <p>{message}</p>
      {onRetry ? (
        <button className="mt-1 font-medium underline" onClick={onRetry} type="button">
          Try again
        </button>
      ) : null}
    </div>
  )
}
