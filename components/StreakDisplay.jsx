export default function StreakDisplay({ streak }) {
  if (!streak || streak <= 0) return null;

  return (
    <div className="flex items-center gap-2 text-orange-600 font-semibold bg-orange-100 px-3 py-1 rounded-full shadow text-sm">
      🔥 Streak: {streak} day{streak > 1 ? 's' : ''}
    </div>
  );
}
