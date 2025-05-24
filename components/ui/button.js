// components/ui/button.js
export function Button({ children, onClick, className = '', variant = 'default', disabled = false }) {
  const base = 'px-4 py-2 rounded font-semibold focus:outline-none transition';
  const variants = {
    default: 'bg-purple-600 hover:bg-purple-700 text-white',
    outline: 'border border-purple-600 text-purple-600 hover:bg-purple-50',
    destructive: 'bg-red-600 hover:bg-red-700 text-white'
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant] || variants.default} ${className}`}
    >
      {children}
    </button>
  );
}
