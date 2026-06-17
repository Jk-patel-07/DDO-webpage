import DDOCompanyWebsite from "./ddo_company_3_d_nature_website.jsx";
import { SearchProvider } from "@/contexts/SearchContext";

function AppWithSearch() {
  return (
    <SearchProvider>
      <DDOCompanyWebsite />
    </SearchProvider>
  );
}

export default AppWithSearch;
