export function analyzeCredentials(credentials = [], sites = [], selectedIds = new Set(), siteFilter = "all", search = "") {
  const normalizedSearch = search.trim().toLowerCase();
  const selectedItems = [];
  const filtered = [];

  for (const credential of credentials) {
    if (selectedIds.has(credential.id)) selectedItems.push(credential);
    const status = credential.status || "untested";
    if (siteFilter !== "all" && status !== siteFilter) continue;
    if (normalizedSearch && !(credential.username || "").toLowerCase().includes(normalizedSearch)) continue;
    filtered.push(credential);
  }

  return {
    filtered,
    countsBySite: {},
    selectedItems,
    runSiteKey: "",
    sameSite: true,
    canRunSelected: selectedItems.length > 0,
    firstSiteWithCredentials: sites[0]?.key || "",
    currentFilterHasCredentials: filtered.length > 0,
  };
}