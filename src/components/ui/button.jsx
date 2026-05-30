export function Button({ className = "", variant = "default", children, ...props }) {
  const baseStyle = "inline-flex items-center justify-center font-medium transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 cursor-pointer active:scale-[0.98]";
  
  const variants = {
    default: "bg-emerald-400 text-emerald-950 hover:bg-emerald-300",
    outline: "border border-white/20 bg-white/5 hover:bg-white/10 text-white",
  };
  
  const variantStyle = variants[variant] || variants.default;

  return (
    <button
      className={`${baseStyle} ${variantStyle} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
