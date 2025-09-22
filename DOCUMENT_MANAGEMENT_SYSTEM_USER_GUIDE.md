# Document Management System - Complete User Guide

## Table of Contents
1. [Overview and Quick Start](#overview-and-quick-start)
2. [Understanding Permissions and Prerequisites](#understanding-permissions-and-prerequisites)
3. [Creating and Managing Document Templates (Simplified)](#creating-and-managing-document-templates-simplified)
4. [Using the Document Management Page](#using-the-document-management-page)
5. [Attaching Documents to Transactions](#attaching-documents-to-transactions)
6. [Troubleshooting Common Issues](#troubleshooting-common-issues)
7. [Step-by-Step Workflows](#step-by-step-workflows)
8. [Database Schema Information (SQL Queries)](#database-schema-information-sql-queries)
9. [Best Practices and Tips](#best-practices-and-tips)

---

## Overview and Quick Start

Your accounting system has a comprehensive document management system with two main components:
- **Document Templates**: Create reusable templates for generating documents like invoices, contracts, etc.
- **Document Management**: Store, organize, and link documents to transactions

### What's Working vs. What's "Not Yet Implemented"

**✅ Currently Working:**
- Template creation and editing (with permissions)
- Document upload and storage
- Linking documents to transactions
- Document permissions and organization management
- PDF generation from templates
- Document versioning
- Full-text search

**⚠️ "Not Yet Implemented" (with Workarounds):**
- New document creation from Document Management page
- Document upload from Document Management page  
- Export functionality from Document Management page
- Some bulk operations

---

## Understanding Permissions and Prerequisites

### Required Permissions

Before using the document management system, ensure you have the correct permissions:

**For Document Templates:**
- `templates.manage` - Create, edit, and delete templates
- `templates.generate` - Generate documents from templates

**For Document Management:**
- `documents.create` - Upload and create documents
- `documents.read` - View and search documents
- `documents.write` - Edit document metadata
- `documents.delete` - Delete documents

### Organization and Project Setup

1. **Organization Selection**: Always ensure you have an active organization selected
2. **Project Association**: Documents can be linked to specific projects within your organization
3. **Storage**: Documents are stored in Supabase storage with organized folder structure

---

## Creating and Managing Document Templates (Simplified)

### Step 1: Access Template Library

1. Navigate to **Main Data → Document Templates**
2. Select your organization from the dropdown
3. You'll see the Document Templates library

### Step 2: Create a New Template (Simple Method)

Instead of working with raw JSON, follow this simplified approach:

1. **Click "Create" button** (requires `templates.manage` permission)
2. **Enter Template Name**: Use descriptive names like "Invoice Template" or "Contract Template"
3. **Click Create** - This creates a basic template

### Step 3: Edit Your Template (User-Friendly Approach)

When you click "Edit" on a template, you'll see the Template Editor. Instead of editing JSON directly:

#### Basic Template Structure
```json
{
  "title": "Invoice Template",
  "variables": {
    "company_name": "{{company.name}}",
    "invoice_number": "{{invoice.number}}",
    "date": "{{invoice.date}}",
    "amount": "{{invoice.amount}}"
  },
  "content": {
    "header": "INVOICE",
    "body": "Invoice #{{invoice.number}} for {{company.name}}"
  }
}
```

#### Simple Template Variables Guide

**Common Variables You Can Use:**
- `{{company.name}}` - Your company name
- `{{company.address}}` - Company address
- `{{date}}` - Current date
- `{{user.name}}` - Current user name
- `{{transaction.amount}}` - Transaction amount
- `{{transaction.description}}` - Transaction description

### Step 4: Test Your Template

1. **Use the Data JSON field** on the right side to provide sample data:
```json
{
  "company": {"name": "My Company"},
  "invoice": {"number": "INV-001", "date": "2024-01-15", "amount": "1000.00"}
}
```
2. **Enable "Auto preview"** to see live updates
3. **Click "Preview"** to generate a PDF
4. **Click "Download"** to save the PDF locally

### Step 5: Save and Generate Documents

1. **Click "Save"** to save your template changes
2. **Click "Generate Document"** to create a document from the template
3. The generated document will be automatically saved to your document library

---

## Using the Document Management Page

### Accessing Document Management

Navigate to **Documents → Document Management** or use the direct link in your application.

### Understanding the Interface

The Document Management page has several sections:

1. **Organization/Project Selector** - Choose your organization and optionally filter by project
2. **Search Bar** - Search documents by title, content, or tags
3. **Filter Controls** - Filter by document status (draft, approved, etc.)
4. **Action Buttons** - Create, upload, and export documents
5. **Document Grid/List** - View your documents

### Current Limitations and Workarounds

#### ⚠️ "New Document" Button Shows "Not Yet Implemented"
**Workaround Options:**
1. **Use Template Generation**: Go to Document Templates → Select template → Generate Document
2. **Upload from Transaction**: Go to a transaction → Documents section → Upload & Link
3. **Direct Upload**: Use the transaction attachment method (see section 5)

#### ✅ Document Upload Now Available in Transactions
**Primary Method:**
1. **From Transactions**: Navigate to any transaction → Click Details → Documents section → "Upload & Link"
2. **From Projects**: If document relates to a project, use project attachments (if available)

#### ⚠️ "Export Documents" Button Shows "Not Yet Implemented"
**Workaround Options:**
1. **Individual Download**: Click on each document to download individually
2. **Use Browser Tools**: Right-click on document links and "Save As"

### Working Features

#### ✅ Search and Filter
- **Text Search**: Works on document titles and content
- **Status Filters**: Use the filter button to filter by draft, submitted, approved, rejected, archived
- **Project Filter**: Select a project to see only related documents
- **Date Sorting**: Documents are sorted by update date

#### ✅ Document Viewing
- Click on any document card to view details
- View document status, creation date, file size
- See document versions and history

---

## Attaching Documents to Transactions

✅ **FUNCTIONALITY RESTORED**: The document attachment functionality has been successfully integrated into the transaction details panel.

### Method 1: Upload and Link from Transaction ✅ Now Available

**STATUS**: ✅ **WORKING** - The documents section has been added to the `UnifiedTransactionDetailsPanel` component.

**How to access**:
1. **Navigate to any transaction** (Transactions → Click "تفاصيل" (Details) button on any transaction row)
2. **Scroll to Documents section** (titled "المستندات المرفقة" - Documents)
3. **Click "Upload & Link"** button to upload and attach files
4. **File uploads and automatically links** to the transaction

### Method 2: Link Existing Document

1. **From the transaction's Documents section**
2. **Click "Link existing"** button  
3. **Select from Document Picker Dialog**
4. **Choose one or more documents** to link
5. **Click to confirm** linking

### Method 3: Generate from Template

1. **From the transaction's Documents section**
2. **Click "Generate from Template"** (requires `templates.generate` permission)
3. **Select a template** from the list
4. **Provide data** for template variables
5. **Generate and link** the document automatically

### Managing Attached Documents

#### View Attached Documents
- Documents appear in the transaction's Documents section
- Shows document title, status, and last updated date
- Count appears in parentheses: "Documents (3)"

#### Unlink Documents
- **Individual**: Click "Unlink" next to each document
- **Bulk**: Click "Select" → Check documents → "Unlink Selected"

#### Document Status Tracking
Documents show their approval status:
- **Draft**: Initial upload
- **Submitted**: Ready for review
- **Approved**: Approved for use
- **Rejected**: Needs revision
- **Archived**: Historical record

---

## Troubleshooting Common Issues

### "Not Yet Implemented" Messages

**Root Cause**: The UI handlers in `DocumentManagementPage.tsx` show placeholder messages for some actions.

**Solutions by Feature:**

#### New Document Creation
```
Error: "New document creation not yet implemented"
Workaround: Use template generation or upload from transactions
```

#### Document Upload  
```
Error: "Document upload not yet implemented"
Workaround: Go to Transactions → Select transaction → Upload & Link
```

#### Export Documents
```
Error: "Document export not yet implemented"  
Workaround: Download documents individually by clicking each document
```

### Permission Issues

#### Template Management
```
Error: "You need templates.manage permission"
Solution: Contact admin to grant templates.manage role
```

#### Document Access
```
Error: Permission denied or features disabled
Solution: Check with admin for documents.create and documents.read permissions
```

### Button Not Working

#### Check Browser Console
1. Press F12 → Console tab
2. Look for error messages when clicking buttons
3. Common issues: Network errors, permission errors, missing organization selection

#### Refresh and Retry
1. Refresh the page (F5)
2. Clear browser cache (Ctrl+F5)
3. Ensure organization is selected
4. Try the workaround methods listed above

---

## Step-by-Step Workflows

### Workflow 1: Create Template and Generate Document

**Prerequisites**: `templates.manage` permission

1. **Navigate**: Main Data → Document Templates
2. **Select Organization**: Choose from dropdown
3. **Create Template**: 
   - Click "Create"
   - Enter template name: "My Invoice Template"
   - Click "Create"
4. **Edit Template**:
   - Click "Edit" on your new template
   - Modify the Template JSON with your variables
   - Use the Data JSON to test with sample data
   - Enable "Auto preview" to see results
5. **Save Template**: Click "Save"
6. **Generate Document**: 
   - Click "Generate Document"
   - Document appears in document library
   - Can be linked to transactions

### Workflow 2: Upload Document to Transaction ✅ Now Working

**Prerequisites**: Access to transactions, `documents.create` permission

1. **Navigate**: Transactions → Select specific transaction → Click "تفاصيل" (Details)
2. **Find Documents Section**: Scroll down to "المستندات المرفقة" (Documents)
3. **Upload File**:
   - Click "Upload & Link"
   - Select file from computer
   - File uploads and links automatically
4. **Verify**: Document appears in list with status "draft"
5. **Optional**: Change status, add more documents, or unlink

### Workflow 3: Link Existing Document to Transaction

**Prerequisites**: Existing documents in library

1. **From Transaction**: Navigate to transaction → Documents section
2. **Link Existing**: Click "Link existing"
3. **Document Picker**: 
   - Browse available documents
   - Use search if many documents
   - Select one or multiple documents
4. **Confirm**: Click to link selected documents
5. **Verify**: Documents appear in transaction's document list

### Workflow 4: Search and Find Documents

**Prerequisites**: `documents.read` permission

1. **Navigate**: Documents → Document Management
2. **Set Context**:
   - Select organization
   - Optionally select project
3. **Search Options**:
   - Enter text in search box (searches titles and content)
   - Use filter button for status-based filtering
   - Combine search + filters for precise results
4. **View Results**: Click on document cards to see details

### Workflow 5: Bulk Unlink Documents from Transaction

**Prerequisites**: Transaction with multiple linked documents

1. **Navigate**: Go to transaction with linked documents
2. **Enter Select Mode**: Click "Select" button
3. **Choose Documents**:
   - Check individual documents, or
   - Click "Select All" for all documents
4. **Unlink**: Click "Unlink Selected"
5. **Confirm**: Documents are unlinked from transaction
6. **Exit Select Mode**: Click "Cancel Select"

---

## Database Schema Information (SQL Queries)

Use these SQL queries to understand your document management database structure:

### Get Document Management Schema

```sql
-- Get documents table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'documents' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
```

### Verify Documents Schema
```sql
-- Verify the query worked
SELECT COUNT(*) as document_columns_count 
FROM information_schema.columns 
WHERE table_name = 'documents' 
  AND table_schema = 'public';
```

### Get Document Templates Schema

```sql
-- Get document_templates table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'document_templates' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
```

### Verify Templates Schema
```sql
-- Verify the query worked
SELECT COUNT(*) as template_columns_count 
FROM information_schema.columns 
WHERE table_name = 'document_templates' 
  AND table_schema = 'public';
```

### Get Document Relationships Schema

```sql
-- Get document_relationships table structure (for linking to transactions)
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'document_relationships' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
```

### Verify Relationships Schema
```sql
-- Verify the query worked
SELECT COUNT(*) as relationship_columns_count 
FROM information_schema.columns 
WHERE table_name = 'document_relationships' 
  AND table_schema = 'public';
```

### Get Your Current Documents

```sql
-- See your current documents
SELECT 
  id,
  title,
  status,
  created_at,
  updated_at,
  org_id
FROM documents 
ORDER BY updated_at DESC 
LIMIT 10;
```

### Verify Documents Query
```sql
-- Count your documents
SELECT COUNT(*) as total_documents 
FROM documents;
```

---

## Best Practices and Tips

### Template Creation Tips

1. **Naming Convention**: Use clear, descriptive names
   - ✅ "Invoice Template - Standard"
   - ✅ "Contract Template - Service Agreement" 
   - ❌ "Template1", "New Template"

2. **Variable Consistency**: Use consistent variable naming
   - Use `{{company.name}}` not `{{companyName}}`
   - Use `{{transaction.amount}}` not `{{amount}}`

3. **Test Thoroughly**: Always test templates with real data before using in production

### Document Organization Tips

1. **Use Projects**: Link documents to projects when applicable
2. **Meaningful Titles**: Use descriptive document titles
3. **Status Management**: Keep document status updated (draft → submitted → approved)
4. **Version Control**: The system handles versioning automatically

### Security Best Practices

1. **Permission Management**: Only grant necessary permissions
2. **Organization Isolation**: Documents are isolated by organization
3. **Audit Trail**: All document actions are logged

### Performance Tips

1. **Search Efficiently**: Use specific search terms rather than broad searches
2. **Filter First**: Apply filters before searching large document sets
3. **Regular Cleanup**: Archive old documents to improve performance

### Workaround Strategies

Since some features show "not yet implemented":

1. **Primary Path**: Use transaction-based document management as your main workflow
2. **Template Generation**: Use templates for document creation rather than direct upload
3. **Individual Downloads**: Download documents one by one rather than bulk export
4. **Browser Tools**: Use browser's "Save As" for document downloads

---

## Quick Reference

### Essential Navigation
- **Templates**: Main Data → Document Templates
- **Documents**: Documents → Document Management  
- **Transaction Docs**: Transactions → [Select] → Documents section

### Key Permissions Needed
- `templates.manage` - Template creation/editing
- `templates.generate` - Generate documents from templates
- `documents.create` - Upload documents
- `documents.read` - View documents

### Working Features ✅
- Template creation and editing
- Search and filtering in Document Management
- PDF generation from templates
- Document versioning
- Document services (backend functionality)

### Features Now Integrated ✅
- Document upload via transactions (✅ Now working)
- Document linking to transactions (✅ Now working)
- Generate documents from templates (✅ Now working)

### Current Status ✅
- **New Document**: Use template generation
- **Upload to Transactions**: ✅ Now available via transaction details
- **Export from Document Management**: Download individually (still needs implementation)
- **Transaction Attachments**: ✅ Now fully functional

### Emergency Contacts
- **Permission Issues**: Contact system administrator
- **Technical Problems**: Include browser console errors when reporting
- **Data Issues**: Use SQL queries provided to verify database state

## Technical Solution for Document Attachment Integration

### Root Cause Analysis

The transaction document attachment functionality exists but is not currently accessible because:

1. **Current Interface**: Transactions use `UnifiedTransactionDetailsPanel` component (line 1733 in `Transactions.tsx`)
2. **Missing Integration**: This component doesn't include the `AttachDocumentsPanel` component
3. **Existing Functionality**: The `AttachDocumentsPanel` component exists and works correctly
4. **Old Implementation**: The functionality exists in the unused `TransactionView` component

### Implementation Steps

To restore document attachment functionality to transactions:

#### Step 1: Add Documents Section to UnifiedTransactionDetailsPanel

Add this section to the `UnifiedTransactionDetailsPanel.tsx` file around line 945 (after the audit sections):

```tsx
{/* Documents Section - restored functionality */}
{isSectionVisible('documents') && (
  <div className="details-section">
    <div className="section-header">
      <h4 className="section-title">المستندات المرفقة</h4>
    </div>
    <div className="section-content documents-section">
      <WithPermission permission="documents.view">
        <AttachDocumentsPanel 
          orgId={transaction.org_id || ''}
          transactionId={transaction.id}
          projectId={transaction.project_id || undefined}
        />
      </WithPermission>
    </div>
  </div>
)}
```

#### Step 2: Import Required Components

Add these imports to the top of `UnifiedTransactionDetailsPanel.tsx`:

```tsx
import AttachDocumentsPanel from '../documents/AttachDocumentsPanel';
import { WithPermission } from '../Common/withPermission';
```

#### Step 3: Add Documents to Default Sections

In the `DEFAULT_DETAIL_SECTIONS` array, add:

```tsx
{
  id: 'documents',
  title: 'المستندات المرفقة',
  icon: '📎',
  description: 'المستندات والملفات المرتبطة بهذه المعاملة'
}
```

### Alternative: Quick Switch to Working Version

As a temporary solution, you can switch back to the old working component by editing `Transactions.tsx` line 1733:

**Change from:**
```tsx
<UnifiedTransactionDetailsPanel
```

**Change to:**
```tsx
<TransactionView
  transaction={detailsFor}
  audit={audit}
  userNames={userNames}
  onClose={() => setDetailsOpen(false)}
  categoryLabel={/* ... existing category label logic ... */}
  approvalHistory={approvalHistory}
/>
```

And update the import:
```tsx
import TransactionView from './TransactionView';
```

### Testing After Implementation

1. Navigate to any transaction
2. Click "تفاصيل" (Details) button  
3. Verify "Documents" section appears
4. Test "Upload & Link" functionality
5. Test "Link existing" functionality
6. Test "Generate from Template" functionality

---

*This guide covers the current state of your document management system. As features are implemented, this guide will be updated accordingly.*
