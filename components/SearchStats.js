// components/SearchStats.js - Search statistics display
export function SearchStats({ 
  searchType, 
  totalResults, 
  searchTime, 
  filters 
}) {
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-lg font-semibold text-purple-700">
            {totalResults.toLocaleString()}
          </span>
          <span className="text-gray-600 ml-1">
            {searchType === 'users' ? 'gardeners' : 
             searchType === 'gardens' ? 'gardens' : 'flowers'} found
          </span>
        </div>
        
        {searchTime && (
          <div className="text-sm text-gray-500">
            Search completed in {searchTime}ms
          </div>
        )}
      </div>
      
      {/* Active filters display */}
      {Object.values(filters).some(v => v !== '' && v !== false && v !== 0) && (
        <div className="mt-2 flex flex-wrap gap-1">
          <span className="text-xs text-gray-500">Filters:</span>
          {filters.hasPhoto && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">Has Photo</span>}
          {filters.hasBio && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">Has Bio</span>}
          {filters.isActive && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Active</span>}
          {filters.minBlooms > 0 && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">{filters.minBlooms}+ Blooms</span>}
          {filters.rarity && <span className="text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded-full">{filters.rarity}</span>}
          {filters.specialOnly && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">Special Only</span>}
        </div>
      )}
    </div>
  );
}
