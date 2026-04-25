import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { SxProps, Theme } from "@mui/material/styles";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Shared sx styles for all MUI DataGrid instances — unified table spec */
export const dataGridSx: SxProps<Theme> = {
  border: "none",
  borderRadius: 0,
  overflow: "hidden",
  fontFamily: "Outfit, sans-serif",
  fontSize: 14,
  backgroundColor: "var(--background)",

  /* ---- Header row ---- */
  "& .MuiDataGrid-columnHeaders": {
    backgroundColor: "var(--table-header)",
    borderBottom: "1px solid var(--border)",
    minHeight: "44px !important",
    maxHeight: "44px !important",
  },
  "& .MuiDataGrid-columnHeader": {
    padding: "0 16px",
  },
  "& .MuiDataGrid-columnHeaderTitle": {
    fontWeight: 700,
    fontSize: 12,
    color: "var(--foreground)",
    textTransform: "none",
    letterSpacing: 0,
  },
  "& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within": {
    outline: "none",
  },

  /* ---- Body rows ---- */
  "& .MuiDataGrid-row": {
    backgroundColor: "var(--background)",
    cursor: "pointer",
    transition: "background-color .12s",
  },
  "& .MuiDataGrid-row:hover": {
    backgroundColor: "var(--accent)",
  },
  "& .MuiDataGrid-row.Mui-selected": {
    backgroundColor: "color-mix(in srgb, var(--primary) 8%, var(--background))",
    "&:hover": {
      backgroundColor: "color-mix(in srgb, var(--primary) 8%, var(--background))",
    },
  },

  /* ---- Cells ---- */
  "& .MuiDataGrid-cell": {
    borderBottom: "1px solid var(--border)",
    fontSize: 14,
    color: "var(--foreground)",
    display: "flex",
    alignItems: "center",
    padding: "0 16px",
    minWidth: 0,
  },
  "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within": {
    outline: "none",
  },
  "& .MuiDataGrid-row:last-of-type .MuiDataGrid-cell": {
    borderBottom: "none",
  },

  /* ---- Footer ---- */
  "& .MuiDataGrid-footerContainer": {
    borderTop: "1px solid var(--border)",
    backgroundColor: "var(--card)",
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

  /* ---- Chrome ---- */
  "& .MuiCheckbox-root": {
    color: "var(--border)",
    "&.Mui-checked": { color: "var(--primary)" },
  },
  "& .MuiDataGrid-columnSeparator": {
    display: "none",
  },
};
