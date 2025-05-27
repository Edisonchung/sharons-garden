// components/SearchFilters.js - Advanced search filters
export function SearchFilters({ 
  searchType, 
  filters, 
  onFilterChange, 
  onReset 
}) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-purple-700">🔧 Search Filters</h3>
        <button
          onClick={onReset}
          className="text-sm text-gray-500 hover:text-purple-600"
        >
          Reset
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {searchType === 'users' && (
          <>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filters.hasPhoto}
                onChange={(e) => onFilterChange('hasPhoto', e.target.checked)}
                className="rounded border-purple-300"
              />
              <span className="text-sm">Has profile photo</span>
            </label>
            
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filters.hasBio}
                onChange={(e) => onFilterChange('hasBio', e.target.checked)}
                className="rounded border-purple-300"
              />
              <span className="text-sm">Has bio</span>
            </label>
            
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filters.isActive}
                onChange={(e) => onFilterChange('isActive', e.target.checked)}
                className="rounded border-purple-300"
              />
              <span className="text-sm">Active (last 7 days)</span>
            </label>
            
            <div>
              <label className="block text-sm text-gray-700 mb-1">Min blooms:</label>
              <input
                type="number"
                min="0"
                value={filters.minBlooms}
                onChange={(e) => onFilterChange('minBlooms', parseInt(e.target.value) || 0)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
          </>
        )}
        
        {searchType === 'gardens' && (
          <>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filters.hasActiveSeeds}
                onChange={(e) => onFilterChange('hasActiveSeeds', e.target.checked)}
                className="rounded border-purple-300"
              />
              <span className="text-sm">Has growing seeds</span>
            </label>
            
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filters.acceptsHelp}
                onChange={(e) => onFilterChange('acceptsHelp', e.target.checked)}
                className="rounded border-purple-300"
              />
              <span className="text-sm">Accepts help</span>
            </label>
            
            <div>
              <label className="block text-sm text-gray-700 mb-1">Min active seeds:</label>
              <input
                type="number"
                min="0"
                value={filters.minActiveSeeds}
                onChange={(e) => onFilterChange('minActiveSeeds', parseInt(e.target.value) || 0)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
          </>
        )}
        
        {searchType === 'flowers' && (
          <>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Rarity:</label>
              <select
                value={filters.rarity}
                onChange={(e) => onFilterChange('rarity', e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="">All</option>
                <option value="common">Common</option>
                <option value="rare">Rare</option>
                <option value="rainbow">Rainbow</option>
                <option value="legendary">Legendary</option>
              </select>
            </div>
            
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filters.specialOnly}
                onChange={(e) => onFilterChange('specialOnly', e.target.checked)}
                className="rounded border-purple-300"
              />
              <span className="text-sm">Special seeds only</span>
            </label>
            
            <div>
              <label className="block text-sm text-gray-700 mb-1">Bloomed within:</label>
              <select
                value={filters.bloomedWithin}
                onChange={(e) => onFilterChange('bloomedWithin', e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="">Anytime</option>
                <option value="1">Last day</option>
                <option value="7">Last week</option>
                <option value="30">Last month</option>
              </select>
            </div>
          </>
        )}
        
        <div>
          <label className="block text-sm text-gray-700 mb-1">Sort by:</label>
          <select
            value={filters.sortBy}
            onChange={(e) => onFilterChange('sortBy', e.target.value)}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
          >
            <option value="relevance">Relevance</option>
            <option value="newest">Newest</option>
            <option value="active">Most Active</option>
            {searchType === 'users' && <option value="popular">Most Popular</option>}
            {searchType === 'gardens' && <option value="needsHelp">Needs Help</option>}
            {searchType === 'flowers' && <option value="rarity">By Rarity</option>}
          </select>
        </div>
      </div>
    </div>
  );
}
