import type { SxProps, Theme } from "@mui/material/styles";

/**
 * Shared sx styles for all MUI DataGrid instances.
 * Implements the Quity Clinic Portal Design System § 09.
 *
 * Non-negotiable #5: No per-page DataGrid styling — every grid uses this object.
 * If a screen genuinely needs to differ, add a documented variant here.
 */
export const dataGridSx: SxProps<Theme> = {
  border: "none",
  borderRadius: 0,
  overflow: "hidden",
  fontFamily: "Outfit, sans-serif",
  fontSize: 14,
  backgroundColor: "var(--table-row)",

  /* ---- Header row ---- */
  "& .MuiDataGrid-columnHeaders": {
    backgroundColor: "var(--table-header)",
    borderBottom: "1px solid var(--table-separator)",
    minHeight: "44px !important",
    maxHeight: "44px !important",
  },
  "& .MuiDataGrid-columnHeader": {
    padding: "0 16px",
  },
  "& .MuiDataGrid-columnHeaderCheckbox": {
    padding: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  "& .MuiDataGrid-columnHeaderTitle": {
    fontWeight: 500,
    fontSize: 12,
    color: "var(--foreground)",
    textTransform: "none",
    letterSpacing: 0,
  },
  "& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within": {
    outline: "2px solid var(--ring)",
    outlineOffset: -2,
  },

  /* ---- Body rows ---- */
  "& .MuiDataGrid-row": {
    backgroundColor: "var(--table-row)",
    cursor: "pointer",
    transition: "background-color .12s",
  },
  "& .MuiDataGrid-row:hover": {
    backgroundColor: "var(--table-hover)",
  },
  "& .MuiDataGrid-row.Mui-selected": {
    backgroundColor: "color-mix(in srgb, var(--primary) 8%, var(--table-row))",
    "&:hover": {
      backgroundColor: "color-mix(in srgb, var(--primary) 8%, var(--table-row))",
    },
  },

  /* ---- Cells ---- */
  "& .MuiDataGrid-cell": {
    borderBottom: "1px solid var(--table-separator)",
    fontSize: 14,
    color: "var(--foreground)",
    display: "flex",
    alignItems: "center",
    padding: "12px 16px",
    minWidth: 0,
  },
  "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within": {
    outline: "2px solid var(--ring)",
    outlineOffset: -2,
  },
  "& .MuiDataGrid-row:last-of-type .MuiDataGrid-cell": {
    borderBottom: "none",
  },

  /* ---- Footer ---- */
  "& .MuiDataGrid-footerContainer": {
    borderTop: "1px solid var(--table-separator)",
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
    color: "var(--border)",
    opacity: 0,
    transition: "opacity .15s",
  },
  "& .MuiDataGrid-columnHeader:hover .MuiDataGrid-columnSeparator": {
    opacity: 1,
  },
};
