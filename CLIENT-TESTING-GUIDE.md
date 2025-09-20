# 🧪 Accounting System - Client Testing Guide

Welcome to the **Accounting System Testing Environment**! This is a safe, isolated environment where you can explore all features without affecting any real data.

---

## 🔐 Test User Accounts

You can log in with any of these accounts to test different permission levels:

### **👑 System Administrator**
- **Email:** `admin@test.com`
- **Password:** `TestAdmin123!`
- **Access:** Full system management, user management, all reports

### **👔 Department Manager** 
- **Email:** `manager@test.com`
- **Password:** `TestManager123!`
- **Access:** Department operations, approve transactions, manage users

### **💰 Accountant**
- **Email:** `accountant@test.com`
- **Password:** `TestAccount123!`
- **Access:** Financial transactions, reports, chart of accounts

### **📝 Data Entry Clerk**
- **Email:** `clerk@test.com`
- **Password:** `TestClerk123!`
- **Access:** Basic data entry, view reports

### **👁️ Viewer/Auditor**
- **Email:** `viewer@test.com`
- **Password:** `TestViewer123!`
- **Access:** Read-only access to all reports and data

---

## 🎯 What You Can Test

### **✅ User Management**
- Create, edit, and delete users (Admin/Manager)
- Assign different roles to users
- Test permission-based access control

### **📊 Chart of Accounts**
- View the complete chart of accounts
- Add new accounts (Accountant+)
- Edit account information
- Test account hierarchy

### **💳 Financial Transactions**
- Create journal entries
- Multi-line transactions with debits/credits
- Assign cost centers and projects
- Approve/reject transactions (Manager+)

### **📋 Cost Centers & Projects**
- Manage organizational cost centers
- Create and track projects
- Assign transactions to specific centers/projects

### **📈 Reports & Analytics**
- Trial Balance
- General Ledger
- Balance Sheet
- Profit & Loss Statement
- Custom filtered reports

### **🔒 Permission System**
- Test role-based access control
- See how different users have different capabilities
- Permission inheritance and restrictions

---

## 🚀 Testing Scenarios

### **Scenario 1: Complete Accounting Workflow**
1. **Login as Accountant** (`accountant@test.com`)
2. Create a new journal entry with multiple lines
3. Assign to different cost centers
4. **Switch to Manager** (`manager@test.com`)
5. Review and approve the transaction
6. **Switch to Viewer** (`viewer@test.com`)  
7. Generate reports to see the posted transaction

### **Scenario 2: User Management**
1. **Login as Admin** (`admin@test.com`)
2. Create a new user account
3. Assign roles and permissions
4. Test the new user's access
5. Modify permissions and see changes

### **Scenario 3: Reporting & Analysis**
1. **Login as any user** with report access
2. Generate different types of reports
3. Apply filters by date, account, cost center
4. Export reports to Excel/PDF
5. Test different report formats

---

## 🎨 Sample Data Available

The testing environment includes realistic sample data:

- **Chart of Accounts:** Complete Arabic/English chart with Assets, Liabilities, Equity, Revenue, Expenses
- **Cost Centers:** General Management, Sales, Production, Accounting, HR
- **Projects:** Development, Expansion, R&D projects
- **User Roles:** Complete permission system with 7 different access levels

---

## ⚡ Quick Start Tips

1. **Start with Admin account** to get familiar with full system capabilities
2. **Try different user roles** to understand permission differences
3. **Create test transactions** to see the complete workflow
4. **Generate reports** to see how data flows through the system
5. **Test the approval process** by switching between user roles

---

## 🛡️ Safety Features

- **✅ Completely Isolated:** No connection to production data
- **✅ Reset Available:** Database can be refreshed anytime
- **✅ No Real Impact:** All actions are safe and reversible
- **✅ Full Featured:** Complete system functionality available

---

## 🆘 Support

If you encounter any issues or have questions:

1. **Try a different user account** - some features may be role-restricted
2. **Check your permissions** - each role has different access levels
3. **Refresh the page** - if something seems stuck
4. **Contact support** - we're here to help with any questions

---

## 🎉 Enjoy Testing!

This testing environment gives you full access to explore the **Accounting System** safely. Feel free to:

- Create test data
- Try all features
- Test different workflows  
- Explore the permission system
- Generate various reports

**Everything is safe to test - have fun exploring!**

---

*Testing Environment URL: [To be provided after deployment]*

*Last Updated: $(Get-Date -Format "yyyy-MM-dd")*