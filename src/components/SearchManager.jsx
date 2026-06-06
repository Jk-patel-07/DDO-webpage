import { useSearch } from '@/hooks/useSearch';
import { SearchPopup } from './SearchPopup';
import { SearchIndicator } from './SearchIndicator';

export function SearchManager() {
  const { searches, activeSearchId } = useSearch();

  const visibleSearches = Object.values(searches).filter(s => s.isVisible);

  return (
    <>
      {/* Visible Search Popups */}
      {visibleSearches.map(search => (
        <SearchPopup key={search.id} searchId={search.id} />
      ))}

      {/* Floating Search Indicator */}
      <SearchIndicator />
    </>
  );
}
