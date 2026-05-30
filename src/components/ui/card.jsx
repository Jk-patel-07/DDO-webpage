export function Card({ className = "", children, ...props }) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-[#0c1e17] text-white shadow ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardContent({ className = "", children, ...props }) {
  return (
    <div className={`p-6 ${className}`} {...props}>
      {children}
    </div>
  );
}
