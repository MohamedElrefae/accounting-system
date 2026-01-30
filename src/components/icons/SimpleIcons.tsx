/* @refresh skip */
// Lightweight SVG icons to replace MUI icons and avoid EMFILE errors
import React from 'react';
import { SvgIcon } from '@mui/material';
import type { SvgIconProps } from '@mui/material/SvgIcon';

// Core Navigation Icons
export const MenuIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" /></SvgIcon>
);

export const NotificationsIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" /></SvgIcon>
);

export const AccountCircleIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" /></SvgIcon>
);

export const SettingsIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.82,11.69,4.82,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z" /></SvgIcon>
);

export const HomeIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></SvgIcon>
);

export const LogoutIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" /></SvgIcon>
);

export const VisibilityIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" /></SvgIcon>
);

export const VisibilityOffIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" /></SvgIcon>
);

export const ArrowBackIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></SvgIcon>
);

export const ArrowForwardIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" /></SvgIcon>
);

export const SendIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></SvgIcon>
);

export const History: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" /></SvgIcon>
);

export const ExpandMoreIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z" /></SvgIcon>
);

export const ExpandLessIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z" /></SvgIcon>
);

export const LanguageIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.91 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2 0 .68.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.9-4.33-3.56zm2.95-8H5.08c.96-1.66 2.49-2.93 4.33-3.56C8.81 5.55 8.35 6.75 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2 0-.68.07-1.35.16-2h4.68c.09.65.16 1.32.16 2 0 .68-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95c-.96 1.65-2.49 2.93-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2 0-.68-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z" /></SvgIcon>
);

export const DashboardIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" /></SvgIcon>
);

export const AccountTreeIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M22 11V3h-7v3H9V3H2v8h7V8h2v10h4v3h7v-8h-7v3h-2V8h2v3z" /></SvgIcon>
);

export const ReceiptIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M18 17H6v-2h12v2zm0-4H6v-2h12v2zm0-4H6V7h12v2zM3 22l1.5-1.5L6 22l1.5-1.5L9 22l1.5-1.5L12 22l1.5-1.5L15 22l1.5-1.5L18 22l1.5-1.5L21 22V2l-1.5 1.5L18 2l-1.5 1.5L15 2l-1.5 1.5L12 2l-1.5 1.5L9 2 7.5 3.5 6 2 4.5 3.5 3 2v20z" /></SvgIcon>
);

export const PeopleIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" /></SvgIcon>
);

export const DescriptionIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" /></SvgIcon>
);

export const AssessmentIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" /></SvgIcon>
);

export const ListIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" /></SvgIcon>
);

export const InventoryIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M20 2H4c-1 0-2 .9-2 2v3.01c0 .72.43 1.34 1 1.69V20c0 1.1 1.1 2 2 2h14c.9 0 2-.9 2-2V8.7c.57-.35 1-.97 1-1.69V4c0-1.1-1-2-2-2zm-5 12H9v-2h6v2zm5-7H4V4h16v3z" /></SvgIcon>
);

export const AddIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></SvgIcon>
);

export const EditIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></SvgIcon>
);

export const DeleteIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></SvgIcon>
);

// Outline variant for delete (used as DeleteOutline)
export const DeleteOutlineIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM8 9h8v10H8V9z" />
    <path d="M15.5 4l-1-1h-5l-1 1H5v2h14V4z" />
  </SvgIcon>
);

export const ChevronRightIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" /></SvgIcon>
);

export const CategoryIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M12 2l-5.5 9h11z" /><circle cx="17.5" cy="17.5" r="4.5" /><path d="M3 13.5h8v8H3z" /></SvgIcon>
);

export const LocalShippingIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" /></SvgIcon>
);

export const AutoAwesomeIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z" /></SvgIcon>
);

export const AccountBalanceIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M4 10v7h3v-7H4zm6 0v7h3v-7h-3zM2 22h19v-3H2v3zm14-12v7h3v-7h-3zm-4.5-9L2 6v2h19V6l-9.5-5z" /></SvgIcon>
);

export const ZoomInIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zm2.5-4h-2v2H9v-2H7V9h2V7h1v2h2v1z" /></SvgIcon>
);

export const ZoomOutIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zM7 9h5v1H7z" /></SvgIcon>
);

export const NavigateBeforeIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" /></SvgIcon>
);

export const NavigateNextIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" /></SvgIcon>
);

export const FilterAltIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M4.25 5.61C6.27 8.2 10 13 10 13v6c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-6s3.72-4.8 5.74-7.39c.51-.66.04-1.61-.79-1.61H5.04c-.83 0-1.3.95-.79 1.61z" /></SvgIcon>
);

// Legacy alias for MUI FilterList icon (horizontal filter button)
export const FilterListIcon: React.FC<SvgIconProps> = (props) => (
  <FilterAltIcon {...props} />
);

export const SortIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M3 18h6v-2H3v2zm0-7h12v-2H3v2zm0-7v2h18V4H3z" /></SvgIcon>
);

export const SearchIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" /></SvgIcon>
);

export const GroupIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" /></SvgIcon>
);

// GroupWork icon for grouping functionality
export const GroupWorkIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM8 17.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5zM9.5 8c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5S9.5 9.38 9.5 8zm6.5 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></SvgIcon>
);

export const KeyIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" /></SvgIcon>
);

// Performance & utility icons used only in dev/diagnostic UIs
export const SpeedIcon: React.FC<SvgIconProps> = (props) => (
  // Reuse the TrendingUp arrow shape to indicate speed/performance
  <TrendingUpIcon {...props} />
);

export const MemoryIcon: React.FC<SvgIconProps> = (props) => (
  // Simple chip-style memory icon
  <SvgIcon {...props}><path d="M15 9H9v6h6V9z" /><path d="M3 5v14h18V5H3zm16 12H5V7h14v10z" /></SvgIcon>
);

export const NetworkCheckIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M15.9 5.02L14.5 6.4C16.99 7.36 18.86 9.53 19.5 12h2.02c-.7-3.38-3.02-6.12-5.62-6.98z" /><path d="M1 9l2 2c2.76-2.76 6.44-3.42 9.73-2.1L14.2 7.4C10.1 5.61 5.17 6.34 1 9z" /><path d="M5 13l2 2c1.42-1.42 3.55-1.88 5.39-1.1l1.73-1.73C11.54 10.79 7.83 11.17 5 13z" /><path d="M12 20l4-4-1.41-1.41L12 17.17l-1.59-1.58L9 17l3 3z" /></SvgIcon>
);

export const TimerIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M15 1H9v2h6V1z" /><path d="M19.03 7.39L20.45 5.97 19.03 4.55l-1.41 1.41A7.96 7.96 0 0012 4c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8c0-1.85-.63-3.55-1.69-4.91zM12 18c-3.31 0-6-2.69-6-6 0-3.31 2.69-6 6-6 3.31 0 6 2.69 6 6 0 3.31-2.69 6-6 6z" /><path d="M13 9h-2v4h4v-2h-2z" /></SvgIcon>
);

export const LightbulbIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M9 21h6v-1H9v1zm3-20C8.14 1 5 4.14 5 8c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-3.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z" /></SvgIcon>
);

export const CodeIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0L19.2 12l-4.6-4.6L16 6l6 6-6 6-1.4-1.4z" /></SvgIcon>
);

export const SelectAllIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M3 5h2V3H3v2zm4 0h2V3H7v2zm4 0h2V3h-2v2zm4 0h2V3h-2v2zM3 9h2V7H3v2zm14-2v2h2V7h-2zM3 13h2v-2H3v2zm14-2v2h2v-2h-2zM3 17h2v-2H3v2zm14-2v2h2v-2h-2zM7 21h2v-2H7v2zm4 0h2v-2h-2v2zm-8 0h2v-2H3v2zm12 0h2v-2h-2v2z" /></SvgIcon>
);

export const ClearIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></SvgIcon>
);

export const CancelIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z" /></SvgIcon>
);

export const EmailIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" /></SvgIcon>
);

export const PhoneIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V21c0 .55-.45 1-1 1C10.07 22 2 13.93 2 4c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.24.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" /></SvgIcon>
);

export const ScheduleIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm.5 5H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" /></SvgIcon>
);

export const PersonIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></SvgIcon>
);

export const SecurityIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" /></SvgIcon>
);

export const AdminPanelSettingsIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M17 11c.34 0 .67.04 1 .09V6.27L10.5 3 3 6.27v4.91c0 4.54 3.2 8.79 7.5 9.82.55-.13 1.08-.32 1.6-.55-.69-.98-1.1-2.17-1.1-3.45 0-3.31 2.69-6 6-6z" /><path d="M17 13c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 1.38c.62 0 1.12.51 1.12 1.12s-.51 1.12-1.12 1.12-1.12-.51-1.12-1.12.5-1.12 1.12-1.12zm0 5.37c-.93 0-1.74-.46-2.24-1.17.05-.72 1.51-1.08 2.24-1.08s2.19.36 2.24 1.08c-.5.71-1.31 1.17-2.24 1.17z" /></SvgIcon>
);

export const PersonAddIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></SvgIcon>
);

export const AssignmentTurnedInIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 3c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm-2 14l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" /></SvgIcon>
);

// Simple alias for generic Assignment icon
export const AssignmentIcon: React.FC<SvgIconProps> = (props) => (
  <AssignmentTurnedInIcon {...props} />
);

// Additional Report & Financial Icons
export const SaveIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z" />
  </SvgIcon>
);

export const PlayArrowIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M8 5v14l11-7z" />
  </SvgIcon>
);

export const PauseIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
  </SvgIcon>
);

export const StopIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M6 6h12v12H6z" />
  </SvgIcon>
);

export const RefreshIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
  </SvgIcon>
);

export const TableChartIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M10 10.02h5V21h-5zM17 21h3c1.1 0 2-.9 2-2v-9h-5v11zm3-18H5c-1.1 0-2 .9-2 2v3h19V5c0-1.1-.9-2-2-2zM3 19c0 1.1.9 2 2 2h3V10.02H3V19z" />
  </SvgIcon>
);

export const TableViewIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M19 7H9c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zm0 2v2H9V9h10zm-6 6v-2h2v2h-2zm2 2v2h-2v-2h2zm-4-2H9v-2h2v2zm6-2h2v2h-2v-2zm-8 4h2v2H9v-2zm8 2v-2h2v2h-2zM6 17H5c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2v1h-2V5H5v10h1v2z" />
  </SvgIcon>
);

export const PrintIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z" />
  </SvgIcon>
);

export const PictureAsPdfIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z" />
  </SvgIcon>
);

export const UnfoldMoreIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M12 5.83L15.17 9l1.41-1.41L12 3 7.41 7.59 8.83 9 12 5.83zm0 12.34L8.83 15l-1.41 1.41L12 21l4.59-4.59L15.17 15 12 18.17z" />
  </SvgIcon>
);

export const UnfoldLessIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M7.41 18.59L8.83 20 12 16.83 15.17 20l1.41-1.41L12 14l-4.59 4.59zm9.18-13.18L15.17 4 12 7.17 8.83 4 7.41 5.41 12 10l4.59-4.59z" />
  </SvgIcon>
);

export const TrendingUpIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z" />
  </SvgIcon>
);

export const TrendingDownIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M16 18l2.29-2.29-4.88-4.88-4 4L2 7.41 3.41 6l6 6 4-4 6.3 6.29L22 12v6z" />
  </SvgIcon>
);

export const BoltIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.05-.08.07-.12C8.48 10.94 10.42 7.54 13 3h1l-1 7h3.5c.49 0 .56.33.47.51l-.07.15C12.96 17.55 11 21 11 21z" />
  </SvgIcon>
);

export const IosShareIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M16 5l-1.42 1.42-1.59-1.59V16h-1.98V4.83L9.42 6.42 8 5l4-4 4 4zm4 5v11c0 1.1-.9 2-2 2H6c-1.11 0-2-.9-2-2V10c0-1.11.89-2 2-2h3v2H6v11h12V10h-3V8h3c1.1 0 2 .89 2 2z" />
  </SvgIcon>
);

export const UploadIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z" />
  </SvgIcon>
);

export const CalendarTodayIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z" />
  </SvgIcon>
);

export const DateRangeIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z" />
  </SvgIcon>
);

export const LockIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
  </SvgIcon>
);

export const LockOpenIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h1.9c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10z" />
  </SvgIcon>
);

export const BusinessIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z" />
  </SvgIcon>
);

export const DownloadIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
  </SvgIcon>
);

// Legacy alias for MUI GetApp icon (used for exports)
export const GetAppIcon: React.FC<SvgIconProps> = (props) => (
  <DownloadIcon {...props} />
);

// Additional file-related icons used by advanced report exports
export const FileDownloadIcon: React.FC<SvgIconProps> = (props) => (
  // Reuse the download arrow but with a simple document outline
  <SvgIcon {...props}>
    <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6z" />
    <path d="M13 12V8h-2v4H9l3 3 3-3h-2z" />
  </SvgIcon>
);

export const FileCopyIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1z" />
    <path d="M20 5H8c-1.1 0-2 .9-2 2v14h14c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h12v14z" />
  </SvgIcon>
);

export const ContentCopyIcon: React.FC<SvgIconProps> = (props) => (
  // Visually similar to FileCopy but thinner outline
  <SvgIcon {...props}>
    <path d="M16 1H6c-1.1 0-2 .9-2 2v2h2V3h10V1z" />
    <path d="M18 5H8c-1.1 0-2 .9-2 2v12h12c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 14H8V7h10v12z" />
  </SvgIcon>
);

export const CloudUploadIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" />
  </SvgIcon>
);

// Simple paperclip-style attachment icon
export const AttachFileIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M16.5 6.5L10 13c-1.38 1.38-3.62 1.38-5 0-1.37-1.37-1.37-3.61 0-4.98L10.5 2.5c.97-.97 2.56-.97 3.53 0 .97.97.97 2.56 0 3.53L9 11.06c-.56.56-1.47.56-2.03 0-.56-.56-.56-1.47 0-2.03L12 3.99" />
  </SvgIcon>
);

export const CloseIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
  </SvgIcon>
);

export const InfoOutlinedIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
  </SvgIcon>
);

export const CheckCircleIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
  </SvgIcon>
);

export const ErrorIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
  </SvgIcon>
);

export const WarningIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
  </SvgIcon>
);

export const InfoIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
  </SvgIcon>
);

export const RestartAltIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
  </SvgIcon>
);

export const DoneAllIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z" />
  </SvgIcon>
);

// Vertical three-dot overflow menu icon (MUI MoreVert)
export const MoreVertIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
  </SvgIcon>
);

export const TuneIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z" />
  </SvgIcon>
);

export const FlagIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M14.4 14H21V3h-6.4L13.3 0h-2.3v3H4v10h10.4l.6 1zm-6.4-2H6V5h2v7z" />
  </SvgIcon>
);

export const MessageIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
  </SvgIcon>
);

export const ShieldIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
  </SvgIcon>
);

export const PersonAddAltIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
  </SvgIcon>
);

export const AnalyticsIcon: React.FC<SvgIconProps> = (props) => (
  <AssessmentIcon {...props} />
);

export const TimelineIcon: React.FC<SvgIconProps> = (props) => (
  <TrendingUpIcon {...props} />
);

export const StarIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2l-2.81 6.63L2 9.24l5.46 4.73L5.82 21z" />
  </SvgIcon>
);

export const PersonOffIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4zm7.76-9.64l-1.41-1.41L13 10.34 4.41 1.76 3 3.17 10.59 10.76 3 18.34l1.41 1.41L13 12.17l8.59 8.58 1.41-1.41L14.41 10.76z" />
  </SvgIcon>
);

export const AdminIcon: React.FC<SvgIconProps> = (props) => (
  <AdminPanelSettingsIcon {...props} />
);

export const WorkIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M20 6h-2.18c.11-.89.3-1.74.84-2.55.33-.52.35-1.21.05-1.66-.3-.45-.84-.72-1.39-.72-.55 0-1.09.27-1.39.72-.54.81-.73 1.66-.84 2.55H9.18c-.11-.89-.3-1.74-.84-2.55-.3-.45-.84-.72-1.39-.72-.55 0-1.09.27-1.39.72-.3.45-.28 1.14.05 1.66.54.81.73 1.66.84 2.55H4c-1.1 0-1.99.9-1.99 2L2 19c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 13H4V8h16v11z" />
  </SvgIcon>
);

export const CompareIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V5h2v12zm4 0h-2v-4h2v4z" />
  </SvgIcon>
);

export const MoreHorizIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
  </SvgIcon>
);

export const VisibilityOutlinedIcon: React.FC<SvgIconProps> = (props) => (
  <VisibilityIcon {...props} />
);

export const EditOutlinedIcon: React.FC<SvgIconProps> = (props) => (
  <EditIcon {...props} />
);

export const ArrowUpwardIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M7 14l5-5 5 5z" />
  </SvgIcon>
);

export const ArrowDownwardIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M7 10l5 5 5-5z" />
  </SvgIcon>
);

export const CheckIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
  </SvgIcon>
);

export const DatasetIcon: React.FC<SvgIconProps> = (props) => (
  <TableChartIcon {...props} />
);

export const MoreIcon: React.FC<SvgIconProps> = (props) => (
  <MoreVertIcon {...props} />
);

export const ExpandIcon: React.FC<SvgIconProps> = (props) => (
  <ExpandMoreIcon {...props} />
);

export const CollapseIcon: React.FC<SvgIconProps> = (props) => (
  <ExpandLessIcon {...props} />
);

export const NumbersIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M5 9h2V7H5v2zm4 0h2V7H9v2zm4 0h2V7h-2v2zM5 13h2v-2H5v2zm4 0h2v-2H9v2zm4 0h2v-2h-2v2zM3 3v18h18V3H3zm16 16H5V5h14v14z" />
  </SvgIcon>
);

export const EventIcon: React.FC<SvgIconProps> = (props) => (
  <CalendarTodayIcon {...props} />
);

// Additional common icons
export const CheckBoxIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5.04-6.71l-2.75-3.54-1.3 1.04 4.05 5.21 6.3-6.33-1.3-1.04-4.7 4.66z" />
  </SvgIcon>
);

export const CheckBoxOutlineBlankIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
  </SvgIcon>
);

export const RadioButtonCheckedIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0-2c3.87 0 7 3.13 7 7s-3.13 7-7 7-7-3.13-7-7 3.13-7 7-7zm0-2C6.48 3 2 7.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 3 12 3z" />
  </SvgIcon>
);

export const RadioButtonUncheckedIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" />
  </SvgIcon>
);

export const TextFieldsIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M2.5 4v3h5v12h3V7h5V4h-13zm19 5h-9v3h9V9zM3 14h9v-2H3v2z" />
  </SvgIcon>
);

export const AttachMoneyIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M11.8 10.9c.39-.39.39-1.02 0-1.41-.39-.39-1.02-.39-1.41 0l-3.72 3.72c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0L11.8 10.9zM19.5 13c.83 0 1.5-.67 1.5-1.5V4c0-.83-.67-1.5-1.5-1.5H4c-.83 0-1.5.67-1.5 1.5v3H.5c-.28 0-.5.22-.5.5s.22.5.5.5h2v2H.5c-.28 0-.5.22-.5.5s.22.5.5.5h2v2H.5c-.28 0-.5.22-.5.5s.22.5.5.5h2v3c0 .83.67 1.5 1.5 1.5h15c.83 0 1.5-.67 1.5-1.5v-3h2c.28 0 .5-.22.5-.5s-.22-.5-.5-.5h-2v-2h2c.28 0 .5-.22.5-.5s-.22-.5-.5-.5h-2V4h2c.28 0 .5-.22.5-.5s-.22-.5-.5-.5h-2V2.5c0-.28-.22-.5-.5-.5z" />
  </SvgIcon>
);

export const ImportExportIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M9 3L5 6.99h3V14h2V9.99h3L9 3zm7 14.01V10h-2v4.01h-3L15 21l4-4.99h-3z" />
  </SvgIcon>
);

// WiFi icons for connection status
export const Wifi: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.03 2.93 1 9zm8 8l3 3 3-3c-1.65-1.65-4.35-1.65-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z" /></SvgIcon>
);

export const WifiOff: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M23.64 7c-.45-.34-4.93-4-11.64-4C6.48 3 2.52 6.82 2.35 7l-.35.36L.71 8.16l.35.35C1.23 9.09 5.48 12.83 12 12.83c1.25 0 2.42-.19 3.51-.53l-1.44-1.44c-.67.2-1.36.31-2.07.31-4.97 0-9.14-3.03-11-4.88l1.42-1.42L1 23l1.41 1.41L23 4l-1.36-1.36zM12 10c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm0-8c2.92 0 5.86.92 8.39 2.71l1.42-1.42C18.86.86 15.43-.17 12-.17c-2.43 0-4.86 1.03-7.39 2.71l1.42 1.42C6.14 2.92 9.08 2 12 2z" /></SvgIcon>
);

export const SignalCellularConnectedNoInternet4Bar: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}><path d="M22 18V2h-2v16h2zm-4 0V6h-2v12h2zm-4 0v-4h-2v4h2zm-4 0V2H8v16h2z" /></SvgIcon>
);

export const DeselectOutlinedIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7zm-4 6h2v-2H3v2zm0 4h2v-2H3v2zM3 5v2h2V3h-2zm4 0h2V3H7v2zm4 0h2V3h-2v2zm4 0h2V3h-2v2z" />
  </SvgIcon>
);

export const BugReportIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M20 8h-2.81c-.45-.78-1.07-1.45-1.82-1.96L17 4.41 15.59 3l-2.17 2.17C12.96 5.06 12.49 5 12 5c-.49 0-.96.06-1.41.17L8.41 3 7 4.41l1.62 1.63C7.88 6.55 7.26 7.22 6.81 8H4v2h2.09c-.05.33-.09.66-.09 1v1H4v2h2v1c0 .34.04.67.09 1H4v2h2.81c1.04 1.79 2.97 3 5.19 3s4.15-1.21 5.19-3H20v-2h-2.09c.05-.33.09-.66.09-1v-1h2v-2h-2v-1c0-.34-.04-.67-.09-1H20V8zm-6 8h-4v-2h4v2zm0-4h-4v-2h4v2z" />
  </SvgIcon>
);

// Export all icons with their MUI names for compatibility
export {
  MenuIcon as Menu,
  NotificationsIcon as Notifications,
  AccountCircleIcon as AccountCircle,
  SettingsIcon as Settings,
  HomeIcon as Home,
  LogoutIcon as Logout,
  VisibilityIcon as Visibility,
  VisibilityOffIcon as VisibilityOff,
  ArrowBackIcon as ArrowBack,
  ArrowForwardIcon as ArrowForward,
  SendIcon as Send,
  ExpandMoreIcon as ExpandMore,
  ExpandLessIcon as ExpandLess,
  LanguageIcon as Language,
  DashboardIcon as Dashboard,
  AccountTreeIcon as AccountTree,
  ReceiptIcon as Receipt,
  PeopleIcon as People,
  DescriptionIcon as Description,
  AssessmentIcon as Assessment,
  ListIcon as List,
  InventoryIcon as Inventory,
  AddIcon as Add,
  EditIcon as Edit,
  DeleteIcon as Delete,
  DeleteOutlineIcon as DeleteOutline,
  ChevronRightIcon as ChevronRight,
  CategoryIcon as Category,
  LocalShippingIcon as LocalShipping,
  AutoAwesomeIcon as AutoAwesome,
  AccountBalanceIcon as AccountBalance,
  ZoomInIcon as ZoomIn,
  ZoomOutIcon as ZoomOut,
  NavigateBeforeIcon as NavigateBefore,
  NavigateNextIcon as NavigateNext,
  FilterAltIcon as FilterAlt,
  FilterListIcon as FilterList,
  SortIcon as Sort,
  SearchIcon as Search,
  GroupIcon as Group,
  KeyIcon as Key,
  SaveIcon as Save,
  PlayArrowIcon as PlayArrow,
  PauseIcon as Pause,
  StopIcon as Stop,
  RefreshIcon as Refresh,
  TableChartIcon as TableChart,
  TableViewIcon as TableView,
  PrintIcon as Print,
  PictureAsPdfIcon as PictureAsPdf,
  UnfoldMoreIcon as UnfoldMore,
  UnfoldLessIcon as UnfoldLess,
  TrendingUpIcon as TrendingUp,
  TrendingDownIcon as TrendingDown,
  BoltIcon as Bolt,
  IosShareIcon as IosShare,
  UploadIcon as Upload,
  CalendarTodayIcon as CalendarToday,
  DateRangeIcon as DateRange,
  LockIcon as Lock,
  LockOpenIcon as LockOpen,
  BusinessIcon as Business,
  DownloadIcon as Download,
  GetAppIcon as GetApp,
  FileDownloadIcon as FileDownload,
  FileCopyIcon as FileCopy,
  ContentCopyIcon as ContentCopy,
  CloudUploadIcon as CloudUpload,
  AttachFileIcon as AttachFile,
  CloseIcon as Close,
  InfoOutlinedIcon as InfoOutlined,
  CheckCircleIcon as CheckCircle,
  ErrorIcon as Error,
  WarningIcon as Warning,
  InfoIcon as Info,
  RestartAltIcon as RestartAlt,
  DoneAllIcon as DoneAll,
  MoreVertIcon as MoreVert,
  SecurityIcon as Security,
  AdminPanelSettingsIcon as AdminPanelSettings,
  PersonAddIcon as PersonAdd,
  AssignmentTurnedInIcon as AssignmentTurnedIn,
  AssignmentIcon as Assignment,
  TuneIcon as Tune,
  SpeedIcon as Speed,
  MemoryIcon as Memory,
  NetworkCheckIcon as NetworkCheck,
  TimerIcon as Timer,
  LightbulbIcon as Lightbulb,
  CodeIcon as Code,
  SelectAllIcon as SelectAll,
  ClearIcon as Clear,
  CancelIcon as Cancel,
  EmailIcon as Email,
  PhoneIcon as Phone,
  ScheduleIcon as Schedule,
  PersonIcon as Person,
  FlagIcon as Flag,
  MessageIcon as Message,
  ShieldIcon as Shield,
  PersonAddAltIcon as PersonAddAlt,
  AnalyticsIcon as Analytics,
  TimelineIcon as Timeline,
  StarIcon as Star,
  PersonOffIcon as PersonOff,
  AdminIcon as Admin,
  WorkIcon as Work,
  CompareIcon as Compare,
  MoreHorizIcon as MoreHoriz,
  VisibilityOutlinedIcon as VisibilityOutlined,
  EditOutlinedIcon as EditOutlined,
  ArrowUpwardIcon as ArrowUpward,
  ArrowDownwardIcon as ArrowDownward,
  CheckIcon as Check,
  DatasetIcon as Dataset,
  MoreIcon as More,
  ExpandIcon as Expand,
  CollapseIcon as Collapse,
  NumbersIcon as Numbers,
  EventIcon as Event,
  CheckBoxIcon as CheckBox,
  CheckBoxOutlineBlankIcon as CheckBoxOutlineBlank,
  RadioButtonCheckedIcon as RadioButtonChecked,
  RadioButtonUncheckedIcon as RadioButtonUnchecked,
  TextFieldsIcon as TextFields,
  AttachMoneyIcon as AttachMoney,
  ImportExportIcon as ImportExport,
  DeselectOutlinedIcon as DeselectOutlined,
  BugReportIcon as BugReport
};

// Default export for compatibility with default imports
const icons = {
  Menu: MenuIcon,
  Notifications: NotificationsIcon,
  AccountCircle: AccountCircleIcon,
  Settings: SettingsIcon,
  Home: HomeIcon,
  Logout: LogoutIcon,
  Visibility: VisibilityIcon,
  VisibilityOff: VisibilityOffIcon,
  ArrowBack: ArrowBackIcon,
  ArrowForward: ArrowForwardIcon,
  ExpandMore: ExpandMoreIcon,
  ExpandLess: ExpandLessIcon,
  Language: LanguageIcon,
  Dashboard: DashboardIcon,
  AccountTree: AccountTreeIcon,
  Receipt: ReceiptIcon,
  People: PeopleIcon,
  Description: DescriptionIcon,
  Assessment: AssessmentIcon,
  List: ListIcon,
  Inventory: InventoryIcon,
  Add: AddIcon,
  Edit: EditIcon,
  Delete: DeleteIcon,
  DeleteOutline: DeleteOutlineIcon,
  ChevronRight: ChevronRightIcon,
  Category: CategoryIcon,
  LocalShipping: LocalShippingIcon,
  AutoAwesome: AutoAwesomeIcon,
  AccountBalance: AccountBalanceIcon,
  ZoomIn: ZoomInIcon,
  ZoomOut: ZoomOutIcon,
  NavigateBefore: NavigateBeforeIcon,
  NavigateNext: NavigateNextIcon,
  FilterAlt: FilterAltIcon,
  FilterList: FilterListIcon,
  Sort: SortIcon,
  Search: SearchIcon,
  Group: GroupIcon,
  GroupWork: GroupWorkIcon,
  Key: KeyIcon,
  Save: SaveIcon,
  PlayArrow: PlayArrowIcon,
  Pause: PauseIcon,
  Stop: StopIcon,
  Refresh: RefreshIcon,
  TableChart: TableChartIcon,
  TableView: TableViewIcon,
  Print: PrintIcon,
  PictureAsPdf: PictureAsPdfIcon,
  UnfoldMore: UnfoldMoreIcon,
  UnfoldLess: UnfoldLessIcon,
  TrendingUp: TrendingUpIcon,
  TrendingDown: TrendingDownIcon,
  Bolt: BoltIcon,
  IosShare: IosShareIcon,
  Upload: UploadIcon,
  CalendarToday: CalendarTodayIcon,
  Lock: LockIcon,
  LockOpen: LockOpenIcon,
  Business: BusinessIcon,
  Download: DownloadIcon,
  GetApp: GetAppIcon,
  FileDownload: FileDownloadIcon,
  FileCopy: FileCopyIcon,
  ContentCopy: ContentCopyIcon,
  CloudUpload: CloudUploadIcon,
  AttachFile: AttachFileIcon,
  Close: CloseIcon,
  InfoOutlined: InfoOutlinedIcon,
  CheckCircle: CheckCircleIcon,
  Error: ErrorIcon,
  Warning: WarningIcon,
  Info: InfoIcon,
  RestartAlt: RestartAltIcon,
  DoneAll: DoneAllIcon,
  MoreVert: MoreVertIcon,
  Security: SecurityIcon,
  AdminPanelSettings: AdminPanelSettingsIcon,
  PersonAdd: PersonAddIcon,
  AssignmentTurnedIn: AssignmentTurnedInIcon,
  Assignment: AssignmentIcon,
  Tune: TuneIcon,
  Speed: SpeedIcon,
  Memory: MemoryIcon,
  NetworkCheck: NetworkCheckIcon,
  Timer: TimerIcon,
  Lightbulb: LightbulbIcon,
  Code: CodeIcon,
  SelectAll: SelectAllIcon,
  Clear: ClearIcon,
  Cancel: CancelIcon,
  Email: EmailIcon,
  Phone: PhoneIcon,
  Schedule: ScheduleIcon,
  Person: PersonIcon,
  Flag: FlagIcon,
  Message: MessageIcon,
  Shield: ShieldIcon,
  PersonAddAlt: PersonAddAltIcon,
  Analytics: AnalyticsIcon,
  Timeline: TimelineIcon,
  Star: StarIcon,
  PersonOff: PersonOffIcon,
  Admin: AdminIcon,
  Work: WorkIcon,
  Compare: CompareIcon,
  MoreHoriz: MoreHorizIcon,
  VisibilityOutlined: VisibilityOutlinedIcon,
  EditOutlined: EditOutlinedIcon,
  ArrowUpward: ArrowUpwardIcon,
  ArrowDownward: ArrowDownwardIcon,
  Check: CheckIcon,
  Dataset: DatasetIcon,
  More: MoreIcon,
  Expand: ExpandIcon,
  Collapse: CollapseIcon,
  Numbers: NumbersIcon,
  Event: EventIcon,
  CheckBox: CheckBoxIcon,
  CheckBoxOutlineBlank: CheckBoxOutlineBlankIcon,
  RadioButtonChecked: RadioButtonCheckedIcon,
  RadioButtonUnchecked: RadioButtonUncheckedIcon,
  TextFields: TextFieldsIcon,
  AttachMoney: AttachMoneyIcon,
  ImportExport: ImportExportIcon,
  DeselectOutlined: DeselectOutlinedIcon,
  BugReport: BugReportIcon
};

export default icons;
