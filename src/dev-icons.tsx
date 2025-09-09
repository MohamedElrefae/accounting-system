// Mock MUI icons for development to avoid EMFILE errors
// This file provides placeholder icons when MUI icons are disabled

import React from 'react';

// Generic placeholder icon component
const PlaceholderIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
      style={{ 
        display: 'inline-block', 
        fontSize: 'inherit',
        ...props.style 
      }}
    >
      <circle cx="12" cy="12" r="8" fillOpacity="0.3" />
      <text 
        x="12" 
        y="16" 
        textAnchor="middle" 
        fontSize="8" 
        fill="currentColor"
      >
        ?
      </text>
    </svg>
  );
};

// Export commonly used icons as placeholders
export const Visibility = PlaceholderIcon;
export const VisibilityOff = PlaceholderIcon;
export const GitHub = PlaceholderIcon;
export const Google = PlaceholderIcon;
export const Menu = PlaceholderIcon; // Add Menu for direct imports
export const MenuIcon = PlaceholderIcon; // Keep MenuIcon for compatibility
export const Close = PlaceholderIcon;
export const Dashboard = PlaceholderIcon;
export const DashboardIcon = PlaceholderIcon;
export const AccountCircle = PlaceholderIcon;
export const Settings = PlaceholderIcon;
export const ExitToApp = PlaceholderIcon;
export const Add = PlaceholderIcon;
export const Edit = PlaceholderIcon;
export const Delete = PlaceholderIcon;
export const Save = PlaceholderIcon;
export const Cancel = PlaceholderIcon;
export const Search = PlaceholderIcon;
export const FilterList = PlaceholderIcon;
export const MoreVert = PlaceholderIcon;
export const ArrowBack = PlaceholderIcon;
export const ArrowForward = PlaceholderIcon;
export const ExpandMore = PlaceholderIcon;
export const ExpandLess = PlaceholderIcon;
export const Notifications = PlaceholderIcon;
export const NotificationsIcon = PlaceholderIcon;
export const Brightness4 = PlaceholderIcon;
export const Brightness7 = PlaceholderIcon;
export const Language = PlaceholderIcon;
export const LanguageIcon = PlaceholderIcon;
export const Palette = PlaceholderIcon;
export const PaletteIcon = PlaceholderIcon;
export const LogoutIcon = PlaceholderIcon;

// Default export for individual icon imports  
export default PlaceholderIcon;

// Additional exports for compatibility
export const Login = PlaceholderIcon;
export const Person = PlaceholderIcon;
export const Lock = PlaceholderIcon;
export const Email = PlaceholderIcon;
export const Phone = PlaceholderIcon;
export const Home = PlaceholderIcon;
export const Business = PlaceholderIcon;
export const AccountBalance = PlaceholderIcon;
export const Assessment = PlaceholderIcon;
export const Assignment = PlaceholderIcon;
export const TrendingUp = PlaceholderIcon;
export const TrendingDown = PlaceholderIcon;
export const AttachMoney = PlaceholderIcon;
export const CreditCard = PlaceholderIcon;
export const Receipt = PlaceholderIcon;
export const Description = PlaceholderIcon;
export const InsertDriveFile = PlaceholderIcon;
export const Folder = PlaceholderIcon;
export const FolderOpen = PlaceholderIcon;

// Sidebar specific icons
export const AccountTree = PlaceholderIcon;
export const Inventory = PlaceholderIcon;
export const List = PlaceholderIcon;
export const ListIcon = PlaceholderIcon;
export const Book = PlaceholderIcon;
export const Balance = PlaceholderIcon;
export const ShoppingCart = PlaceholderIcon;
export const RequestQuote = PlaceholderIcon;
export const PersonOutline = PlaceholderIcon;
export const MonetizationOn = PlaceholderIcon;
export const BarChart = PlaceholderIcon;
export const Category = PlaceholderIcon;
export const SwapHoriz = PlaceholderIcon;
export const Summarize = PlaceholderIcon;
export const Group = PlaceholderIcon;
export const Tune = PlaceholderIcon;
export const Backup = PlaceholderIcon;
export const Security = PlaceholderIcon;
export const Storage = PlaceholderIcon;
export const Database = PlaceholderIcon;
export const LocalOffer = PlaceholderIcon;
export const Tag = PlaceholderIcon;
export const FormatSize = PlaceholderIcon;
export const LocalShipping = PlaceholderIcon;
export const People = PlaceholderIcon;

// Dashboard and StatCard icons
export const ReceiptLong = PlaceholderIcon;
export const MenuBook = PlaceholderIcon;

// Additional commonly needed icons
export const Print = PlaceholderIcon;
export const Download = PlaceholderIcon;
export const Upload = PlaceholderIcon;
export const Refresh = PlaceholderIcon;
export const Check = PlaceholderIcon;
export const Clear = PlaceholderIcon;
export const Warning = PlaceholderIcon;
export const Error = PlaceholderIcon;
export const Info = PlaceholderIcon;
export const Success = PlaceholderIcon;
