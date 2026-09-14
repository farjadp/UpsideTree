// Shared by the server page (validating search params) and the client
// table (rendering the selects). Kept out of the "use client" module so
// the server gets real arrays rather than client references.
export const PRODUCT_STATUS_FILTERS = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
] as const;

export const PRODUCT_TYPE_FILTERS = [
  { value: "all", label: "All Types" },
  { value: "physical", label: "Physical" },
  { value: "pod", label: "POD (Printify)" },
  { value: "digital", label: "Digital" },
  { value: "limited", label: "Limited Edition" },
  { value: "variable", label: "Variable" },
] as const;
