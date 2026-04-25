import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { SxProps, Theme } from "@mui/material/styles";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Shared sx styles for all MUI DataGrid instances — matches .data-grid spec */
export const dataGridSx: SxProps<Theme> = {
  border: "1px solid var(--border)",
  borderRadius: "12px",
  overflow: "hidden",
  fontFamily: "Outfit, sans-serif",
  fontSize: 14,
  backgroundColor: "var(--card)",
  "& .MuiDataGrid-columnHeaders": {
    backgroundColor: "var(--muted)",
    borderBottom: "1px solid var(--border)",
  },
  "& .MuiDataGrid-columnHeaderTitle": {
    fontWeight: 500,
    fontSize: 12,
    color: "var(--muted-foreground)",
    textTransform: "none",
  },
  "& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within": {
    outline: "none",
  },
  "& .MuiDataGrid-cell": {
    borderBottom: "1px solid var(--border)",
    display: "flex",
    alignItems: "center",
    padding: "14px 16px",
    minWidth: 0,
  },
  "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within": {
    outline: "none",
  },
  "& .MuiDataGrid-row:last-of-type .MuiDataGrid-cell": {
    borderBottom: "none",
  },
  "& .MuiDataGrid-row": {
    cursor: "pointer",
    transition: "background-color .12s",
  },
  "& .MuiDataGrid-row:hover": {
    backgroundColor: "var(--accent)",
  },
  "& .MuiDataGrid-row.Mui-selected": {
    backgroundColor: "var(--muted)",
    "&:hover": { backgroundColor: "var(--muted)" },
  },
  "& .MuiDataGrid-footerContainer": {
    backgroundColor: "var(--card)",
    borderTop: "1px solid var(--border)",
    padding: "8px 14px",
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
