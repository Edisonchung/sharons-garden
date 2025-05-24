
// components/ui/input.js
export function Input({ type = 'text', ...props }) {
  return (
    <input
      type={type}
      className="p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 w-full"
      {...props}
    />
  );
}
