export function AuthShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-mist px-4">
      <div className="w-full max-w-sm rounded-card border border-line bg-white p-8 shadow-card">
        <p className="font-display text-lg font-semibold text-ink">Dayflow</p>
        <h1 className="mt-1 text-xl font-semibold text-ink">{title}</h1>
        <div className="mt-6">{children}</div>
      </div>
      <style jsx global>{`
        .input {
          width: 100%;
          border: 1px solid #e3e6ef;
          border-radius: 10px;
          padding: 0.55rem 0.75rem;
          font-size: 0.875rem;
          background: white;
        }
        .input:focus {
          outline: none;
          border-color: #3355ff;
          box-shadow: 0 0 0 3px #e8ecff;
        }
        .btn-primary {
          background: #3355ff;
          color: white;
          font-weight: 500;
          font-size: 0.875rem;
          border-radius: 10px;
          padding: 0.6rem 1rem;
          transition: background-color 0.15s ease;
        }
        .btn-primary:hover {
          background: #1f3acc;
        }
        .btn-primary:disabled {
          opacity: 0.6;
        }
      `}</style>
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-ink">{label}</span>
      {children}
    </label>
  );
}
