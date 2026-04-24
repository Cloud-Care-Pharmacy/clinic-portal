import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { SxProps, Theme } from "@mui/material/styles";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Shared sx styles for all MUI DataGrid instances */
export const dataGridSx: SxProps<Theme> = {
  border: "none",
  borderRadius: 2,
  fontFamily: "Outfit, sans-serif",
  fontSize: 14,
  "& .MuiDataGrid-columnHeaders": {
    backgroundColor: "var(--muted)",
    borderBottom: "1px solid var(--border)",
  },
  "& .MuiDataGrid-columnHeaderTitle": {
    fontWeight: 600,
    fontSize: 13,
    color: "var(--muted-foreground)",
  },
  "& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within": {
    outline: "none",
  },
  "& .MuiDataGrid-cell": {
    borderBottom: "1px solid var(--border)",
    display: "flex",
    alignItems: "center",
  },
  "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within": {
    outline: "none",
  },
  "& .MuiDataGrid-row:nth-of-type(odd)": {
    backgroundColor: "color-mix(in srgb, var(--muted) 50%, transparent)",
  },
  "& .MuiDataGrid-row:hover": {
    backgroundColor:
      "color-mix(in srgb, var(--muted) 80%, color-mix(in srgb, var(--primary) 8%, transparent))",
  },
  "& .MuiDataGrid-row.Mui-selected": {
    backgroundColor: "var(--muted)",
    "&:hover": { backgroundColor: "var(--muted)" },
  },
  "& .MuiDataGrid-footerContainer": {
    borderTop: "1px solid var(--border)",
  },
  "& .MuiDataGrid-selectedRowCount": {
    fontFamily: "Outfit, sans-serif",
    fontSize: 13,
    color: "var(--muted-foreground)",
  },
  "& .MuiTablePagination-root": {
    fontFamily: "Outfit, sans-serif",
    fontSize: 13,
    color: "var(--muted-foreground)",
  },
  "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
    fontFamily: "Outfit, sans-serif",
    fontSize: 13,
  },
  "& .MuiCheckbox-root": {
    color: "var(--border)",
    "&.Mui-checked": { color: "var(--primary)" },
  },
  "& .MuiDataGrid-columnSeparator": {
    display: "none",
  },
};
