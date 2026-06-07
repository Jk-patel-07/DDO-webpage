import { useSearch } from '@/hooks/useSearch';
import { ChatStyleSearchPopup } from './ChatStyleSearchPopup';
import { SearchIndicator } from './SearchIndicator';

export function SearchManager() {
  const { searches } = useSearch();

  const visibleSearches = Object.values(searches).filter(s => s.isVisible);

  return (
    <>
      {/* Visible Search Popups */}
      {visibleSearches.map(search => (
        <ChatStyleSearchPopup key={search.id} searchId={search.id} />
      ))}

      {/* Floating Search Indicator */}
      <SearchIndicator />
    </>
  );
}
