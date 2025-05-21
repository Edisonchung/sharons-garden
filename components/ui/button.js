
export function Button({ children, onClick, className = '' }) {
  return (
    <button
      onClick={onClick}
      className={`bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 ${className}`}
    >
      {children}
    </button>
  );
}
