import DDOCompanyWebsite from "./ddo_company_3_d_nature_website.jsx";
import { SearchProvider } from "@/contexts/SearchContext";
import { SearchManager } from "@/components/SearchManager";

function AppWithSearch() {
  return (
    <SearchProvider>
      <DDOCompanyWebsite />
      <SearchManager />
    </SearchProvider>
  );
}

export default AppWithSearch;
