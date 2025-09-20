# 🧪 Testing Environment - Manual Setup Instructions

Since you have Node.js v22.17.0 and npm installed, please follow these **exact steps** manually:

## 🎯 **Step-by-Step Instructions**

### **1. Open a NEW Terminal Window**
- **Press `Win + R`**
- **Type:** `cmd` or `powershell`
- **Press Enter**

### **2. Navigate to Your Project Directory**
```bash
cd "C:\Users\melre\OneDrive\AI\04ACAPPV4\accounting-system"
```

### **3. Verify npm is Working**
```bash
npm --version
node --version
```
You should see your npm version and Node.js v22.17.0

### **4. Install Dependencies (if needed)**
```bash
npm install
```

### **5. Build Testing Version**
```bash
npm run build:test
```

### **6. Start Testing Environment Server**
```bash
npm run preview:test
```

## 🌐 **Expected Result**

After running the last command, you should see:
```
Local:   http://localhost:4174/
Network: http://192.168.x.x:4174/
```

**Your testing environment will be available at:** http://localhost:4174

---

## 🔐 **Login Credentials Ready**

### **👑 Your Superadmin Account**
- **Email:** `mohamedelrefae81@gmail.com`  
- **Password:** (Your actual Supabase Auth password)
- **Access:** Complete system control

### **🧪 Test User Accounts**
- **Admin:** `admin@test.com` / `TestAdmin123!`
- **Manager:** `manager@test.com` / `TestManager123!`
- **Accountant:** `accountant@test.com` / `TestAccount123!`
- **Clerk:** `clerk@test.com` / `TestClerk123!`
- **Viewer:** `viewer@test.com` / `TestViewer123!`

---

## 🎨 **Visual Indicators**

The testing environment will show:
- **"Accounting System (TEST)"** in the title
- **Testing banner/indicators** to distinguish from production
- **Your testing Supabase database** (completely isolated)

---

## ✅ **What to Test**

1. **Login with your superadmin account** (mohamedelrefae81@gmail.com)
2. **Test user management** - create, edit, assign roles
3. **Try different user accounts** - see permission differences
4. **Create sample transactions**
5. **Generate reports**
6. **Test the complete workflow**

---

## 🚨 **Troubleshooting**

### **If npm command not found:**
1. **Restart your terminal** completely
2. **Check if Node.js is in PATH:**
   ```bash
   echo $env:PATH
   ```
3. **If still not working, try full path:**
   ```bash
   "C:\Program Files\nodejs\npm.cmd" --version
   ```

### **If build fails:**
1. **Check your `.env.testing` file** is properly configured
2. **Try cleaning and rebuilding:**
   ```bash
   npm run build
   npm run build:test
   ```

### **If server won't start:**
1. **Try a different port:**
   ```bash
   npm run preview -- --port 4175
   ```
2. **Check if port 4174 is already in use**

---

## 🎯 **Alternative: Development Mode**

If preview doesn't work, try development mode:
```bash
npm run dev:test
```
This will start on http://localhost:5173

---

**Once you get the server running, let me know and I can guide you through testing the application!**