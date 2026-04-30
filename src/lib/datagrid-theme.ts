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

  /* ---- Header row ---- */
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
    fontWeight: 600,
    fontSize: 14,
    color: "var(--foreground)",
    textTransform: "none",
    letterSpacing: 0,
  },
  "& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-cell:focus": {
    outline: "none",
  },
  "& .MuiDataGrid-columnHeader:focus-visible, & .MuiDataGrid-cell:focus-visible": {
    outline: "2px solid var(--ring)",
    outlineOffset: -2,
  },

  /* ---- Body rows ---- */
  "& .MuiDataGrid-row": {
    cursor: "pointer",
    transition: "background-color .12s",
  },
  "& .MuiDataGrid-row:hover": {
    backgroundColor: "var(--table-row-hover)",
  },
  "& .MuiDataGrid-row.Mui-selected, & .MuiDataGrid-row.Mui-selected.Mui-hovered, & .MuiDataGrid-row.Mui-selected:hover":
    {
      backgroundColor: "color-mix(in srgb, var(--primary) 8%, var(--table-row))",
    },

  /* ---- Cells ---- */
  "& .MuiDataGrid-cell": {
    borderBottom: "1px solid var(--table-separator)",
    fontSize: 14,
    color: "var(--foreground)",
    display: "flex",
    alignItems: "center",
    padding: "0 16px",
    minWidth: 0,
  },

  /* ---- Footer ---- */
  "& .MuiDataGrid-footerContainer": {
    borderTop: "1px solid var(--table-separator)",
    backgroundColor: "var(--card)",
  },
  "& .MuiTablePagination-root, & .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows, & .MuiDataGrid-selectedRowCount":
    {
      fontFamily: "Outfit, sans-serif",
      fontSize: 13,
      color: "var(--muted-foreground)",
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

  /* ---- Pinned columns (DataGridPro native pinning) ---------------------
   * Cell + header backgrounds are configured globally via the MUI theme
   * (`palette.DataGrid.pinnedBg` / `headerBg`) in `MuiThemeProvider`, so
   * pinned columns inherit the correct tokens automatically.
   *
   * The only gap MUI doesn't paint is the scrollbar gutter aligned with
   * the right-pinned column — fill it with the header token at the top
   * and the card token below so it blends into the rounded wrapper.
   */
  "& .MuiDataGrid-scrollbarFiller--pinnedRight": {
    backgroundColor: "var(--table-header)",
  },
  "& .MuiDataGrid-filler--pinnedRight": {
    backgroundColor: "var(--card)",
  },
  // Keep pinned cells in sync with row-level hover / selection states so
  // the pinned column doesn't visually detach from the row.
  "& .MuiDataGrid-row:hover .MuiDataGrid-cell--pinnedLeft, & .MuiDataGrid-row:hover .MuiDataGrid-cell--pinnedRight":
    {
      backgroundColor: "var(--table-row-hover)",
    },
  "& .MuiDataGrid-row.Mui-selected .MuiDataGrid-cell--pinnedLeft, & .MuiDataGrid-row.Mui-selected .MuiDataGrid-cell--pinnedRight, & .MuiDataGrid-row.Mui-selected:hover .MuiDataGrid-cell--pinnedLeft, & .MuiDataGrid-row.Mui-selected:hover .MuiDataGrid-cell--pinnedRight":
    {
      backgroundColor: "color-mix(in srgb, var(--primary) 8%, var(--table-row))",
    },
};
