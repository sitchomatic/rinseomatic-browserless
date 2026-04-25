export function analyzeCredentials(credentials = [], sites = [], selectedIds = new Set(), siteFilter = "all", search = "") {
  const normalizedSearch = search.trim().toLowerCase();
  const countsBySite = {};
  const selectedItems = [];
  const filtered = [];
  let firstSiteWithCredentials = "";

  for (const credential of credentials) {
    countsBySite[credential.site_key] = (countsBySite[credential.site_key] || 0) + 1;
    if (selectedIds.has(credential.id)) selectedItems.push(credential);

    if (siteFilter !== "all" && credential.site_key !== siteFilter) continue;
    if (normalizedSearch && !(credential.username || "").toLowerCase().includes(normalizedSearch)) continue;
    filtered.push(credential);
  }

  for (const site of sites) {
    if (countsBySite[site.key] > 0) {
      firstSiteWithCredentials = site.key;
      break;
    }
  }

  const runSiteKey = selectedItems[0]?.site_key;
  const sameSite = selectedItems.every((credential) => credential.site_key === runSiteKey);
  const currentFilterHasCredentials = siteFilter === "all" || (countsBySite[siteFilter] || 0) > 0;

  return {
    filtered,
    countsBySite,
    selectedItems,
    runSiteKey,
    sameSite,
    canRunSelected: selectedItems.length > 0 && sameSite,
    firstSiteWithCredentials,
    currentFilterHasCredentials,
  };
}